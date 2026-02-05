import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all species from database
    const allSpecies = await base44.entities.Species.list('-created_date', 10000);

    if (allSpecies.length === 0) {
      return Response.json({ message: 'No species found', groups: [] });
    }

    // Prepare species summary for LLM analysis
    const speciesSummary = allSpecies.map(sp => ({
      id: sp.id,
      scientific_name: sp.scientific_name,
      common_name: sp.common_name,
      family: sp.family,
      genus: sp.genus,
      iucn_status: sp.iucn_status,
      kingdom: sp.kingdom,
      phylum: sp.phylum,
      class_name: sp.class_name,
      order_name: sp.order_name
    }));

    // Call LLM to identify duplicates
    const analysisPrompt = `You are an expert taxonomist. Analyze the following ${allSpecies.length} species records and identify potential duplicates or records that likely refer to the same species.

Species to analyze:
${JSON.stringify(speciesSummary, null, 2)}

For each group of potential duplicates found, provide:
1. Which species IDs are duplicates
2. Why they are likely duplicates (taxonomic reasoning)
3. Confidence score (0-100)
4. Which one should be the canonical/master record
5. Field recommendations for merge (which record has the best data for each field)

Return ONLY valid JSON with this structure:
{
  "duplicate_groups": [
    {
      "species_ids": ["id1", "id2"],
      "reason": "explanation",
      "confidence": 85,
      "suggested_canonical_id": "id1",
      "merge_recommendations": {
        "scientific_name": "id1",
        "common_name": "id2",
        "iucn_status": "id1"
      }
    }
  ]
}`;

    const analysisResult = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          duplicate_groups: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                species_ids: { type: 'array', items: { type: 'string' } },
                reason: { type: 'string' },
                confidence: { type: 'number' },
                suggested_canonical_id: { type: 'string' },
                merge_recommendations: { type: 'object' }
              }
            }
          }
        }
      }
    });

    const duplicateGroups = analysisResult.duplicate_groups || [];

    // Create PendingSpeciesReview records
    const reviewRecords = duplicateGroups.map((group, index) => {
      const groupData = group.species_ids.map(id => 
        allSpecies.find(sp => sp.id === id)
      ).filter(Boolean);

      return {
        review_group_id: `review-${Date.now()}-${index}`,
        duplicate_species_ids: group.species_ids,
        duplicate_species_data: groupData,
        ai_analysis: {
          reason: group.reason,
          confidence: group.confidence,
          suggested_canonical_id: group.suggested_canonical_id,
          merge_recommendations: group.merge_recommendations
        },
        status: 'pending'
      };
    });

    // Save review records
    if (reviewRecords.length > 0) {
      await base44.entities.PendingSpeciesReview.bulkCreate(reviewRecords);
    }

    return Response.json({
      status: 'success',
      message: `Found ${duplicateGroups.length} potential duplicate groups`,
      groups_count: duplicateGroups.length,
      total_species: allSpecies.length
    });
  } catch (error) {
    console.error('Taxonomy check error:', error);
    return Response.json({ 
      error: error.message || 'Failed to run taxonomy check',
      status: 'error'
    }, { status: 500 });
  }
});