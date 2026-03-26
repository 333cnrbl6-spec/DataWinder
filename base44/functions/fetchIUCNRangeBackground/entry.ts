import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event } = await req.json();

    if (!event || event.type !== 'create') {
      return Response.json({ status: 'ignored', reason: 'Not a species creation event' }, { status: 200 });
    }

    const speciesId = event.entity_id;
    const species = await base44.entities.Species.get(speciesId);

    if (!species || !species.scientific_name) {
      return Response.json({ status: 'error', message: 'Invalid species data' }, { status: 400 });
    }

    const apiKey = Deno.env.get('IUCN_API_KEY');
    if (!apiKey) {
      return Response.json({ status: 'error', message: 'IUCN_API_KEY not configured' }, { status: 500 });
    }

    // Search for species on IUCN API
    const searchUrl = `https://apiv3.iucnredlist.org/api/v3/advanced_search?token=${apiKey}&taxonomy=true&page=1&name=${encodeURIComponent(species.scientific_name)}`;
    
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      console.log(`IUCN search failed for ${species.scientific_name}: ${searchRes.status}`);
      return Response.json({ status: 'warning', message: `IUCN search returned ${searchRes.status}` }, { status: 200 });
    }

    const searchData = await searchRes.json();
    if (!searchData.result || searchData.result.length === 0) {
      console.log(`No IUCN record found for ${species.scientific_name}`);
      return Response.json({ status: 'not_found', message: 'Species not found on IUCN' }, { status: 200 });
    }

    const result = searchData.result[0];
    const iucnId = result.assessment_id;
    const assessmentId = result.assessment_id;

    // Fetch assessment details
    const assessmentUrl = `https://apiv3.iucnredlist.org/api/v3/assessment/${assessmentId}?token=${apiKey}`;
    const assessmentRes = await fetch(assessmentUrl);
    if (!assessmentRes.ok) {
      console.log(`Failed to fetch IUCN assessment for ${species.scientific_name}`);
      return Response.json({ status: 'partial', message: 'Could not fetch assessment details' }, { status: 200 });
    }

    const assessmentData = await assessmentRes.json();

    // Fetch spatial data (range maps)
    const spatialUrl = `https://apiv3.iucnredlist.org/api/v3/spatial/${iucnId}?token=${apiKey}`;
    const spatialRes = await fetch(spatialUrl);
    
    let rangeGeojson = null;
    let areaKm2 = null;

    if (spatialRes.ok) {
      const spatialData = await spatialRes.json();
      if (spatialData.geometry) {
        rangeGeojson = spatialData.geometry;
        // Calculate area from bounds if available
        try {
          if (spatialData.properties?.area_km2) {
            areaKm2 = spatialData.properties.area_km2;
          }
        } catch (e) {
          console.log(`Could not extract area for ${species.scientific_name}`);
        }
      }
    }

    // Create or update IUCNRangeData record
    const existingRange = await base44.entities.IUCNRangeData.filter({ species_id: speciesId });
    
    const rangeData = {
      species_id: speciesId,
      scientific_name: species.scientific_name,
      range_data_geojson: rangeGeojson,
      area_km2: areaKm2
    };

    let rangeRecord;
    if (existingRange.length > 0) {
      rangeRecord = await base44.entities.IUCNRangeData.update(existingRange[0].id, rangeData);
    } else {
      rangeRecord = await base44.entities.IUCNRangeData.create(rangeData);
    }

    // Update Species record with reference
    await base44.entities.Species.update(speciesId, {
      iucn_id: result.id,
      assessment_id: assessmentId,
      iucn_range_data_id: rangeRecord.id
    });

    // Get user email for notification
    const user = await base44.auth.me();
    if (user?.email) {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `IUCN Range Data Ready: ${species.scientific_name}`,
        body: `The IUCN range data for ${species.scientific_name} has been successfully fetched and is ready for spatial analysis.${areaKm2 ? ` Range area: ${areaKm2.toLocaleString()} km².` : ''}\n\nYou can now use this species in the ArcGIS Tools and spatial analysis workflows.`
      });
    }

    return Response.json({
      status: 'success',
      speciesId,
      rangeId: rangeRecord.id,
      areaKm2,
      message: `Range data fetched for ${species.scientific_name}`
    });

  } catch (error) {
    console.error('Background fetch error:', error);
    return Response.json({ status: 'error', message: error.message }, { status: 500 });
  }
});