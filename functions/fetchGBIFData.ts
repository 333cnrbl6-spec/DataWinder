import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scientificName } = await req.json();

    if (!scientificName) {
      return Response.json({ 
        status: 'error', 
        message: 'Scientific name is required' 
      }, { status: 400 });
    }

    // Search for species in GBIF
    const searchUrl = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}&strict=true`;
    const searchRes = await fetch(searchUrl);
    
    if (!searchRes.ok) {
      return Response.json({ 
        status: 'error', 
        message: 'Failed to fetch GBIF species data' 
      }, { status: searchRes.status });
    }

    const speciesData = await searchRes.json();

    if (speciesData.matchType === 'NONE' || !speciesData.usageKey) {
      return Response.json({ 
        status: 'error', 
        message: 'Species not found in GBIF' 
      }, { status: 404 });
    }

    const gbifId = speciesData.usageKey;

    // Fetch occurrence data for this species
    const occurrenceUrl = `https://api.gbif.org/v1/occurrence/search?taxonKey=${gbifId}&hasCoordinate=true&limit=300`;
    const occurrenceRes = await fetch(occurrenceUrl);

    if (!occurrenceRes.ok) {
      return Response.json({ 
        status: 'error', 
        message: 'Failed to fetch GBIF occurrence data' 
      }, { status: occurrenceRes.status });
    }

    const occurrenceData = await occurrenceRes.json();

    // Process occurrences
    const occurrences = occurrenceData.results.map(occ => ({
      latitude: occ.decimalLatitude,
      longitude: occ.decimalLongitude,
      location: occ.locality || occ.stateProvince || occ.country || '',
      date: occ.eventDate || occ.year ? `${occ.year}` : '',
      basis_of_record: occ.basisOfRecord,
      institution: occ.institutionCode || occ.publisher || '',
      catalog_number: occ.catalogNumber || ''
    }));

    // Count basis of record types
    const basisOfRecord = {};
    occurrenceData.results.forEach(occ => {
      const basis = occ.basisOfRecord || 'UNKNOWN';
      basisOfRecord[basis] = (basisOfRecord[basis] || 0) + 1;
    });

    return Response.json({
      status: 'success',
      data: {
        gbif_id: gbifId,
        scientific_name: speciesData.scientificName,
        common_name: speciesData.vernacularName || null,
        kingdom: speciesData.kingdom,
        phylum: speciesData.phylum,
        class_name: speciesData.class,
        order_name: speciesData.order,
        family: speciesData.family,
        genus: speciesData.genus,
        gbif_occurrence_count: occurrenceData.count || 0,
        gbif_occurrences: occurrences,
        gbif_basis_of_record: basisOfRecord,
        gbif_last_occurrence: occurrences[0]?.date || null
      }
    });
  } catch (error) {
    console.error('GBIF fetch error:', error);
    return Response.json({ 
      status: 'error', 
      message: error.message 
    }, { status: 500 });
  }
});