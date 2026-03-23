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
      // CSV / TSV / TXT — normalise line endings
      const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalised.split('\n').filter(l => l.trim());

      if (lines.length < 1) {
        return Response.json({ error: 'The file is empty — no lines found.' }, { status: 400 });
      }
      if (lines.length < 2) {
        return Response.json({ error: 'The file only has a header row and no data rows. Please check the file content.' }, { status: 400 });
      }

      // Auto-detect delimiter: tab > comma > semicolon
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
      const headers = rawHeaders.map(h => h.replace(/^"|"$/g, '').trim()).filter(Boolean);

      if (headers.length === 0) {
        return Response.json({ error: 'Could not detect column headers in the file. Ensure the first row contains column names.' }, { status: 400 });
      }

      for (let i = 1; i < lines.length; i++) {
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
      prompt: `You are a data mapping expert. Map source CSV columns to target database fields.
Source columns: ${JSON.stringify(sourceKeys)}
Sample row: ${sampleRow}
Target entity: ${suggested_entity}
Target fields: ${JSON.stringify(targetFields)}
Rules:
- latitude/lat/decimalLatitude/Latitude → latitude (but this is not a target field for Species, skip)
- longitude/lon/lng/decimalLongitude/Longitude → longitude (same, skip if not in target)
- species/taxon/scientificName/scientific_name/Species → scientific_name
- commonName/common_name/vernacularName/English → common_name
- iucnCategory/category/redlistCategory/iucnRedListCategory → iucn_status
- Only map fields that clearly correspond. Return null for target fields with no clear match.
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
      // Fallback: if scientific_name still missing, try common column names directly
      if (suggested_entity === 'Species' && !mapped.scientific_name) {
        mapped.scientific_name =
          row['scientific_name'] || row['scientificName'] || row['taxon'] ||
          row['species'] || row['Species'] || row['Taxon'] || null;
      }
      return mapped;
    }).filter(r => {
      if (suggested_entity === 'Species') return !!r.scientific_name;
      return Object.keys(r).length > 0;
    });

    console.log(`Field mapping complete: ${mappedRecords.length} of ${records.length} records mapped successfully`);

    if (mappedRecords.length === 0) {
      return Response.json({
        error: `Field mapping produced 0 records. For Species, a "scientific_name" column (or equivalent like "species", "taxon", "scientificName") is required. Detected columns: ${sourceKeys.slice(0, 10).join(', ')}`,
      }, { status: 400 });
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