import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allSpecies = await base44.asServiceRole.entities.Species.list('-created_date', 10000);
    
    // Group by scientific name
    const grouped = {};
    allSpecies.forEach(sp => {
      if (!grouped[sp.scientific_name]) {
        grouped[sp.scientific_name] = [];
      }
      grouped[sp.scientific_name].push(sp);
    });

    // Find duplicates
    const mergeCandidates = Object.entries(grouped)
      .filter(([name, species]) => species.length > 1)
      .map(([scientificName, species]) => {
        // Calculate merge score based on data completeness
        const dataScores = species.map(sp => {
          let score = 0;
          if (sp.common_name) score += 1;
          if (sp.iucn_status && sp.iucn_status !== 'NE') score += 2;
          if (sp.inat_taxon_id) score += 1.5;
          if (sp.gbif_id) score += 1.5;
          if (sp.range_data_geojson) score += 2;
          if (sp.observations && sp.observations.length > 0) score += 1;
          if (sp.gbif_occurrences && sp.gbif_occurrences.length > 0) score += 1;
          if (sp.habitat) score += 1;
          if (sp.image_url) score += 0.5;
          return { id: sp.id, score, data: sp };
        });

        // Find master record (highest score)
        dataScores.sort((a, b) => b.score - a.score);
        const masterData = dataScores[0].data;
        const duplicateIds = dataScores.slice(1).map(d => d.id);

        return {
          scientificName,
          masterRecordId: masterData.id,
          masterRecord: masterData,
          duplicateRecords: dataScores.slice(1).map(d => d.data),
          duplicateIds,
          recordCount: species.length,
          dataGaps: identifyDataGaps(species)
        };
      });

    return Response.json({
      status: 'success',
      mergeCandidates,
      totalDuplicates: mergeCandidates.length,
      totalRecordsToMerge: mergeCandidates.reduce((sum, m) => sum + m.duplicateIds.length, 0)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  });

  function identifyDataGaps(species) {
  const gaps = [];

  // Check for missing common names
  const withCommonName = species.filter(s => s.common_name);
  if (withCommonName.length > 0 && withCommonName.length < species.length) {
   gaps.push({
     field: 'common_name',
     available: withCommonName.length,
     missing: species.length - withCommonName.length
   });
  }

  // Check for missing IUCN status
  const withIUCN = species.filter(s => s.iucn_status && s.iucn_status !== 'NE');
  if (withIUCN.length > 0 && withIUCN.length < species.length) {
   gaps.push({
     field: 'iucn_status',
     available: withIUCN.length,
     missing: species.length - withIUCN.length
   });
  }

  // Check for missing iNaturalist data
  const withINat = species.filter(s => s.inat_taxon_id);
  if (withINat.length > 0 && withINat.length < species.length) {
   gaps.push({
     field: 'iNaturalist',
     available: withINat.length,
     missing: species.length - withINat.length
   });
  }

  // Check for missing GBIF data
  const withGBIF = species.filter(s => s.gbif_id);
  if (withGBIF.length > 0 && withGBIF.length < species.length) {
   gaps.push({
     field: 'GBIF',
     available: withGBIF.length,
     missing: species.length - withGBIF.length
   });
  }

  return gaps;
  }

function identifyDataGaps(species) {
  const gaps = [];
  
  // Check for missing common names
  const withCommonName = species.filter(s => s.common_name);
  if (withCommonName.length > 0 && withCommonName.length < species.length) {
    gaps.push({
      field: 'common_name',
      available: withCommonName.length,
      missing: species.length - withCommonName.length
    });
  }

  // Check for missing IUCN status
  const withIUCN = species.filter(s => s.iucn_status && s.iucn_status !== 'NE');
  if (withIUCN.length > 0 && withIUCN.length < species.length) {
    gaps.push({
      field: 'iucn_status',
      available: withIUCN.length,
      missing: species.length - withIUCN.length
    });
  }

  // Check for missing iNaturalist data
  const withINat = species.filter(s => s.inat_taxon_id);
  if (withINat.length > 0 && withINat.length < species.length) {
    gaps.push({
      field: 'iNaturalist',
      available: withINat.length,
      missing: species.length - withINat.length
    });
  }

  // Check for missing GBIF data
  const withGBIF = species.filter(s => s.gbif_id);
  if (withGBIF.length > 0 && withGBIF.length < species.length) {
    gaps.push({
      field: 'GBIF',
      available: withGBIF.length,
      missing: species.length - withGBIF.length
    });
  }

  return gaps;
}