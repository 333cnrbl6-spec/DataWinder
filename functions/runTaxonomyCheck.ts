import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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
    const analysisPrompt = `You are an expert taxonomist specializing in primate taxonomy, particularly Callitrichidae. Deeply analyze each of these ${allSpecies.length} species records for potential duplicates, taxonomic conflicts, and data inconsistencies.

For each species, examine:
- Scientific name validity against accepted taxonomy (WoRMS, ITIS, IOC World Bird List for comparative standards)
- Taxonomic hierarchy consistency (kingdom→phylum→class→order→family→genus→species)
- Common name variations that might indicate duplicates
- Geographic distribution conflicts
- IUCN status history for inconsistencies

Species data to analyze:
${JSON.stringify(speciesSummary, null, 2)}

Provide detailed taxonomic reasoning referencing:
1. Current accepted taxonomic standards
2. Known synonymies in Callitrichidae
3. Taxonomic revisions or subspecies issues
4. Data quality issues within each record

Return ONLY valid JSON:
{
  "duplicate_groups": [
    {
      "species_ids": ["id1", "id2"],
      "reason": "detailed taxonomic explanation with reference to standards",
      "confidence": 85,
      "suggested_canonical_id": "id1",
      "taxonomic_issues": ["issue1", "issue2"],
      "merge_recommendations": {
        "scientific_name": "id1",
        "common_name": "id2",
        "family": "id1"
      }
    }
  ],
  "data_quality_issues": [
    {
      "species_id": "id",
      "issues": ["missing_genus", "inconsistent_order"],
      "recommendations": ["add_genus", "verify_against_WoRMS"]
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
                taxonomic_issues: { type: 'array', items: { type: 'string' } },
                merge_recommendations: { type: 'object' }
              }
            }
          },
          data_quality_issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                species_id: { type: 'string' },
                issues: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array', items: { type: 'string' } }
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

    // Clear old pending review records before saving new ones
    const oldReviews = await base44.asServiceRole.entities.PendingSpeciesReview.filter({ status: 'pending' });
    for (const r of oldReviews) {
      await base44.asServiceRole.entities.PendingSpeciesReview.delete(r.id);
    }

    // Save review records
    if (reviewRecords.length > 0) {
      await base44.asServiceRole.entities.PendingSpeciesReview.bulkCreate(reviewRecords);
    }

    return Response.json({
      status: 'success',
      message: `Found ${duplicateGroups.length} potential duplicate groups`,
      duplicatesFound: duplicateGroups.length,
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