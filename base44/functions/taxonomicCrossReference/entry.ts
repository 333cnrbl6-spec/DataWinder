import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, species_ids, data_env } = await req.json();

    // Fetch all species from database
    const allSpecies = await base44.asServiceRole.entities.Species.list('-created_date', 10000);

    if (action === 'analyze') {
      // Limit to first 1000 species for LLM safety
      const speciesForAnalysis = allSpecies.slice(0, 1000);
      if (allSpecies.length > 1000) {
        return Response.json({
          status: 'warning',
          message: `Database contains ${allSpecies.length} species. Analyzing first 1000 for performance.`,
          analyzed_count: 1000,
          total_count: allSpecies.length
        }, { status: 206 });
      }
      
      // Use AI to analyze and cross-reference species data
      const analysisPrompt = `You are a taxonomic expert with access to authoritative databases. Analyze this species dataset and:

1. Duplicate entries (same species with different IDs) based on scientific names, common names, and taxonomy
2. Taxonomic inconsistencies (same species name but different family/order/class)
3. Potential merge candidates (similar but not identical names that might refer to the same species)
4. **CRITICAL**: Cross-reference each family's species count against established taxonomic databases (Catalogue of Life, GBIF, IUCN Red List, Mammal Species of the World)
5. Flag any family with significantly more species than expected in authoritative sources
6. **Specifically for Callitrichidae**: This family has approximately 42-60 recognized species globally (marmosets and tamarins). If you find significantly more, these are likely duplicates or misclassifications.

Species dataset:
${JSON.stringify(speciesForAnalysis.map(sp => ({
  id: sp.id,
  scientific_name: sp.scientific_name,
  common_name: sp.common_name,
  kingdom: sp.kingdom,
  phylum: sp.phylum,
  class: sp.class_name,
  order: sp.order_name,
  family: sp.family,
  genus: sp.genus,
  data_source: sp.data_source,
  iucn_id: sp.iucn_id,
  inat_taxon_id: sp.inat_taxon_id,
  gbif_id: sp.gbif_id
})), null, 2)}

Use your internet access to verify species counts and taxonomic classifications against current databases.

Return your analysis as a JSON object with this structure:
{
  "duplicates": [
    {
      "scientific_name": "species name",
      "record_ids": ["id1", "id2"],
      "reason": "why these are duplicates",
      "recommended_primary": "id to keep",
      "confidence": "high/medium/low"
    }
  ],
  "inconsistencies": [
    {
      "scientific_name": "species name",
      "issue": "description of inconsistency",
      "affected_records": ["id1", "id2"]
    }
  ],
  "merge_candidates": [
    {
      "names": ["name1", "name2"],
      "record_ids": ["id1", "id2"],
      "reason": "why they might be the same",
      "confidence": "high/medium/low"
    }
  ],
  "family_anomalies": [
    {
      "family": "family name",
      "species_in_database": number,
      "expected_global_count": "range or number from authoritative sources",
      "deviation": "description of the issue",
      "likely_cause": "duplicates/misclassification/incomplete data",
      "affected_species": ["scientific names"]
    }
  ],
  "statistics": {
    "total_species": number,
    "potential_duplicates": number,
    "taxonomic_issues": number,
    "families_analyzed": number
  }
}`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: "object",
          properties: {
            duplicates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  scientific_name: { type: "string" },
                  record_ids: { type: "array", items: { type: "string" } },
                  reason: { type: "string" },
                  recommended_primary: { type: "string" },
                  confidence: { type: "string" }
                }
              }
            },
            inconsistencies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  scientific_name: { type: "string" },
                  issue: { type: "string" },
                  affected_records: { type: "array", items: { type: "string" } }
                }
              }
            },
            merge_candidates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  names: { type: "array", items: { type: "string" } },
                  record_ids: { type: "array", items: { type: "string" } },
                  reason: { type: "string" },
                  confidence: { type: "string" }
                }
              }
            },
            family_anomalies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  family: { type: "string" },
                  species_in_database: { type: "number" },
                  expected_global_count: { type: "string" },
                  deviation: { type: "string" },
                  likely_cause: { type: "string" },
                  affected_species: { type: "array", items: { type: "string" } }
                }
              }
            },
            statistics: {
              type: "object",
              properties: {
                total_species: { type: "number" },
                potential_duplicates: { type: "number" },
                taxonomic_issues: { type: "number" },
                families_analyzed: { type: "number" }
              }
            }
          }
        }
      });

      return Response.json({
        status: 'success',
        analysis: result
      });
    }

    if (action === 'merge') {
      // Merge selected species records
      const mergeResults = [];
      
      for (const group of species_ids) {
        const primaryId = group.primary_id;
        const duplicateIds = group.duplicate_ids;

        // Fetch all records
        const primary = allSpecies.find(sp => sp.id === primaryId);
        const duplicates = allSpecies.filter(sp => duplicateIds.includes(sp.id));

        if (!primary || duplicates.length === 0) {
          continue;
        }

        // Use AI to intelligently merge data
        const mergePrompt = `You are merging duplicate species records. Given the primary record and duplicate records, create a merged record that:
1. Keeps all unique data from all sources
2. Prioritizes IUCN data for conservation status
3. Combines observation data from iNaturalist and GBIF
4. Preserves all geographic distribution data
5. Maintains data provenance (which fields came from which source)

Primary record:
${JSON.stringify(primary, null, 2)}

Duplicate records:
${JSON.stringify(duplicates, null, 2)}

Return a merged species record with the same schema. Include all non-null fields from all records, preferring more complete/recent data.`;

        const mergedData = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: mergePrompt,
          response_json_schema: {
            type: "object",
            properties: {
              scientific_name: { type: "string" },
              common_name: { type: "string" },
              kingdom: { type: "string" },
              phylum: { type: "string" },
              class_name: { type: "string" },
              order_name: { type: "string" },
              family: { type: "string" },
              genus: { type: "string" },
              iucn_status: { type: "string" },
              population_trend: { type: "string" },
              habitat: { type: "string" },
              threats: { type: "string" },
              conservation_actions: { type: "string" }
            }
          }
        });

        // Update primary record with merged data
        await base44.asServiceRole.entities.Species.update(primaryId, mergedData);

        // Delete duplicates
        for (const dupId of duplicateIds) {
          await base44.asServiceRole.entities.Species.delete(dupId);
        }

        mergeResults.push({
          scientific_name: primary.scientific_name,
          merged_into: primaryId,
          deleted: duplicateIds
        });
      }

      return Response.json({
        status: 'success',
        merged: mergeResults
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});