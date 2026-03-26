import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Retry fetch with exponential backoff — uploaded files can take time to be accessible
async function fetchWithRetry(url, retries = 5, initialDelayMs = 1000) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status} fetching file`);
      // Don't retry on 400-level errors (not found, forbidden) — only on 5xx or network issues
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`File not accessible (HTTP ${res.status}). The upload URL may have expired — please try uploading the file again.`);
      }
    } catch (e) {
      if (e.message.includes('not accessible')) throw e;
      lastError = e;
    }
    if (i < retries) {
      const delay = initialDelayMs * Math.pow(2, i); // exponential backoff: 1s, 2s, 4s, 8s, 16s
      console.log(`Fetch attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(`Failed to fetch file after ${retries + 1} attempts: ${lastError?.message || 'unknown error'}. Please try again.`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, original_name, suggested_entity } = await req.json();
    if (!file_url) return Response.json({ error: 'Missing file_url' }, { status: 400 });
    if (!original_name) return Response.json({ error: 'Missing original_name' }, { status: 400 });

    const ext = original_name.split('.').pop().toLowerCase();

    // Excel files are binary — we can't parse them as text
    if (ext === 'xlsx' || ext === 'xls') {
      return Response.json({
        error: 'Excel files (.xlsx/.xls) cannot be imported directly. Please open in Excel and save as CSV (File → Save As → CSV UTF-8), then re-upload.',
      }, { status: 400 });
    }

    // Supported formats check
    const supportedExts = ['csv', 'json', 'geojson', 'txt', 'tsv'];
    if (!supportedExts.includes(ext)) {
      return Response.json({
        error: `Unsupported file format ".${ext}". Supported formats: CSV, JSON, GeoJSON, TXT, TSV.`,
      }, { status: 400 });
    }

    // Fetch the file content with robust retry + backoff
    console.log(`Fetching file: ${file_url}`);
    const fileResponse = await fetchWithRetry(file_url);
    const text = await fileResponse.text();

    if (!text || !text.trim()) {
      return Response.json({ error: 'The uploaded file appears to be empty. Please check the file and try again.' }, { status: 400 });
    }

    let records = [];

    if (ext === 'json' || ext === 'geojson') {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        return Response.json({ error: `Invalid JSON file: ${e.message}` }, { status: 400 });
      }
      if (Array.isArray(parsed)) {
        records = parsed;
      } else if (parsed.features && Array.isArray(parsed.features)) {
        records = parsed.features.map(f => ({ ...f.properties, geometry: f.geometry }));
      } else if (typeof parsed === 'object') {
        records = [parsed];
      }
    } else {
      // CSV / TSV / TXT — strip BOM, normalise line endings, strip non-printable chars
      const cleaned = text
        .replace(/^\uFEFF/, '')           // UTF-8 BOM
        .replace(/^\uFFFE/, '')           // UTF-16 BOM
        .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, ''); // non-printable (keep tab, newlines, printable)
      const normalised = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalised.split('\n').filter(l => l.trim());

      if (lines.length < 1) {
        return Response.json({ error: 'The file is empty — no lines found.' }, { status: 400 });
      }
      if (lines.length < 2) {
        return Response.json({ error: 'The file only has a header row and no data rows. Please check the file content.' }, { status: 400 });
      }

      // Skip IUCN-style metadata preamble lines (e.g. "GENERAL:", "Date generated:", "Search URL:")
      // These appear before the real CSV header in IUCN bulk download files
      // The real header is the first line that contains a comma or tab and doesn't end with ":"
      // Strategy: skip lines that look like "KEY: value" metadata (colon at end of first token, no comma/tab separation into many fields)
      let headerLineIndex = 0;
      for (let i = 0; i < Math.min(lines.length, 30); i++) {
        const l = lines[i];
        // A metadata line typically looks like "GENERAL:" or "Date generated:,2024-01-01" (only 1-2 fields)
        // A real header has many comma/tab-separated fields OR contains known field names
        const tabCount = (l.match(/\t/g) || []).length;
        const commaCount = (l.match(/,/g) || []).length;
        const fieldCount = Math.max(tabCount, commaCount) + 1;
        // If the line has 3+ fields, treat it as the header
        if (fieldCount >= 3) {
          headerLineIndex = i;
          break;
        }
        // Also accept if it clearly looks like a header with known field names
        const lLower = l.toLowerCase();
        if (lLower.includes('scientificname') || lLower.includes('scientific_name') ||
            lLower.includes('speciesname') || lLower.includes('redlistcategory') ||
            lLower.includes('taxonid') || lLower.includes('kingdom')) {
          headerLineIndex = i;
          break;
        }
        console.log(`Skipping preamble line ${i}: ${l.slice(0, 100)}`);
        headerLineIndex = i + 1;
      }
      console.log(`Using line ${headerLineIndex} as header row`);

      // Auto-detect delimiter: tab > pipe > semicolon > comma
      const firstLine = lines[headerLineIndex] || lines[0];
      let delimiter = ',';
      if (firstLine.includes('\t')) delimiter = '\t';
      else if (firstLine.includes('|') && firstLine.split('|').length > 2) delimiter = '|';
      else if (firstLine.split(';').length > firstLine.split(',').length) delimiter = ';';
      console.log(`Detected delimiter: "${delimiter === '\t' ? 'TAB' : delimiter}" | First line: ${firstLine.slice(0, 200)}`);

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

      const rawHeaders = parseCSVLine(lines[headerLineIndex]);
      // Strip quotes, BOM remnants, invisible chars, trailing whitespace
      const headers = rawHeaders
        .map(h => h.replace(/^["'\u200B\uFEFF]+|["'\u200B\uFEFF]+$/g, '').trim())
        .filter(Boolean);
      console.log(`Detected headers (${headers.length}): ${JSON.stringify(headers.slice(0, 20))}`);

      if (headers.length === 0) {
        return Response.json({ error: 'Could not detect column headers in the file. Ensure the first row contains column names.' }, { status: 400 });
      }

      for (let i = headerLineIndex + 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0 || (values.length === 1 && !values[0])) continue;
        const row = {};
        headers.forEach((h, idx) => {
          if (h) row[h] = (values[idx] || '').replace(/^"|"$/g, '').trim();
        });
        records.push(row);
      }
    }

    if (records.length === 0) {
      return Response.json({ error: 'No data records could be extracted from this file. The file may be malformed or contain only headers.' }, { status: 400 });
    }

    console.log(`Parsed ${records.length} raw records from ${original_name}`);

    const entitySchemas = {
      Species: ['scientific_name', 'common_name', 'iucn_status', 'population_trend', 'observation_count', 'inat_taxon_id', 'gbif_id'],
      ClimateDataset: ['name', 'source', 'variable_category', 'scenario', 'time_period', 'resolution', 'description'],
      SpeciesList: ['name', 'description'],
      SavedSearch: ['name', 'taxonomy_level', 'search_term'],
      MaxentRun: ['name', 'species_name', 'status', 'notes'],
    };

    const targetFields = entitySchemas[suggested_entity] || entitySchemas['Species'];
    const sourceKeys = Object.keys(records[0] || {});
    console.log(`Source columns (${sourceKeys.length}): ${JSON.stringify(sourceKeys.slice(0, 20))}`);

    if (sourceKeys.length === 0) {
      return Response.json({ error: 'Records have no fields. File may be malformed.' }, { status: 400 });
    }

    // Truncate sample row values so we don't blow the LLM context
    const sampleRow = JSON.stringify(
      Object.fromEntries(Object.entries(records[0]).map(([k, v]) => [k, String(v).slice(0, 100)]))
    );

    // Map source columns to target fields via LLM
    console.log(`Running LLM field mapping for entity: ${suggested_entity}`);
    const mappingResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a data mapping expert. Map source CSV columns to target database fields for biodiversity data.
Source columns: ${JSON.stringify(sourceKeys)}
Sample row: ${sampleRow}
Target entity: ${suggested_entity}
Target fields: ${JSON.stringify(targetFields)}
Rules:
- species/taxon/scientificName/scientific_name/Species/Taxon/name/latin_name/binomial/verbatimScientificName/acceptedName/canonicalName/taxon_name → scientific_name
- commonName/common_name/vernacularName/English/vernacular/commonname/english_name → common_name
- iucnCategory/category/redlistCategory/iucnRedListCategory/status/threatCategory/iucn_category → iucn_status
- populationTrend/trend/population_trend → population_trend
- observationCount/obs_count/observation_count/observations → observation_count
- taxonKey/gbif_id/gbifId/usageKey → gbif_id
- taxonId/inat_taxon_id/inatTaxonId → inat_taxon_id
- Only map fields that clearly correspond to a target field. Return null for target fields with no clear match.
Return ONLY a valid JSON object like {"target_field": "source_column_or_null"} with no extra text, no markdown.`,
      response_json_schema: {
        type: 'object',
        additionalProperties: { type: ['string', 'null'] }
      }
    });

    // Apply mapping to all records
    const mappedRecords = records.map(row => {
      const mapped = {};
      for (const [targetField, sourceCol] of Object.entries(mappingResult || {})) {
        if (sourceCol && row[sourceCol] !== undefined && row[sourceCol] !== '') {
          mapped[targetField] = row[sourceCol];
        }
      }
      // Fallback: if scientific_name still missing, do case-insensitive key search
      if (suggested_entity === 'Species' && !mapped.scientific_name) {
        const sciNameAliases = [
          'scientific_name', 'scientificname', 'taxon', 'species', 'taxonname',
          'name', 'latin_name', 'latinname', 'binomial', 'full_name',
          'verbatimscientificname', 'accepted_name', 'acceptedname',
          'canonicalname', 'canonical_name', 'taxon_name'
        ];
        const rowLower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().replace(/\s+/g, '_'), { key: k, val: v }]));
        for (const alias of sciNameAliases) {
          if (rowLower[alias]?.val) {
            mapped.scientific_name = rowLower[alias].val;
            break;
          }
        }
      }
      return mapped;
    }).filter(r => {
      if (suggested_entity === 'Species') return !!r.scientific_name;
      return Object.keys(r).length > 0;
    });

    console.log(`Field mapping complete: ${mappedRecords.length} of ${records.length} records mapped successfully`);

    if (mappedRecords.length === 0) {
      const colSample = sourceKeys.slice(0, 15).join(', ');
      const hint = suggested_entity === 'Species'
        ? `For Species, a scientific name column is required. Accepted names: scientific_name, scientificName, species, taxon, name, binomial, latin_name, canonicalName, acceptedName, verbatimScientificName. Detected columns: ${colSample}`
        : `No mappable fields found. Detected columns: ${colSample}`;
      return Response.json({ error: hint }, { status: 400 });
    }

    return Response.json({
      status: 'success',
      records: mappedRecords,
      total_raw: records.length,
      total_mapped: mappedRecords.length,
      detected_columns: sourceKeys,
    });

  } catch (error) {
    console.error('parseAndImportFile error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});