import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import L from 'npm:leaflet@1.9.4';

// Point-in-polygon test using ray casting algorithm
function isPointInPolygon(lat, lng, polygonCoords) {
  let inside = false;
  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const xi = polygonCoords[i][0], yi = polygonCoords[i][1];
    const xj = polygonCoords[j][0], yj = polygonCoords[j][1];
    
    const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInMultiPolygon(lat, lng, geojson) {
  if (!geojson) return false;
  
  const type = geojson.type;
  const coordinates = geojson.coordinates;
  
  if (type === 'Polygon') {
    // Exterior ring only (simplified - ignoring holes)
    return isPointInPolygon(lat, lng, coordinates[0]);
  }
  
  if (type === 'MultiPolygon') {
    // Check each polygon
    for (const polygon of coordinates) {
      if (isPointInPolygon(lat, lng, polygon[0])) {
        return true;
      }
    }
  }
  
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const speciesIds = body.species_ids || null;

    // Load occurrences
    let occurrences = await base44.entities.OccurrenceNote.list();
    if (speciesIds && speciesIds.length > 0) {
      occurrences = occurrences.filter(o => speciesIds.includes(o.species_id));
    }

    if (occurrences.length === 0) {
      return Response.json({ outliers: [], summary: { total: 0, outliers: 0, within_range: 0 } });
    }

    // Load IUCN range data
    const ranges = await base44.entities.IUCNRangeData.list();
    const rangeMap = new Map();
    for (const range of ranges) {
      if (range.range_data_geojson) {
        rangeMap.set(range.species_id, range.range_data_geojson);
      }
    }

    // Detect outliers
    const outliers = [];
    const withinRange = [];

    for (const occ of occurrences) {
      if (occ.latitude == null || occ.longitude == null) {
        outliers.push({
          ...occ,
          outlier_reason: 'missing_coordinates',
          message: 'Missing coordinates',
        });
        continue;
      }

      const rangeGeojson = rangeMap.get(occ.species_id);
      
      if (!rangeGeojson) {
        // No range data available - can't validate
        withinRange.push({ ...occ, has_range_data: false });
        continue;
      }

      const isInside = isPointInMultiPolygon(occ.latitude, occ.longitude, rangeGeojson);
      
      if (!isInside) {
        outliers.push({
          ...occ,
          outlier_reason: 'outside_range',
          message: 'Occurrence is outside IUCN known range polygon',
          distance_to_range_km: null, // Could be calculated with more complex geometry
        });
      } else {
        withinRange.push({ ...occ, has_range_data: true });
      }
    }

    return Response.json({
      outliers,
      within_range: withinRange,
      summary: {
        total: occurrences.length,
        outliers: outliers.length,
        within_range: withinRange.length,
        no_range_data: withinRange.filter(o => !o.has_range_data).length,
      },
    });

  } catch (error) {
    console.error('detectGeographicOutliers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});