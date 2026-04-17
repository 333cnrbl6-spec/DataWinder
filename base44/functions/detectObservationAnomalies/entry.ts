import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { species_id } = await req.json();
    
    if (!species_id) {
      return Response.json({ error: 'species_id required' }, { status: 400 });
    }

    // Fetch species with observations
    const species = await base44.entities.Species.list();
    const targetSpecies = species.find(s => s.id === species_id);

    if (!targetSpecies) {
      return Response.json({ error: 'Species not found' }, { status: 404 });
    }

    // Compile observations from multiple sources
    const observations = [
      ...(targetSpecies.observations || []),
      ...(targetSpecies.gbif_occurrences || []),
      ...(targetSpecies.specieslink_occurrences || [])
    ];

    if (observations.length < 5) {
      return Response.json({
        success: true,
        species_name: targetSpecies.scientific_name,
        observation_count: observations.length,
        anomalies: [],
        message: 'Insufficient observations for anomaly detection'
      });
    }

    // Prepare observations data for analysis
    const obsData = observations.map(obs => ({
      lat: obs.latitude || obs.lat,
      lon: obs.longitude || obs.lon,
      date: obs.eventDate || obs.event_date || obs.date,
      source: obs.source || 'unknown',
      elevation: obs.elevation || 'unknown',
      habitat: obs.habitat || 'unknown'
    })).filter(o => o.lat && o.lon);

    // Use AI for anomaly detection
    const anomalyAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze these ${obsData.length} species observations for anomalies:
${JSON.stringify(obsData.slice(0, 100), null, 2)}

Identify: geographic outliers (outside expected range), temporal anomalies (unexpected dates), habitat mismatches, and data quality issues.
Return JSON with: anomalies (array of {type, severity (low/medium/high), observation_index, description, recommended_action}).`,
      response_json_schema: {
        type: 'object',
        properties: {
          anomalies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                severity: { type: 'string' },
                observation_index: { type: 'number' },
                description: { type: 'string' },
                recommended_action: { type: 'string' }
              }
            }
          },
          data_quality_score: { type: 'number' },
          summary: { type: 'string' }
        }
      }
    });

    // Calculate statistics
    const severityCounts = {
      high: 0,
      medium: 0,
      low: 0
    };

    (anomalyAnalysis.anomalies || []).forEach(anom => {
      if (severityCounts[anom.severity] !== undefined) {
        severityCounts[anom.severity]++;
      }
    });

    return Response.json({
      success: true,
      species_name: targetSpecies.scientific_name,
      observation_count: obsData.length,
      anomalies: anomalyAnalysis.anomalies || [],
      severity_breakdown: severityCounts,
      data_quality_score: anomalyAnalysis.data_quality_score || 0,
      summary: anomalyAnalysis.summary,
      analysis_date: new Date().toISOString()
    });

  } catch (error) {
    console.error('Anomaly detection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});