/**
 * generateDataWinderReport
 * Builds a rich visual data report from DataWinder's own database:
 * species records, occurrences, IUCN data, GBIF, iNaturalist, outlier stats, images.
 * Used to produce the "What DataWinder Found" companion output alongside the academic paper.
 * ADMIN ONLY.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const { genus } = await req.json();
    if (!genus) return Response.json({ error: 'genus required' }, { status: 400 });

    console.log(`=== DataWinder Report: ${genus} ===`);

    // Fetch species matching this genus from the database
    const allSpecies = await base44.asServiceRole.entities.Species.filter({ genus });
    console.log(`Found ${allSpecies.length} species in DB for genus ${genus}`);

    // Also try a name-prefix match if genus field isn't set
    let species = allSpecies;
    if (!species.length) {
      const all = await base44.asServiceRole.entities.Species.list('-updated_date', 200);
      species = all.filter(s => s.scientific_name?.toLowerCase().startsWith(genus.toLowerCase()));
      console.log(`Fallback name-match: ${species.length} species`);
    }

    // Pull related IUCN assessments for these species
    const speciesIds = species.map(s => s.id);

    // Build occurrence summary per species
    const occurrencesBySpecies = species.map(s => ({
      name: s.scientific_name,
      common_name: s.common_name || '',
      iucn_status: s.iucn_status || 'DD',
      population_trend: s.population_trend || 'unknown',
      gbif_count: s.gbif_occurrence_count || 0,
      inat_count: s.observation_count || 0,
      specieslink_count: s.specieslink_occurrence_count || 0,
      total: (s.gbif_occurrence_count || 0) + (s.observation_count || 0) + (s.specieslink_occurrence_count || 0),
      image_url: s.image_url || null,
      all_images: s.all_images_urls || [],
      last_observed: s.last_observed || s.gbif_last_occurrence || null,
    }));

    // Aggregate location points (from gbif_occurrences + observations)
    const locationPoints = [];
    for (const s of species) {
      const gbifPts = (s.gbif_occurrences || []).slice(0, 30).filter(o => o.decimalLatitude && o.decimalLongitude).map(o => ({
        lat: o.decimalLatitude,
        lng: o.decimalLongitude,
        source: 'GBIF',
        species: s.scientific_name,
        date: o.eventDate || null,
        basis: o.basisOfRecord || null,
      }));
      const inatPts = (s.observations || []).slice(0, 30).filter(o => o.location).map(o => {
        const [lat, lng] = (o.location || '').split(',').map(Number);
        return { lat, lng, source: 'iNaturalist', species: s.scientific_name, date: o.observed_on || null };
      }).filter(p => p.lat && p.lng);
      const slPts = (s.specieslink_occurrences || []).slice(0, 20).filter(o => o.latitude && o.longitude).map(o => ({
        lat: Number(o.latitude), lng: Number(o.longitude), source: 'speciesLink', species: s.scientific_name, date: o.yearcollected || null,
      })).filter(p => p.lat && p.lng);
      locationPoints.push(...gbifPts, ...inatPts, ...slPts);
    }

    // IUCN status distribution
    const statusDist = {};
    const trendDist = {};
    for (const s of occurrencesBySpecies) {
      statusDist[s.iucn_status] = (statusDist[s.iucn_status] || 0) + 1;
      trendDist[s.population_trend] = (trendDist[s.population_trend] || 0) + 1;
    }

    // Source breakdown totals
    const sourceTotals = {
      GBIF: occurrencesBySpecies.reduce((a, s) => a + s.gbif_count, 0),
      iNaturalist: occurrencesBySpecies.reduce((a, s) => a + s.inat_count, 0),
      speciesLink: occurrencesBySpecies.reduce((a, s) => a + s.specieslink_count, 0),
    };

    // Outlier detection proxy: species with very low record counts vs genus average
    const avgTotal = occurrencesBySpecies.reduce((a, s) => a + s.total, 0) / (occurrencesBySpecies.length || 1);
    const outlierFlags = occurrencesBySpecies.map(s => ({
      name: s.name,
      total: s.total,
      flagged: s.total < avgTotal * 0.1 && avgTotal > 10,
      z_proxy: avgTotal > 0 ? ((s.total - avgTotal) / (avgTotal * 0.5)).toFixed(2) : 0
    }));

    // GBIF basis-of-record breakdown (from first species that has it)
    let basisBreakdown = {};
    for (const s of species) {
      if (s.gbif_basis_of_record && Object.keys(s.gbif_basis_of_record).length) {
        for (const [k, v] of Object.entries(s.gbif_basis_of_record)) {
          basisBreakdown[k] = (basisBreakdown[k] || 0) + v;
        }
      }
    }

    // Data completeness matrix
    const completenessMatrix = occurrencesBySpecies.map(s => ({
      name: s.name,
      has_gbif: s.gbif_count > 0,
      has_inat: s.inat_count > 0,
      has_specieslink: s.specieslink_count > 0,
      has_image: !!s.image_url,
      has_iucn: !!s.iucn_status && s.iucn_status !== 'DD',
      score: [s.gbif_count > 0, s.inat_count > 0, s.specieslink_count > 0, !!s.image_url, !!s.iucn_status].filter(Boolean).length
    }));

    console.log(`Report built: ${occurrencesBySpecies.length} species, ${locationPoints.length} location points`);

    return Response.json({
      genus,
      generated_at: new Date().toISOString(),
      species_count: species.length,
      species: occurrencesBySpecies,
      location_points: locationPoints,
      iucn_status_distribution: statusDist,
      population_trend_distribution: trendDist,
      source_totals: sourceTotals,
      outlier_flags: outlierFlags,
      basis_of_record: basisBreakdown,
      completeness_matrix: completenessMatrix,
      avg_records_per_species: Math.round(avgTotal),
    });

  } catch (err) {
    console.error('DataWinder report error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});