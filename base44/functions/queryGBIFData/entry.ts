import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { species_name, limit = 100 } = await req.json();

    if (!species_name) {
      return Response.json({ error: 'Species name required' }, { status: 400 });
    }

    // Search for species in GBIF
    const searchRes = await fetch(
      `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(species_name)}&limit=5`
    );
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return Response.json({
        success: false,
        message: 'Species not found in GBIF',
        data: null,
      });
    }

    const species = searchData.results[0];
    const gbifKey = species.key;

    // Fetch occurrence records for this species
    const occurrenceRes = await fetch(
      `https://api.gbif.org/v1/occurrence/search?taxonKey=${gbifKey}&limit=${limit}`
    );
    const occurrenceData = await occurrenceRes.json();

    // Fetch species details
    const detailsRes = await fetch(
      `https://api.gbif.org/v1/species/${gbifKey}`
    );
    const details = await detailsRes.json();

    return Response.json({
      success: true,
      species: {
        scientific_name: species.scientificName,
        common_name: species.canonicalName,
        gbif_key: gbifKey,
        kingdom: details.kingdom,
        phylum: details.phylum,
        class: details.class,
        order: details.order,
        family: details.family,
        genus: details.genus,
      },
      occurrences: {
        total_count: occurrenceData.count,
        records: (occurrenceData.results || []).map(occ => ({
          id: occ.key,
          latitude: occ.decimalLatitude,
          longitude: occ.decimalLongitude,
          date: occ.eventDate,
          country: occ.country,
          basis: occ.basisOfRecord,
          dataset: occ.datasetName,
          confidence: occ.coordinateUncertaintyInMeters,
        })),
      },
    });

  } catch (error) {
    console.error('GBIF query error:', error);
    return Response.json({
      error: 'Failed to query GBIF',
      details: error.message,
    }, { status: 500 });
  }
});