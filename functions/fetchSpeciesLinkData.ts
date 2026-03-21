import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scientificName, apiKey, limit = 200 } = await req.json();

    if (!scientificName) {
      return Response.json({ status: 'error', message: 'scientificName is required' }, { status: 400 });
    }
    if (!apiKey) {
      return Response.json({ status: 'error', message: 'speciesLink API key is required' }, { status: 400 });
    }

    const url = `https://specieslink.net/ws/1.0/search?scientificname=${encodeURIComponent(scientificName)}&coordinates=yes&limit=${limit}&apikey=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return Response.json({ status: 'error', message: `speciesLink API error: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();

    // speciesLink returns GeoJSON FeatureCollection
    const features = data?.features || [];

    const occurrences = features
      .filter(f => f.geometry?.coordinates)
      .map(f => {
        const props = f.properties || {};
        return {
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          location: [props.county, props.stateProvince, props.country].filter(Boolean).join(', '),
          date: props.yearCollected ? `${props.yearCollected}-01-01` : null,
          basis_of_record: props.basisOfRecord || '',
          institution: props.institutionCode || '',
          collection: props.collectionCode || '',
          catalog_number: props.catalogNumber || '',
          recorded_by: props.recordedBy || '',
          type_status: props.typeStatus || ''
        };
      });

    const lastCollected = occurrences
      .map(o => o.date)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;

    return Response.json({
      status: 'success',
      data: {
        scientific_name: scientificName,
        specieslink_occurrence_count: data.numberMatched || occurrences.length,
        specieslink_occurrences: occurrences,
        specieslink_last_collected: lastCollected
      }
    });
  } catch (error) {
    return Response.json({ status: 'error', message: error.message }, { status: 500 });
  }
});