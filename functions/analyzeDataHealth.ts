import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all species — fetch only lightweight scalar fields to avoid loading
    // large observation/occurrence arrays (performance + CPU limit risk)
    const allSpeciesRaw = await base44.entities.Species.list('-created_date', 10000);
    const allSpecies = allSpeciesRaw.map(sp => ({
      id: sp.id,
      scientific_name: sp.scientific_name,
      common_name: sp.common_name,
      family: sp.family,
      iucn_status: sp.iucn_status,
      population_trend: sp.population_trend,
      inat_taxon_id: sp.inat_taxon_id,
      gbif_id: sp.gbif_id,
      observation_count: sp.observation_count,
      gbif_occurrence_count: sp.gbif_occurrence_count,
      specieslink_occurrence_count: sp.specieslink_occurrence_count,
    }));

    // Group by family
    const familyGroups = {};
    allSpecies.forEach(sp => {
      const family = sp.family || 'Unknown';
      if (!familyGroups[family]) familyGroups[family] = [];
      familyGroups[family].push(sp);
    });

    // Calculate statistics per family
    const familyStats = Object.entries(familyGroups)
      .map(([family, species]) => {
        const uniqueScientificNames = new Set(species.map(s => s.scientific_name)).size;
        const recordCount = species.length;
        const duplicationRatio = recordCount / Math.max(uniqueScientificNames, 1);
        return {
          family,
          recordCount,
          uniqueSpecies: uniqueScientificNames,
          duplicationRatio: parseFloat(duplicationRatio.toFixed(2)),
          species
        };
      })
      .sort((a, b) => b.duplicationRatio - a.duplicationRatio);

    // Identify duplicates within each family
    const duplicatesByFamily = {};
    familyStats.forEach(({ family, species }) => {
      const sciNameGroups = {};
      species.forEach(sp => {
        const key = (sp.scientific_name || '').toLowerCase().trim();
        if (!sciNameGroups[key]) sciNameGroups[key] = [];
        sciNameGroups[key].push(sp);
      });

      const potentialDuplicates = Object.entries(sciNameGroups)
        .filter(([_, records]) => records.length > 1)
        .map(([sciName, records]) => ({
          scientific_name: sciName,
          recordCount: records.length,
          records
        }));

      if (potentialDuplicates.length > 0) duplicatesByFamily[family] = potentialDuplicates;
    });

    return Response.json({
      status: 'success',
      totalSpecies: allSpecies.length,
      totalFamilies: Object.keys(familyGroups).length,
      familyStats,
      duplicatesByFamily
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});