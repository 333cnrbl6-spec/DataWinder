import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as turf from 'npm:@turf/turf@6.5.0';

/**
 * Backend Range Overlay Extraction
 * 
 * Computes overlapping regions between multiple species ranges.
 * Payload:
 *   {
 *     "species_ids": ["id1", "id2", ...],  // Species to compare
 *     "min_overlap_area": 100              // Optional: filter by min area (km²)
 *   }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { species_ids = [], min_overlap_area = 0 } = body;

    if (!species_ids || species_ids.length < 2) {
      return Response.json({
        error: 'At least 2 species required for overlay analysis'
      }, { status: 400 });
    }

    console.log(`[extractRangeOverlays] Processing ${species_ids.length} species for ${user.email}`);

    // Fetch species with their range data
    const species = await Promise.all(
      species_ids.map(id => base44.asServiceRole.entities.Species.list())
        .then(allSpecies => 
          allSpecies.filter(sp => species_ids.includes(sp.id))
        )
    );

    if (species.length < 2) {
      return Response.json({
        error: `Only found ${species.length} of ${species_ids.length} species`
      }, { status: 404 });
    }

    // Fetch range data for selected species
    const rangeData = await base44.asServiceRole.entities.IUCNRangeData.list('-created_date', 10000);
    const rangeBySpeciesId = new Map(
      rangeData.map(r => [r.species_id, r.range_data_geojson])
    );

    // Enrich species with range geometries
    const enrichedSpecies = species
      .filter(sp => rangeBySpeciesId.has(sp.id))
      .map(sp => ({
        ...sp,
        geometry: rangeBySpeciesId.get(sp.id)
      }));

    if (enrichedSpecies.length < 2) {
      return Response.json({
        error: 'At least 2 species must have range data'
      }, { status: 400 });
    }

    console.log(`[extractRangeOverlays] Found ${enrichedSpecies.length} species with range data`);

    // Calculate overlaps between all pairs
    const overlaps = [];

    for (let i = 0; i < enrichedSpecies.length; i++) {
      for (let j = i + 1; j < enrichedSpecies.length; j++) {
        const sp1 = enrichedSpecies[i];
        const sp2 = enrichedSpecies[j];

        try {
          // Extract geometry from species
          const geom1 = sp1.geometry.type === 'FeatureCollection'
            ? sp1.geometry.features[0]?.geometry
            : sp1.geometry.geometry;

          const geom2 = sp2.geometry.type === 'FeatureCollection'
            ? sp2.geometry.features[0]?.geometry
            : sp2.geometry.geometry;

          if (geom1 && geom2) {
            const feature1 = turf.feature(geom1);
            const feature2 = turf.feature(geom2);

            // Calculate intersection
            const intersection = turf.intersect(
              turf.featureCollection([feature1, feature2])
            );

            if (intersection) {
              const area = turf.area(intersection) / 1000000; // Convert to km²
              
              if (area >= min_overlap_area) {
                overlaps.push({
                  type: 'Feature',
                  properties: {
                    species_1: sp1.scientific_name,
                    species_2: sp2.scientific_name,
                    common_name_1: sp1.common_name,
                    common_name_2: sp2.common_name,
                    status_1: sp1.iucn_status,
                    status_2: sp2.iucn_status,
                    overlap_area_km2: Math.round(area * 100) / 100,
                    analysis_type: 'range_overlap'
                  },
                  geometry: intersection.geometry
                });

                console.log(`✓ ${sp1.scientific_name} ⊗ ${sp2.scientific_name}: ${Math.round(area)} km²`);
              }
            }
          }
        } catch (err) {
          console.warn(`Overlay failed for ${sp1.scientific_name} × ${sp2.scientific_name}:`, err.message);
        }
      }
    }

    const result = {
      type: 'FeatureCollection',
      features: overlaps
    };

    console.log(`[extractRangeOverlays] Found ${overlaps.length} overlapping regions`);

    return Response.json({
      status: 'success',
      species_count: enrichedSpecies.length,
      overlap_count: overlaps.length,
      result,
      message: `Found ${overlaps.length} overlapping regions among ${enrichedSpecies.length} species`
    });

  } catch (error) {
    console.error('[extractRangeOverlays] Error:', error.message);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});