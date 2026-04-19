import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

/**
 * UNIVERSAL FILE CLASSIFICATION SERVICE
 * 
 * Uses Claude Opus 4.6 to analyze uploaded files and automatically:
 * - Classify file type and content
 * - Determine appropriate entity destination
 * - Extract key fields and structure
 * - Suggest data transformations
 * 
 * Supports: PDF, CSV, XLSX, JSON, TXT, GeoJSON
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, file_name, file_type } = await req.json();

    if (!file_url || !file_name) {
      return Response.json({ error: 'Missing file_url or file_name' }, { status: 400 });
    }

    const ext = file_name.split('.').pop().toLowerCase();

    // Fetch file content (for text-based formats)
    let fileContent = null;
    let fileSize = 0;

    try {
      const fileResponse = await fetch(file_url);
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file: ${fileResponse.status}`);
      }

      const fileBuffer = await fileResponse.arrayBuffer();
      fileSize = fileBuffer.byteLength;

      // Only read content for text-based formats
      if (['csv', 'json', 'txt', 'geojson'].includes(ext)) {
        fileContent = new TextDecoder().decode(fileBuffer).slice(0, 50000); // First 50KB for analysis
      }
    } catch (fetchError) {
      console.warn('Could not fetch file content:', fetchError.message);
    }

    // Build classification prompt for Claude Opus 4.6
    const classificationPrompt = `You are an expert data classification system for biodiversity and conservation research.

Analyse this uploaded file and provide structured classification:

**File Information:**
- Name: ${file_name}
- Extension: ${ext}
- Size: ${fileSize} bytes
- Type: ${file_type || 'unknown'}

**Content Sample:**
${fileContent ? `--- BEGIN CONTENT (first 50KB) ---
${fileContent.slice(0, 5000)}
--- END CONTENT ---` : '(Binary file - content not readable)'}

**Available Entity Destinations:**
1. **Species** - Taxonomic records with fields: scientific_name, common_name, iucn_status, population_trend, gbif_id, inat_taxon_id, observation_count
2. **OccurrenceNote** - Individual occurrence records with fields: species_id, latitude, longitude, source, occurrence_date, validation_status, note_text
3. **ClimateDataset** - Climate data layers with fields: name, source, variable_category, scenario, time_period, resolution
4. **Literature** - Research papers with fields: title, authors, year, journal, doi, file_url, methods_summary, key_results
5. **ValidationRule** - Data validation rules with fields: name, rule_type, constraint_type, parameters, severity
6. **ThreatAssessment** - Conservation threat data with fields: species_id, assessment_date, habitat_loss_percent, threat_score, threat_category
7. **SDMRun** - Species distribution model runs with fields: name, species_ids, status, parameters, metrics
8. **MaxentRun** - MAXENT model configurations with fields: name, species_id, climate_dataset_ids, parameters, status

**Your Task:**
1. Identify what type of data this file contains
2. Recommend the BEST entity destination
3. Provide confidence score (0.0 - 1.0)
4. List key fields/columns detected
5. Suggest any required transformations
6. Flag any compliance concerns (endangered species data, location protection, etc.)

Return ONLY valid JSON with this exact structure:
{
  "file_type": "csv|json|pdf|excel|text|geospatial|unknown",
  "content_type": "species_data|occurrence_data|climate_data|literature|validation_rules|threat_assessment|model_results|mixed|unknown",
  "recommended_entity": "Species|OccurrenceNote|ClimateDataset|Literature|ValidationRule|ThreatAssessment|SDMRun|MaxentRun",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification decision",
  "detected_fields": ["field1", "field2", "field3"],
  "record_count_estimate": 0,
  "requires_transformation": true/false,
  "transformation_notes": "What transformations are needed",
  "compliance_flags": ["flag1", "flag2"],
  "warnings": ["warning1", "warning2"]
}`;

    // Use Claude Opus 4.6 for high-accuracy classification
    const classification = await base44.integrations.Core.InvokeLLM({
      model: 'claude_opus_4_6',
      prompt: classificationPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          file_type: { type: 'string' },
          content_type: { type: 'string' },
          recommended_entity: { type: 'string' },
          confidence: { type: 'number' },
          reasoning: { type: 'string' },
          detected_fields: { 
            type: 'array', 
            items: { type: 'string' } 
          },
          record_count_estimate: { type: 'number' },
          requires_transformation: { type: 'boolean' },
          transformation_notes: { type: 'string' },
          compliance_flags: { 
            type: 'array', 
            items: { type: 'string' } 
          },
          warnings: { 
            type: 'array', 
            items: { type: 'string' } 
          }
        },
        required: [
          'file_type',
          'content_type',
          'recommended_entity',
          'confidence',
          'reasoning',
          'detected_fields'
        ]
      }
    });

    // Log classification for audit trail
    await base44.entities.ImportLog.create({
      user_email: user.email,
      user_name: user.full_name || 'Unknown',
      entity_type: 'FileClassification',
      file_name: file_name,
      record_count: classification.record_count_estimate || 0,
      record_ids: [],
      status: 'completed',
      notes: `Classified as ${classification.content_type} → ${classification.recommended_entity} (confidence: ${classification.confidence})`
    }).catch(err => console.warn('Could not log classification:', err));

    return Response.json({
      status: 'success',
      classification,
      file_info: {
        name: file_name,
        url: file_url,
        extension: ext,
        size: fileSize
      }
    });

  } catch (error) {
    console.error('Universal file classification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});