import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Coordinate quality checks ──────────────────────────────────────────────

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Well-known country centroid coordinates (common coordinate precision artefacts)
const COUNTRY_CENTROIDS = [
  { lat: 0, lon: 0, name: 'Null Island' },
  { lat: -14.235, lon: -51.925, name: 'Brazil centroid' },
  { lat: -25.274, lon: 133.775, name: 'Australia centroid' },
  { lat: 56.130, lon: -106.346, name: 'Canada centroid' },
  { lat: 37.090, lon: -95.712, name: 'USA centroid' },
  { lat: 20.593, lon: 78.962, name: 'India centroid' },
  { lat: 35.861, lon: 104.195, name: 'China centroid' },
];

function flagCoordinate(lat, lon) {
  const flags = [];

  // 1. Null / missing
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    flags.push({ code: 'MISSING_COORDS', severity: 'error', message: 'Missing or non-numeric coordinates' });
    return flags;
  }

  // 2. Out of range
  if (lat < -90 || lat > 90)  flags.push({ code: 'LAT_OUT_OF_RANGE',  severity: 'error',   message: `Latitude ${lat} out of valid range (-90 to 90)` });
  if (lon < -180 || lon > 180) flags.push({ code: 'LON_OUT_OF_RANGE', severity: 'error',   message: `Longitude ${lon} out of valid range (-180 to 180)` });

  // 3. Null Island or country centroid
  for (const c of COUNTRY_CENTROIDS) {
    if (haversineKm(lat, lon, c.lat, c.lon) < 10) {
      flags.push({ code: 'CENTROID_ARTEFACT', severity: 'warning', message: `Coordinates are within 10 km of ${c.name} — likely a centroid artefact` });
      break;
    }
  }

  // 4. Low coordinate precision (rounded to ≤1 decimal place)
  const latDecimals = (String(lat).split('.')[1] || '').length;
  const lonDecimals = (String(lon).split('.')[1] || '').length;
  if (latDecimals <= 1 && lonDecimals <= 1) {
    flags.push({ code: 'LOW_PRECISION', severity: 'warning', message: `Coordinates have ≤1 decimal place (≥10 km uncertainty)` });
  }

  // 5. Possible transposed lat/lon (latitude looks like longitude for certain regions)
  if (Math.abs(lat) > 90) {
    flags.push({ code: 'TRANSPOSED_COORDS', severity: 'error', message: 'Latitude exceeds ±90 — lat/lon may be transposed' });
  }

  return flags;
}

// ── Duplicate detection ────────────────────────────────────────────────────

function buildDuplicateKey(occ) {
  // Round to 3 dp (~111m) to catch near-duplicates
  const lat = Math.round((occ.latitude ?? 0) * 1000) / 1000;
  const lon = Math.round((occ.longitude ?? 0) * 1000) / 1000;
  return `${occ.species_id}|${lat}|${lon}|${occ.occurrence_date || ''}`;
}

// ── GBIF backbone taxonomy check ──────────────────────────────────────────

async function verifyGBIFTaxonomy(scientificName) {
  const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}&verbose=false`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return {
    matchType: data.matchType,          // EXACT | FUZZY | HIGHERRANK | NONE
    confidence: data.confidence ?? 0,
    acceptedName: data.species || data.canonicalName || null,
    synonym: data.synonym ?? false,
    status: data.status,                // ACCEPTED | SYNONYM | DOUBTFUL
    usageKey: data.usageKey ?? null,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const speciesIds = body.species_ids || null; // null = all

    // Load occurrences
    let occurrences = await base44.entities.OccurrenceNote.list();
    if (speciesIds && speciesIds.length > 0) {
      occurrences = occurrences.filter(o => speciesIds.includes(o.species_id));
    }

    if (occurrences.length === 0) {
      return Response.json({ results: [], summary: { total: 0, flagged: 0, duplicates: 0, taxonomy_issues: 0 } });
    }

    // ── Deduplicate species names for GBIF batch (avoid repeated calls) ──
    const uniqueSpeciesNames = [...new Set(occurrences.map(o => o.species_name).filter(Boolean))];
    const gbifCache = {};
    await Promise.allSettled(
      uniqueSpeciesNames.map(async name => {
        const result = await verifyGBIFTaxonomy(name);
        if (result) gbifCache[name] = result;
      })
    );

    // ── Duplicate detection across all occurrences ──
    const keyCount = {};
    const keyFirstId = {};
    for (const occ of occurrences) {
      const key = buildDuplicateKey(occ);
      keyCount[key] = (keyCount[key] || 0) + 1;
      if (!keyFirstId[key]) keyFirstId[key] = occ.id;
    }

    // ── Process each occurrence ──
    const results = occurrences.map(occ => {
      const flags = [];

      // Coordinate flags
      const coordFlags = flagCoordinate(occ.latitude, occ.longitude);
      flags.push(...coordFlags);

      // Duplicate flag
      const key = buildDuplicateKey(occ);
      if (keyCount[key] > 1 && keyFirstId[key] !== occ.id) {
        flags.push({
          code: 'DUPLICATE',
          severity: 'warning',
          message: `Duplicate occurrence (same species, date, and rounded coordinates)`,
        });
      }

      // GBIF taxonomy flags
      const gbif = gbifCache[occ.species_name];
      if (occ.species_name) {
        if (!gbif || gbif.matchType === 'NONE') {
          flags.push({ code: 'TAXONOMY_UNMATCHED', severity: 'error', message: `"${occ.species_name}" not found in GBIF backbone taxonomy` });
        } else if (gbif.matchType === 'FUZZY') {
          flags.push({ code: 'TAXONOMY_FUZZY', severity: 'warning', message: `Fuzzy GBIF match (confidence ${gbif.confidence}%) — check spelling` });
        } else if (gbif.synonym) {
          flags.push({ code: 'TAXONOMY_SYNONYM', severity: 'warning', message: `"${occ.species_name}" is a synonym; accepted name: "${gbif.acceptedName}"` });
        } else if (gbif.status === 'DOUBTFUL') {
          flags.push({ code: 'TAXONOMY_DOUBTFUL', severity: 'warning', message: `GBIF status DOUBTFUL for "${occ.species_name}"` });
        } else if (gbif.confidence < 80) {
          flags.push({ code: 'TAXONOMY_LOW_CONFIDENCE', severity: 'warning', message: `Low GBIF match confidence (${gbif.confidence}%)` });
        }
      } else {
        flags.push({ code: 'MISSING_SPECIES_NAME', severity: 'error', message: 'Occurrence has no species name' });
      }

      const quality = flags.length === 0 ? 'clean'
        : flags.some(f => f.severity === 'error') ? 'invalid'
        : 'review';

      return {
        id: occ.id,
        species_id: occ.species_id,
        species_name: occ.species_name,
        latitude: occ.latitude,
        longitude: occ.longitude,
        source: occ.source,
        occurrence_date: occ.occurrence_date,
        flags,
        quality,
        gbif_match: gbif ? { matchType: gbif.matchType, acceptedName: gbif.acceptedName, confidence: gbif.confidence, synonym: gbif.synonym } : null,
      };
    });

    const flagged   = results.filter(r => r.quality !== 'clean').length;
    const dupCount  = results.filter(r => r.flags.some(f => f.code === 'DUPLICATE')).length;
    const taxIssues = results.filter(r => r.flags.some(f => f.code.startsWith('TAXONOMY'))).length;

    return Response.json({
      results,
      summary: {
        total: results.length,
        clean: results.length - flagged,
        flagged,
        invalid: results.filter(r => r.quality === 'invalid').length,
        review: results.filter(r => r.quality === 'review').length,
        duplicates: dupCount,
        taxonomy_issues: taxIssues,
      },
    });

  } catch (error) {
    console.error('batchOccurrenceVerify error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});