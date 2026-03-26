import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import JSZip from 'npm:jszip@3.10.1';

// ── DBF Parser ──────────────────────────────────────────────────────────────
// Reads a dBASE III/IV .dbf file (ArrayBuffer) and returns array of row objects
function parseDbf(buffer) {
  const view = new DataView(buffer);
  const numRecords = view.getInt32(4, true);
  const headerBytes = view.getInt16(8, true);
  const recordSize = view.getInt16(10, true);

  // Parse field descriptors (each 32 bytes, starting at offset 32, ending at 0x0D terminator)
  const fields = [];
  let offset = 32;
  while (offset < headerBytes - 1) {
    const name = new TextDecoder('ascii').decode(new Uint8Array(buffer, offset, 11)).replace(/\0/g, '').trim();
    if (!name) break;
    const type = String.fromCharCode(view.getUint8(offset + 11));
    const length = view.getUint8(offset + 16);
    fields.push({ name, type, length });
    offset += 32;
  }

  // Parse records
  const rows = [];
  let recOffset = headerBytes;
  for (let i = 0; i < numRecords; i++) {
    const deleted = view.getUint8(recOffset) === 0x2a; // '*' marks deleted
    recOffset += 1;
    if (!deleted) {
      const row = {};
      for (const field of fields) {
        const raw = new TextDecoder('latin1').decode(new Uint8Array(buffer, recOffset, field.length)).trim();
        // Try numeric conversion for N/F types
        if ((field.type === 'N' || field.type === 'F') && raw !== '') {
          const num = parseFloat(raw);
          row[field.name] = isNaN(num) ? raw : num;
        } else {
          row[field.name] = raw;
        }
        recOffset += field.length;
      }
      rows.push(row);
    } else {
      recOffset += fields.reduce((s, f) => s + f.length, 0);
    }
  }
  return rows;
}

// ── SHP Parser ───────────────────────────────────────────────────────────────
// Reads a .shp file and returns array of GeoJSON geometry objects
function parseShp(buffer) {
  const view = new DataView(buffer);
  const fileCode = view.getInt32(0, false); // big-endian
  if (fileCode !== 9994) throw new Error('Not a valid SHP file');

  const geometries = [];
  let offset = 100; // skip 100-byte header

  while (offset < buffer.byteLength) {
    if (offset + 8 > buffer.byteLength) break;
    // Record header: record number (BE) + content length in 16-bit words (BE)
    const contentLength = view.getInt32(offset + 4, false) * 2; // bytes
    offset += 8;

    if (offset + contentLength > buffer.byteLength) break;
    const shapeType = view.getInt32(offset, true);

    if (shapeType === 0) {
      // Null shape
      geometries.push(null);
    } else if (shapeType === 5 || shapeType === 15 || shapeType === 25) {
      // Polygon / PolygonZ / PolygonM
      let pos = offset + 4 + 32; // skip shape type (4) + bounding box (32)
      const numParts = view.getInt32(pos, true); pos += 4;
      const numPoints = view.getInt32(pos, true); pos += 4;

      const parts = [];
      for (let i = 0; i < numParts; i++) {
        parts.push(view.getInt32(pos, true)); pos += 4;
      }

      const allPoints = [];
      for (let i = 0; i < numPoints; i++) {
        const x = view.getFloat64(pos, true); pos += 8;
        const y = view.getFloat64(pos, true); pos += 8;
        allPoints.push([x, y]);
      }

      const rings = parts.map((start, idx) => {
        const end = idx + 1 < parts.length ? parts[idx + 1] : numPoints;
        return allPoints.slice(start, end);
      });

      geometries.push({ type: 'Polygon', coordinates: rings });
    } else if (shapeType === 3 || shapeType === 13 || shapeType === 23) {
      // Polyline
      let pos = offset + 4 + 32;
      const numParts = view.getInt32(pos, true); pos += 4;
      const numPoints = view.getInt32(pos, true); pos += 4;
      const parts = [];
      for (let i = 0; i < numParts; i++) { parts.push(view.getInt32(pos, true)); pos += 4; }
      const allPoints = [];
      for (let i = 0; i < numPoints; i++) {
        const x = view.getFloat64(pos, true); pos += 8;
        const y = view.getFloat64(pos, true); pos += 8;
        allPoints.push([x, y]);
      }
      const lines = parts.map((start, idx) => {
        const end = idx + 1 < parts.length ? parts[idx + 1] : numPoints;
        return allPoints.slice(start, end);
      });
      geometries.push({ type: 'MultiLineString', coordinates: lines });
    } else if (shapeType === 1 || shapeType === 11 || shapeType === 21) {
      // Point
      const x = view.getFloat64(offset + 4, true);
      const y = view.getFloat64(offset + 12, true);
      geometries.push({ type: 'Point', coordinates: [x, y] });
    } else if (shapeType === 8 || shapeType === 18 || shapeType === 28) {
      // MultiPoint
      let pos = offset + 4 + 32;
      const numPoints = view.getInt32(pos, true); pos += 4;
      const points = [];
      for (let i = 0; i < numPoints; i++) {
        const x = view.getFloat64(pos, true); pos += 8;
        const y = view.getFloat64(pos, true); pos += 8;
        points.push([x, y]);
      }
      geometries.push({ type: 'MultiPoint', coordinates: points });
    } else {
      geometries.push(null); // unsupported shape type
    }

    offset += contentLength;
  }

  return geometries;
}

// ── IUCN DBF field mappings ────────────────────────────────────────────────
function normaliseIucnAttributes(row) {
  // IUCN shapefiles use specific field names — map them to our schema
  const name = row.BINOMIAL || row.SCI_NAME || row.SPECIES || row.binomial || row.sci_name || row.species || '';
  const category = row.CATEGORY || row.category || row.IUCN_CAT || '';
  const trend = (row.TREND || row.trend || row.POP_TREND || '').toLowerCase();
  const iucnId = parseInt(row.ID_NO || row.IUCN_ID || row.id_no || '0') || null;
  const familyName = row.FAMILY || row.family || '';
  const orderName = row.ORDER_ || row.ORDER || row.order_name || '';
  const className = row.CLASS || row.class_name || '';
  const commonName = row.COMM_NAME || row.common_name || row.COMMON_NAME || '';
  const presenceCode = row.PRESENCE || '';
  const seasonalityCode = row.SEASONAL || '';

  const trendMap = { decreasing: 'decreasing', stable: 'stable', increasing: 'increasing', unknown: 'unknown', '': 'unknown' };
  const normalisedTrend = trendMap[trend] || 'unknown';

  const validStatuses = ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'NE'];
  const normalisedStatus = validStatuses.includes(category?.toUpperCase()) ? category.toUpperCase() : null;

  return {
    scientific_name: name,
    common_name: commonName,
    iucn_status: normalisedStatus,
    population_trend: normalisedTrend,
    iucn_id: iucnId,
    _family: familyName,
    _order: orderName,
    _class: className,
    _presence: presenceCode,
    _seasonality: seasonalityCode,
    _raw: row
  };
}

// ── Main Handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { file_url, file_name } = body;

    if (!file_url) return Response.json({ error: 'Missing file_url' }, { status: 400 });

    // 1. Download the ZIP from the provided URL
    console.log(`Downloading shapefile ZIP from: ${file_url}`);
    const zipResponse = await fetch(file_url);
    if (!zipResponse.ok) throw new Error(`Failed to fetch file: ${zipResponse.status}`);
    const zipBuffer = await zipResponse.arrayBuffer();

    // 2. Extract files from ZIP
    const zip = new JSZip();
    await zip.loadAsync(zipBuffer);

    const files = {};
    for (const [name, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const ext = name.split('.').pop().toLowerCase();
      if (['shp', 'dbf', 'prj', 'shx', 'cpg'].includes(ext)) {
        files[ext] = await entry.async('arraybuffer');
        console.log(`Extracted: ${name} (${ext.toUpperCase()}, ${files[ext].byteLength} bytes)`);
      }
    }

    if (!files.shp) throw new Error('No .shp file found in ZIP archive');
    if (!files.dbf) throw new Error('No .dbf file found in ZIP archive — cannot read species attributes');

    // 3. Parse DBF (attributes) and SHP (geometry)
    console.log('Parsing DBF attributes...');
    const dbfRows = parseDbf(files.dbf);
    console.log(`Parsed ${dbfRows.length} DBF records`);

    console.log('Parsing SHP geometries...');
    const geometries = parseShp(files.shp);
    console.log(`Parsed ${geometries.length} SHP geometries`);

    // 4. Merge attributes with geometries → GeoJSON features
    const features = dbfRows.map((row, i) => ({
      type: 'Feature',
      geometry: geometries[i] || null,
      properties: row
    }));

    const geojson = { type: 'FeatureCollection', features };

    // 5. Extract unique species from DBF and normalise attributes
    const speciesMap = new Map();
    for (const row of dbfRows) {
      const attrs = normaliseIucnAttributes(row);
      if (!attrs.scientific_name) continue;
      const key = attrs.scientific_name.toLowerCase();
      if (!speciesMap.has(key)) {
        speciesMap.set(key, { attrs, featureIndices: [] });
      }
      const idx = dbfRows.indexOf(row);
      speciesMap.get(key).featureIndices.push(idx);
    }

    console.log(`Found ${speciesMap.size} unique species in shapefile`);

    // 6. For each species: upsert Species record + create IUCNRangeData record
    const results = [];
    for (const [key, { attrs, featureIndices }] of speciesMap.entries()) {
      const speciesFeatures = featureIndices.map(i => features[i]);
      const speciesGeoJson = {
        type: 'FeatureCollection',
        features: speciesFeatures,
        species: attrs.scientific_name,
        source: 'IUCN Red List Bulk Download'
      };

      // Look for existing species record
      let existingSpecies = null;
      try {
        const found = await base44.asServiceRole.entities.Species.filter({ scientific_name: attrs.scientific_name });
        existingSpecies = found?.[0] || null;
      } catch (e) {
        console.warn(`Could not lookup species ${attrs.scientific_name}: ${e.message}`);
      }

      // Prepare species update data
      const speciesData = {};
      if (attrs.iucn_status) speciesData.iucn_status = attrs.iucn_status;
      if (attrs.population_trend) speciesData.population_trend = attrs.population_trend;
      if (attrs.iucn_id) speciesData.iucn_id = attrs.iucn_id;
      if (attrs.common_name) speciesData.common_name = attrs.common_name;

      let speciesId;
      if (existingSpecies) {
        // Update existing record
        await base44.asServiceRole.entities.Species.update(existingSpecies.id, speciesData);
        speciesId = existingSpecies.id;
        console.log(`Updated existing species: ${attrs.scientific_name}`);
      } else {
        // Create new species record
        const newSpecies = await base44.asServiceRole.entities.Species.create({
          scientific_name: attrs.scientific_name,
          ...speciesData
        });
        speciesId = newSpecies.id;
        console.log(`Created new species: ${attrs.scientific_name}`);
      }

      // Upload GeoJSON as private file for storage
      let rangeFileUri = null;
      try {
        const geoJsonBlob = new Blob([JSON.stringify(speciesGeoJson)], { type: 'application/json' });
        const uploaded = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: geoJsonBlob });
        rangeFileUri = uploaded.file_uri;
      } catch (e) {
        console.warn(`Could not upload GeoJSON for ${attrs.scientific_name}: ${e.message}`);
      }

      // Check for existing IUCNRangeData record
      let existingRange = null;
      try {
        const found = await base44.asServiceRole.entities.IUCNRangeData.filter({ species_id: speciesId });
        existingRange = found?.[0] || null;
      } catch (e) {
        console.warn(`Could not lookup range data for ${attrs.scientific_name}: ${e.message}`);
      }

      const rangeData = {
        species_id: speciesId,
        scientific_name: attrs.scientific_name,
        range_data_geojson: speciesGeoJson,
        ...(rangeFileUri ? { range_geojson_file_uri: rangeFileUri } : {})
      };

      if (existingRange) {
        await base44.asServiceRole.entities.IUCNRangeData.update(existingRange.id, rangeData);
      } else {
        await base44.asServiceRole.entities.IUCNRangeData.create(rangeData);
      }

      // Update Species record with range data reference
      try {
        await base44.asServiceRole.entities.Species.update(speciesId, {
          iucn_range_data_id: speciesId
        });
      } catch (e) {
        // non-fatal
      }

      results.push({
        scientific_name: attrs.scientific_name,
        iucn_status: attrs.iucn_status,
        iucn_id: attrs.iucn_id,
        feature_count: speciesFeatures.length,
        species_id: speciesId,
        action: existingSpecies ? 'updated' : 'created'
      });
    }

    console.log(`Shapefile import complete. Processed ${results.length} species.`);

    return Response.json({
      status: 'success',
      species_count: results.length,
      feature_count: features.length,
      species: results,
      message: `Successfully imported ${results.length} species range${results.length !== 1 ? 's' : ''} from IUCN shapefile`
    });

  } catch (error) {
    console.error('Shapefile import error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});