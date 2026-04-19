import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, name, description, geojson_data } = await req.json();

    if (!project_id || !name || !geojson_data) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate GeoJSON structure
    if (!geojson_data.type || (geojson_data.type !== 'FeatureCollection' && geojson_data.type !== 'Feature' && geojson_data.type !== 'Polygon')) {
      return Response.json({ error: 'Invalid GeoJSON format' }, { status: 400 });
    }

    // Calculate bounds
    let minLat = 90, minLon = 180, maxLat = -90, maxLon = -180;
    let featureCount = 0;

    const extractCoordinates = (coords) => {
      if (Array.isArray(coords) && coords.length === 2 && typeof coords[0] === 'number') {
        const [lon, lat] = coords;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      } else if (Array.isArray(coords)) {
        coords.forEach(extractCoordinates);
      }
    };

    if (geojson_data.type === 'FeatureCollection') {
      geojson_data.features?.forEach(feature => {
        featureCount++;
        if (feature.geometry?.coordinates) {
          extractCoordinates(feature.geometry.coordinates);
        }
      });
    } else if (geojson_data.type === 'Feature') {
      featureCount = 1;
      if (geojson_data.geometry?.coordinates) {
        extractCoordinates(geojson_data.geometry.coordinates);
      }
    } else if (geojson_data.type === 'Polygon') {
      featureCount = 1;
      extractCoordinates(geojson_data.coordinates);
    }

    // Create boundary record
    const boundary = await base44.entities.GeoJSONBoundary.create({
      name,
      description,
      project_id,
      geojson_data,
      bounds: {
        min_lat: minLat,
        min_lon: minLon,
        max_lat: maxLat,
        max_lon: maxLon
      },
      feature_count: featureCount,
      uploaded_by: user.email,
      uploaded_by_name: user.full_name
    });

    return Response.json({
      success: true,
      boundary_id: boundary.id,
      feature_count: featureCount,
      bounds: boundary.bounds
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});