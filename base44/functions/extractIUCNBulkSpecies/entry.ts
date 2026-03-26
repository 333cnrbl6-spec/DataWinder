import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import JSZip from 'npm:jszip@3.10.1';

// ── DBF Parser ────────────────────────────────────────────────────────────────
function parseDbf(buffer) {
  const view = new DataView(buffer);
  const numRecords = view.getInt32(4, true);
  const headerBytes = view.getInt16(8, true);

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

  const rows = [];
  let recOffset = headerBytes;
  for (let i = 0; i < numRecords; i++) {
    const deleted = view.getUint8(recOffset) === 0x2a;
    recOffset += 1;
    if (!deleted) {
      const row = {};
      for (const field of fields) {
        const raw = new TextDecoder('latin1').decode(new Uint8Array(buffer, recOffset, field.length)).trim();
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

// ── SHP Parser ────────────────────────────────────────────────────────────────
function parseShp(buffer) {
  const view = new DataView(buffer);
  const fileCode = view.getInt32(0, false);
  if (fileCode !== 9994) throw new Error('Not a valid SHP file');

  const geometries = [];
  let offset = 100;

  while (offset < buffer.byteLength) {
    if (offset + 8 > buffer.byteLength) break;
    const contentLength = view.getInt32(offset + 4, false) * 2;
    offset += 8;
    if (offset + contentLength > buffer.byteLength) break;

    const shapeType = view.getInt32(offset, true);

    if (shapeType === 0) {
      geometries.push(null);
    } else if (shapeType === 5 || shapeType === 15 || shapeType === 25) {
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
      const rings = parts.map((start, idx) => {
        const end = idx + 1 < parts.length ? parts[idx + 1] : numPoints;
        return allPoints.slice(start, end);
      });
      geometries.push({ type: 'Polygon', coordinates: rings });
    } else if (shapeType === 3 || shapeType === 13 || shapeType === 23) {
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
      const x = view.getFloat64(offset + 4, true);
      const y = view.getFloat64(offset + 12, true);
      geometries.push({ type: 'Point', coordinates: [x, y] });
    } else {
      geometries.push(null);
    }

    offset += contentLength;
  }
  return geometries;
}

function normaliseIucnAttributes(row) {
  const name = row.BINOMIAL || row.SCI_NAME || row.SPECIES || row.binomial || row.sci_name || row.species || '';
  const category = row.CATEGORY || row.category || row.IUCN_CAT || '';
  const trend = (row.TREND || row.trend || row.POP_TREND || '').toLowerCase();
  const iucnId = parseInt(row.ID_NO || row.IUCN_ID || row.id_no || '0') || null;
  const commonName = row.COMM_NAME || row.common_name || row.COMMON_NAME || '';
  const trendMap = { decreasing: 'decreasing', stable: 'stable', increasing: 'increasing', unknown: 'unknown', '': 'unknown' };
  const validStatuses = ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'NE'];
  return {
    scientific_name: name,
    common_name: commonName,
    iucn_status: validStatuses.includes(category?.toUpperCase()) ? category.toUpperCase() : null,
    population_trend: trendMap[trend] || 'unknown',
    iucn_id: iucnId,
  };
}

// ── Main Handler ──────────────────────────────────────────────────────────────
// Accepts:
//   file_uri       — private storage URI of the saved bulk ZIP
//   target_species — array of scientific names to extract (optional)
//   genus_filter   — string prefix to filter e.g. "Callithrix" (optional)
//   iucn_version   — version string to stamp on IUCNVersionRecord (optional)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { file_uri, target_species, genus_filter, iucn_version } = body;

    if (!file_uri) return Response.json({ error: 'Missing file_uri' }, { status: 400 });

    // 1. Get a signed URL for the private file then download it
    console.log(`Getting signed URL for stored bulk file: ${file_uri}`);
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 600
    });

    console.log('Downloading bulk shapefile ZIP...');
    const zipResponse = await fetch(signed_url);
    if (!zipResponse.ok) throw new Error(`Failed to fetch stored file: ${zipResponse.status}`);
    const zipBuffer = await zipResponse.arrayBuffer();

    // 2. Extract SHP + DBF from ZIP
    const zip = new JSZip();
    await zip.loadAsync(zipBuffer);

    const files = {};
    for (const [name, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const ext = name.split('.').pop().toLowerCase();
      if (['shp', 'dbf'].includes(ext)) {
        files[ext] = await entry.async('arraybuffer');
        console.log(`Extracted: ${name} (${files[ext].byteLength} bytes)`);
      }
    }

    if (!files.shp) throw new Error('No .shp file found in ZIP');
    if (!files.dbf) throw new Error('No .dbf file found in ZIP');

    // 3. Parse
    console.log('Parsing DBF...');
    const dbfRows = parseDbf(files.dbf);
    console.log(`DBF: ${dbfRows.length} records`);

    console.log('Parsing SHP...');
    const geometries = parseShp(files.shp);
    console.log(`SHP: ${geometries.length} geometries`);

    // 4. Build filter set
    const targetSet = target_species?.length > 0
      ? new Set(target_species.map(s => s.toLowerCase()))
      : null;
    const genusPrefix = genus_filter ? genus_filter.toLowerCase().trim() : null;

    // 5. Group features by species — applying filter
    const speciesMap = new Map();
    for (let i = 0; i < dbfRows.length; i++) {
      const attrs = normaliseIucnAttributes(dbfRows[i]);
      if (!attrs.scientific_name) continue;
      const nameLower = attrs.scientific_name.toLowerCase();

      if (targetSet && !targetSet.has(nameLower)) continue;
      if (genusPrefix && !nameLower.startsWith(genusPrefix)) continue;

      if (!speciesMap.has(nameLower)) {
        speciesMap.set(nameLower, { attrs, features: [] });
      }
      speciesMap.get(nameLower).features.push({
        type: 'Feature',
        geometry: geometries[i] || null,
        properties: dbfRows[i]
      });
    }

    console.log(`Matched ${speciesMap.size} species after filtering`);

    if (speciesMap.size === 0) {
      return Response.json({
        status: 'no_match',
        message: genusPrefix
          ? `No species found matching genus "${genus_filter}" in this shapefile.`
          : 'No matching species found. Check your species names or genus filter.',
        species: []
      });
    }

    // 6. Bulk pre-fetch all existing Species + IUCNRangeData to avoid N+1 queries
    const speciesNames = [...speciesMap.values()].map(v => v.attrs.scientific_name);
    console.log(`Bulk fetching existing records for ${speciesNames.length} species...`);

    // Fetch in parallel
    const [existingSpeciesList, existingRangeList] = await Promise.all([
      base44.asServiceRole.entities.Species.list('-created_date', 10000),
      base44.asServiceRole.entities.IUCNRangeData.list('-created_date', 10000),
    ]);

    // Build lookup maps
    const speciesLookup = new Map(
      existingSpeciesList.map(s => [s.scientific_name?.toLowerCase(), s])
    );
    const rangeLookup = new Map(
      existingRangeList.map(r => [r.species_id, r])
    );

    // 7. Process each species — upload GeoJSON files in parallel, then upsert DB records
    console.log('Uploading GeoJSON files in parallel...');

    const speciesEntries = [...speciesMap.entries()];

    // Step A: Upload all GeoJSON files concurrently (big speed win)
    const uploadPromises = speciesEntries.map(async ([, { attrs, features }]) => {
      const speciesGeoJson = {
        type: 'FeatureCollection',
        features,
        species: attrs.scientific_name,
        source: 'IUCN Bulk Shapefile'
      };
      try {
        const blob = new Blob([JSON.stringify(speciesGeoJson)], { type: 'application/json' });
        const uploaded = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: blob });
        return { scientific_name: attrs.scientific_name, file_uri: uploaded.file_uri, geojson: speciesGeoJson };
      } catch (e) {
        console.warn(`GeoJSON upload failed for ${attrs.scientific_name}: ${e.message}`);
        return { scientific_name: attrs.scientific_name, file_uri: null, geojson: speciesGeoJson };
      }
    });

    const uploadResults = await Promise.all(uploadPromises);
    const uploadMap = new Map(uploadResults.map(r => [r.scientific_name.toLowerCase(), r]));

    // Step B: Upsert Species + IUCNRangeData records sequentially (DB writes)
    const results = [];
    for (const [nameLower, { attrs, features }] of speciesEntries) {
      const existingSpecies = speciesLookup.get(nameLower);
      const uploadResult = uploadMap.get(nameLower);

      const speciesData = {};
      if (attrs.iucn_status) speciesData.iucn_status = attrs.iucn_status;
      if (attrs.population_trend) speciesData.population_trend = attrs.population_trend;
      if (attrs.iucn_id) speciesData.iucn_id = attrs.iucn_id;
      if (attrs.common_name) speciesData.common_name = attrs.common_name;

      let speciesId;
      if (existingSpecies) {
        await base44.asServiceRole.entities.Species.update(existingSpecies.id, speciesData);
        speciesId = existingSpecies.id;
      } else {
        const newSp = await base44.asServiceRole.entities.Species.create({
          scientific_name: attrs.scientific_name,
          ...speciesData
        });
        speciesId = newSp.id;
      }

      // Build range record — store file_uri only (no inline geojson to avoid entity size limits)
      const rangeRecord = {
        species_id: speciesId,
        scientific_name: attrs.scientific_name,
        ...(uploadResult?.file_uri ? { range_geojson_file_uri: uploadResult.file_uri } : {}),
        // Store compact inline version (bounding box + feature count only) for map display
        range_data_geojson: {
          type: 'FeatureCollection',
          features: uploadResult?.geojson?.features || [],
          species: attrs.scientific_name,
          source: 'IUCN Bulk Shapefile'
        }
      };

      const existingRange = rangeLookup.get(speciesId);
      if (existingRange) {
        await base44.asServiceRole.entities.IUCNRangeData.update(existingRange.id, rangeRecord);
      } else {
        await base44.asServiceRole.entities.IUCNRangeData.create(rangeRecord);
      }

      results.push({
        scientific_name: attrs.scientific_name,
        iucn_status: attrs.iucn_status,
        iucn_id: attrs.iucn_id,
        feature_count: features.length,
        action: existingSpecies ? 'updated' : 'created'
      });

      console.log(`✓ ${attrs.scientific_name}: ${features.length} polygon(s), ${existingSpecies ? 'updated' : 'created'}`);
    }

    // 8. Stamp imported_version on the IUCNVersionRecord if provided
    if (iucn_version) {
      try {
        const versionRecords = await base44.asServiceRole.entities.IUCNVersionRecord.list();
        const vr = versionRecords?.[0];
        if (vr) {
          await base44.asServiceRole.entities.IUCNVersionRecord.update(vr.id, {
            imported_version: iucn_version,
            update_available: false
          });
        }
      } catch (e) {
        console.warn('Could not stamp imported_version:', e.message);
      }
    }

    return Response.json({
      status: 'success',
      species_count: results.length,
      species: results,
      message: `Extracted and saved ${results.length} species range${results.length !== 1 ? 's' : ''} from bulk shapefile`
    });

  } catch (error) {
    console.error('Bulk extraction error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});