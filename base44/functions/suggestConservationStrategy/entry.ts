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

    // Fetch species and threat data
    const species = await base44.entities.Species.list();
    const threats = await base44.entities.ThreatAssessment.list();
    const sdmRuns = await base44.entities.SDMRun.list();

    const targetSpecies = species.find(s => s.id === species_id);
    const threatData = threats.find(t => t.species_id === species_id);
    const relatedSDM = sdmRuns.filter(s => s.species_ids?.includes(species_id));

    if (!targetSpecies) {
      return Response.json({ error: 'Species not found' }, { status: 404 });
    }

    // Build context for AI
    const contextString = `
Species: ${targetSpecies.scientific_name} (${targetSpecies.common_name})
IUCN Status: ${targetSpecies.iucn_status}
Population Trend: ${targetSpecies.population_trend}
${threatData ? `Threat Score: ${threatData.threat_score}/100` : ''}
${threatData ? `Threat Category: ${threatData.threat_category}` : ''}
${threatData ? `Habitat Loss: ${threatData.habitat_loss_percent}%` : ''}
${threatData ? `Protected Area Coverage: ${threatData.protected_area_coverage}%` : ''}
${relatedSDM.length > 0 ? `Suitable Climate Area Change (2050): ${relatedSDM[0].parameters?.climate_scenario || 'unknown'}` : ''}
    `;

    // Use InvokeLLM to generate conservation strategies
    const strategies = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on this species data, develop 5 specific, actionable conservation strategies:
${contextString}

For each strategy, provide: title, description, priority (critical/high/medium), estimated_impact (1-10), timeline (months), required_resources, and success_metrics.
Return as JSON with strategies array.`,
      response_json_schema: {
        type: 'object',
        properties: {
          strategies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'string' },
                estimated_impact: { type: 'number' },
                timeline: { type: 'number' },
                required_resources: { type: 'string' },
                success_metrics: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          overall_recommendation: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      species_name: targetSpecies.scientific_name,
      iucn_status: targetSpecies.iucn_status,
      strategies: strategies.strategies || [],
      overall_recommendation: strategies.overall_recommendation,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Strategy generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});