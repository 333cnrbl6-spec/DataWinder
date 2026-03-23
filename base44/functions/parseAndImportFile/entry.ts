import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, original_name, suggested_entity } = await req.json();
    if (!file_url) return Response.json({ error: 'Missing file_url' }, { status: 400 });

    // Fetch the file content directly — bypass ExtractDataFromUploadedFile
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) throw new Error(`Failed to fetch file: ${fileResponse.status}`);

    const text = await fileResponse.text();
    const ext = (original_name || '').split('.').pop().toLowerCase();

    let records = [];

    if (ext === 'json' || ext === 'geojson') {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        records = parsed;
      } else if (parsed.features) {
        // GeoJSON FeatureCollection
        records = parsed.features.map(f => ({ ...f.properties, geometry: f.geometry }));
      } else {
        records = [parsed];
      }
    } else {
      // CSV / TSV / TXT — parse it
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) throw new Error('File appears to be empty or has no data rows');

      // Auto-detect delimiter
      const firstLine = lines[0];
      const delimiter = firstLine.includes('\t') ? '\t' : ',';

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

      const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0 || (values.length === 1 && !values[0])) continue;
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = (values[idx] || '').replace(/^"|"$/g, '').trim();
        });
        records.push(row);
      }
    }

    // Use LLM to map fields to the target entity schema
    const entitySchemas = {
      Species: ['scientific_name', 'common_name', 'iucn_status', 'population_trend', 'kingdom', 'phylum', 'class_name', 'order_name', 'family', 'genus', 'observation_count'],
      ClimateDataset: ['name', 'source', 'variable_category', 'scenario', 'time_period', 'resolution', 'description'],
      SpeciesList: ['name', 'description'],
      SavedSearch: ['name', 'taxonomy_level', 'search_term'],
    };

    const targetFields = entitySchemas[suggested_entity] || entitySchemas['Species'];
    const sampleRow = records[0] ? JSON.stringify(records[0]) : '{}';
    const sourceKeys = records[0] ? Object.keys(records[0]) : [];

    // Map source columns to target fields
    const mappingResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a data mapping expert. Map the source CSV columns to the target database fields.
Source columns: ${JSON.stringify(sourceKeys)}
Sample row: ${sampleRow}
Target entity: ${suggested_entity}
Target fields: ${JSON.stringify(targetFields)}
Rules:
- latitude/lat/decimalLatitude → latitude
- longitude/lon/lng/decimalLongitude → longitude
- species/taxon/scientificName/scientific_name → scientific_name
- commonName/common_name/vernacularName → common_name
- iucnCategory/category/redlistCategory → iucn_status
- Only map fields that clearly correspond. Use null for unmapped target fields.
Return ONLY a JSON object like {"target_field": "source_column_or_null", ...} with no extra text.`,
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
      // Always fallback: if scientific_name still missing, try common column names
      if (suggested_entity === 'Species' && !mapped.scientific_name) {
        mapped.scientific_name = row['scientific_name'] || row['scientificName'] || row['taxon'] || row['species'] || null;
      }
      return mapped;
    }).filter(r => {
      if (suggested_entity === 'Species') return !!r.scientific_name;
      return Object.keys(r).length > 0;
    });

    return Response.json({
      status: 'success',
      records: mappedRecords,
      total_raw: records.length,
      total_mapped: mappedRecords.length,
      detected_columns: sourceKeys,
    });

  } catch (error) {
    console.error('parseAndImportFile error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});