import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      project_id,
      name,
      polygon_coordinates,
      species_ids,
      notes
    } = await req.json();

    if (!project_id || !name || !polygon_coordinates) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Calculate bounds
    let minLat = 90, minLon = 180, maxLat = -90, maxLon = -180;

    polygon_coordinates.forEach(([lon, lat]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
    });

    // Count occurrences within and outside polygon
    const occurrenceNotes = species_ids && species_ids.length > 0
      ? await base44.entities.OccurrenceNote.filter(
          { species_id: { $in: species_ids } },
          null,
          1000
        )
      : [];

    const pointInPolygon = (lat, lon, poly) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        const intersect = ((yi > lon) !== (yj > lon))
          && (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    let included = 0, excluded = 0;
    occurrenceNotes.forEach(occ => {
      if (pointInPolygon(occ.latitude, occ.longitude, polygon_coordinates)) {
        included++;
      } else {
        excluded++;
      }
    });

    // Create filter
    const filter = await base44.entities.PolygonFilter.create({
      name,
      project_id,
      polygon_coordinates,
      species_ids: species_ids || [],
      bounds: {
        min_lat: minLat,
        min_lon: minLon,
        max_lat: maxLat,
        max_lon: maxLon
      },
      occurrences_included: included,
      occurrences_excluded: excluded,
      created_by: user.email,
      created_by_name: user.full_name,
      notes
    });

    return Response.json({
      success: true,
      filter_id: filter.id,
      included_count: included,
      excluded_count: excluded
    });
  } catch (error) {
    console.error('Filter save error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});