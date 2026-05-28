import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Parse a CSV string into an array of row objects
function parseCSV(text) {
  const cleaned = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const lines = cleaned.split('\n').filter(l => l.trim());
  if (lines.length < 2) return { error: 'File must have a header row and at least one data row.' };

  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.split(';').length > firstLine.split(',').length) delimiter = ';';

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(h => h.replace(/^["'\uFEFF]+|["']+$/g, '').trim()).filter(Boolean);

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (!vals.some(v => v.trim())) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] || '').replace(/^"|"$/g, '').trim(); });
    records.push(row);
  }

  return { headers, records };
}

// Find the scientific name column from headers
function findNameColumn(headers) {
  const aliases = [
    'scientific_name', 'scientificname', 'taxon', 'species', 'taxon_name',
    'latin_name', 'binomial', 'name', 'canonical_name', 'canonicalname',
    'accepted_name', 'acceptedname', 'verbatimscientificname', 'species_name'
  ];
  for (const alias of aliases) {
    const match = headers.find(h => h.toLowerCase().replace(/\s+/g, '_') === alias);
    if (match) return match;
  }
  return null;
}

// Validate a batch of names against IUCN taxonomy via the LLM
async function validateNamesWithLLM(base44, names) {
  const prompt = `You are a taxonomy validation expert with knowledge of the IUCN Red List taxonomy.
  
For each species name in the list below, determine:
1. Whether it is a valid accepted scientific name (binomial nomenclature)
2. The IUCN Red List category if known (LC, NT, VU, EN, CR, EW, EX, DD, NE, or "Unknown")
3. If the name is a synonym, provide the accepted name
4. A brief validation note

Species names to validate:
${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Return a JSON array with one object per name in order:
[
  {
    "input_name": "original name from list",
    "status": "matched" | "synonym" | "invalid" | "uncertain",
    "accepted_name": "accepted scientific name or null",
    "iucn_category": "LC|NT|VU|EN|CR|EW|EX|DD|NE|Unknown",
    "note": "brief explanation"
  }
]

Return ONLY the JSON array, no markdown or extra text.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              input_name: { type: 'string' },
              status: { type: 'string' },
              accepted_name: { type: ['string', 'null'] },
              iucn_category: { type: 'string' },
              note: { type: 'string' }
            }
          }
        }
      }
    }
  });

  // Handle both array and wrapped object response
  if (Array.isArray(result)) return result;
  if (result?.results) return result.results;

  // Fallback: try parsing as raw text
  return names.map(n => ({
    input_name: n,
    status: 'uncertain',
    accepted_name: n,
    iucn_category: 'Unknown',
    note: 'Could not validate — manual review required'
  }));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, original_name, list_name } = await req.json();
    if (!file_url) return Response.json({ error: 'Missing file_url' }, { status: 400 });

    const ext = (original_name || '').split('.').pop().toLowerCase();
    if (!['csv', 'txt', 'tsv'].includes(ext)) {
      return Response.json({ error: 'Only CSV, TSV, or TXT files are supported for bulk species upload.' }, { status: 400 });
    }

    console.log(`Fetching file: ${file_url}`);
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) return Response.json({ error: `Could not fetch file (HTTP ${fileRes.status})` }, { status: 400 });

    const text = await fileRes.text();
    const parsed = parseCSV(text);
    if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });

    const { headers, records } = parsed;
    console.log(`Parsed ${records.length} records, headers: ${headers.join(', ')}`);

    const nameCol = findNameColumn(headers);
    const hasCommonName = headers.find(h => ['common_name', 'commonname', 'vernacularname', 'english_name', 'common name'].includes(h.toLowerCase()));

    if (!nameCol) {
      return Response.json({
        error: `Could not find a scientific name column. Detected columns: ${headers.join(', ')}. Please ensure your CSV has a column named: scientific_name, species, taxon, binomial, or similar.`
      }, { status: 400 });
    }

    const names = records
      .map(r => r[nameCol])
      .filter(n => n && n.trim().length > 1);

    if (names.length === 0) {
      return Response.json({ error: 'No species names found in the file.' }, { status: 400 });
    }

    console.log(`Validating ${names.length} species names against IUCN taxonomy`);

    // Process in batches of 25 to avoid LLM token limits
    const BATCH_SIZE = 25;
    const validationResults = [];
    for (let i = 0; i < names.length; i += BATCH_SIZE) {
      const batch = names.slice(i, i + BATCH_SIZE);
      console.log(`Validating batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} names`);
      const batchResults = await validateNamesWithLLM(base44, batch);
      validationResults.push(...batchResults);
    }

    // Merge validation results with original rows
    const enrichedResults = validationResults.map((v, idx) => {
      const originalRow = records[idx] || {};
      return {
        ...v,
        common_name: hasCommonName ? (originalRow[hasCommonName] || '') : '',
        row_index: idx + 1,
      };
    });

    // Summary stats
    const matched = enrichedResults.filter(r => r.status === 'matched');
    const synonyms = enrichedResults.filter(r => r.status === 'synonym');
    const invalid = enrichedResults.filter(r => r.status === 'invalid');
    const uncertain = enrichedResults.filter(r => r.status === 'uncertain');

    console.log(`Validation complete: ${matched.length} matched, ${synonyms.length} synonyms, ${invalid.length} invalid, ${uncertain.length} uncertain`);

    return Response.json({
      status: 'success',
      list_name: list_name || original_name?.replace(/\.[^.]+$/, '') || 'Uploaded List',
      total: names.length,
      summary: {
        matched: matched.length,
        synonyms: synonyms.length,
        invalid: invalid.length,
        uncertain: uncertain.length,
        needs_review: synonyms.length + invalid.length + uncertain.length,
      },
      results: enrichedResults,
      headers,
      name_column: nameCol,
    });

  } catch (error) {
    console.error('validateSpeciesListUpload error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});