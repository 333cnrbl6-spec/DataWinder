import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scientificName, level } = await req.json();

    if (!scientificName) {
      return Response.json({ 
        status: 'error', 
        message: 'Scientific name is required' 
      }, { status: 400 });
    }

    // If higher taxonomic level, get child species
    if (level && level !== 'species') {
      // First, find the parent taxon
      const parentUrl = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}&rank=${level}&strict=false`;
      const parentRes = await fetch(parentUrl);
      
      if (!parentRes.ok) {
        return Response.json({ 
          status: 'error', 
          message: 'Failed to fetch GBIF parent taxon' 
        }, { status: parentRes.status });
      }

      const parentData = await parentRes.json();
      
      if (parentData.matchType === 'NONE' || !parentData.usageKey) {
        return Response.json({ 
          status: 'error', 
          message: 'Parent taxon not found in GBIF' 
        }, { status: 404 });
      }

      const parentKey = parentData.usageKey;

      // Get child species
      const childrenUrl = `https://api.gbif.org/v1/species/search?higherTaxonKey=${parentKey}&rank=SPECIES&limit=300`;
      const childrenRes = await fetch(childrenUrl);

      if (!childrenRes.ok) {
        return Response.json({ 
          status: 'error', 
          message: 'Failed to fetch child species' 
        }, { status: childrenRes.status });
      }

      const childrenData = await childrenRes.json();
      
      if (!childrenData.results || childrenData.results.length === 0) {
        return Response.json({ 
          status: 'error', 
          message: 'No child species found' 
        }, { status: 404 });
      }

      // Process each child species with occurrence data
      const allSpecies = await Promise.all(
        childrenData.results.map(async (child) => {
          const occurrenceUrl = `https://api.gbif.org/v1/occurrence/search?taxonKey=${child.key}&hasCoordinate=true&limit=100`;
          const occurrenceRes = await fetch(occurrenceUrl);
          
          let occurrences = [];
          let basisOfRecord = {};
          let occurrenceCount = 0;

          if (occurrenceRes.ok) {
            const occurrenceData = await occurrenceRes.json();
            occurrenceCount = occurrenceData.count || 0;

            occurrences = occurrenceData.results.map(occ => ({
              latitude: occ.decimalLatitude,
              longitude: occ.decimalLongitude,
              location: occ.locality || occ.stateProvince || occ.country || '',
              date: occ.eventDate || occ.year ? `${occ.year}` : '',
              basis_of_record: occ.basisOfRecord,
              institution: occ.institutionCode || occ.publisher || '',
              catalog_number: occ.catalogNumber || ''
            }));

            occurrenceData.results.forEach(occ => {
              const basis = occ.basisOfRecord || 'UNKNOWN';
              basisOfRecord[basis] = (basisOfRecord[basis] || 0) + 1;
            });
          }

          return {
            gbif_id: child.key,
            scientific_name: child.scientificName,
            common_name: child.vernacularName || null,
            kingdom: child.kingdom,
            phylum: child.phylum,
            class_name: child.class,
            order_name: child.order,
            family: child.family,
            genus: child.genus,
            gbif_occurrence_count: occurrenceCount,
            gbif_occurrences: occurrences,
            gbif_basis_of_record: basisOfRecord,
            gbif_last_occurrence: occurrences[0]?.date || null
          };
        })
      );

      return Response.json({
        status: 'success',
        data: allSpecies
      });
    }

    // Single species search
    let searchUrl = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}&strict=false`;
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