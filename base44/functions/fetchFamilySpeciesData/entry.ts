/**
 * fetchFamilySpeciesData — Fetch all species in a family from IUCN and enrich with GBIF/iNat
 * Called when user selects a family in the map filter
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function fetchIUCNFamilySpecies(familyName, iucnToken) {
  const url = `https://api.iucnredlist.org/api/v4/taxa/family/${encodeURIComponent(familyName)}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${iucnToken}`, Accept: 'application/json' }
  });
  if (!r.ok) throw new Error(`IUCN API error: ${r.status}`);
  const data = await r.json();
  return (data.assessments || []).map(a => ({
    scientific_name: a.taxon_scientific_name,
    common_name: a.common_name || '',
    iucn_status: a.red_list_category_code,
    population_trend: a.population_trend?.description || 'unknown',
    iucn_id: a.sis_taxon_id,
    family: familyName
  }));
}

async function enrichWithGBIF(species) {
  const enriched = [];
  for (const sp of species) {
    try {
      const match = await fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(sp.scientific_name)}`);
      if (match.ok) {
        const m = await match.json();
        if (m.usageKey) {
          const occ = await fetch(`https://api.gbif.org/v1/occurrence/search?taxonKey=${m.usageKey}&limit=50&hasCoordinate=true`);
          if (occ.ok) {
            const o = await occ.json();
            enriched.push({
              ...sp,
              gbif_key: m.usageKey,
              observations: (o.results || []).map(r => ({
                latitude: r.decimalLatitude,
                longitude: r.decimalLongitude,
                location: `${r.stateProvince || ''}, ${r.country || ''}`.trim(),
                source: 'GBIF',
                data_source: 'GBIF'
              }))
            });
            continue;
          }
        }
      }
      enriched.push({ ...sp, observations: [] });
    } catch (e) {
      enriched.push({ ...sp, observations: [] });
    }
  }
  return enriched;
}

async function enrichWithiNaturalist(species) {
  for (const sp of species) {
    try {
      const search = await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sp.scientific_name)}&per_page=1`);
      if (search.ok) {
        const s = await search.json();
        const taxon = s.results?.[0];
        if (taxon) {
          const obs = await fetch(`https://api.inaturalist.org/v1/observations?taxon_id=${taxon.id}&per_page=50&quality_grade=research&has[]=geo`);
          if (obs.ok) {
            const o = await obs.json();
            sp.observations = (sp.observations || []).concat(
              (o.results || []).map(r => ({
                latitude: r.geom.coordinates[1],
                longitude: r.geom.coordinates[0],
                location: r.place_town_name || r.place_county || r.place_state || '',
                source: 'iNaturalist',
                data_source: 'iNaturalist',
                observed_on: r.observed_on
              }))
            );
          }
        }
      }
    } catch (e) {
      // continue
    }
  }
  return species;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { family } = await req.json();
    if (!family) {
      return Response.json({ error: 'Missing family parameter' }, { status: 400 });
    }

    const iucnToken = Deno.env.get('IUCN_API_KEY');
    console.log(`Fetching all species in family: ${family}`);

    // Get all species from IUCN
    const species = await fetchIUCNFamilySpecies(family, iucnToken);
    console.log(`Found ${species.length} species in ${family}`);

    // Enrich with GBIF
    const withGBIF = await enrichWithGBIF(species);
    console.log(`Enriched ${withGBIF.filter(s => s.observations.length > 0).length} species with GBIF data`);

    // Enrich with iNaturalist
    const withBoth = await enrichWithiNaturalist(withGBIF);
    console.log(`Final dataset: ${withBoth.length} species, ${withBoth.reduce((sum, s) => sum + (s.observations?.length || 0), 0)} observations`);

    return Response.json({
      status: 'success',
      family,
      species_count: withBoth.length,
      observation_count: withBoth.reduce((sum, s) => sum + (s.observations?.length || 0), 0),
      species: withBoth
    });
  } catch (error) {
    console.error('Family fetch error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});