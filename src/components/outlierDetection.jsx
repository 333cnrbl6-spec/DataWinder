// Shared outlier detection logic — imported by OutlierDetectionModal, OutlierScanAll, DataPreparation

export const CRITERIA = [
  {
    label: 'Check 1 — Invalid / Missing Coordinates',
    severity: 'HIGH',
    confidence: '96–98%',
    color: 'bg-red-100 border-red-300 text-red-900',
    badge: 'bg-red-500 text-white',
    rules: [
      'NaN or unparseable lat/lng values → flagged as missing coordinates.',
      'Exact (0°, 0°) — "Null Island" — almost always a geocoding or default-value error.',
      'Values outside −90/+90 (lat) or −180/+180 (lng) are physically impossible.',
    ],
  },
  {
    label: 'Check 2 — IQR Statistical Outliers',
    severity: 'MEDIUM',
    confidence: '55–82%',
    color: 'bg-amber-100 border-amber-300 text-amber-900',
    badge: 'bg-amber-500 text-white',
    rules: [
      'Only applied when ≥ 5 clean records are available.',
      'IQR fence: Q1 − 1.5×IQR … Q3 + 1.5×IQR (Tukey method).',
      'Points outside the fence on both axes score higher (~82%) than single-axis outliers (~55–78%).',
      'Confidence scales with distance beyond the fence — farther = more likely erroneous.',
    ],
  },
  {
    label: 'Check 3 — Duplicate Coordinates',
    severity: 'LOW',
    confidence: '~35%',
    color: 'bg-blue-100 border-blue-300 text-blue-900',
    badge: 'bg-blue-400 text-white',
    rules: [
      'Coordinates rounded to 4 decimal places (~11 m precision) are compared.',
      'If two or more records share the same rounded location, all but the first are flagged.',
      'Low confidence — repeated valid sightings at the same site are common; review manually.',
    ],
  },
];

export function scoreConfidence(check, extraData = {}) {
  switch (check) {
    case 'null_coords': return 98;
    case 'null_island': return 96;
    case 'bounds':      return 97;
    case 'iqr_both':    return 82;
    case 'iqr_one': {
      const { distance } = extraData;
      return Math.min(78, 55 + Math.round((distance || 0) * 5));
    }
    case 'duplicate': return 35;
    default: return 50;
  }
}

export function detectOutliers(species) {
  const observations = [];

  (species.observations || []).forEach((obs, idx) => {
    observations.push({
      idx,
      source: 'iNaturalist',
      lat: parseFloat(obs.latitude),
      lng: parseFloat(obs.longitude),
      date: obs.observed_on,
      location: obs.location,
      observer: obs.user,
      isFlagged: obs.is_outlier || false,
    });
  });

  (species.gbif_occurrences || []).forEach((occ, idx) => {
    observations.push({
      idx,
      source: 'GBIF',
      lat: parseFloat(occ.decimalLatitude),
      lng: parseFloat(occ.decimalLongitude),
      date: occ.eventDate,
      location: occ.locality || occ.stateProvince || occ.country,
      isFlagged: occ.is_outlier || false,
    });
  });

  const flagged = [];
  const flaggedKeys = new Set();

  const flag = (obs, reason, severity, checkType, extraData) => {
    const key = `${obs.source}_${obs.idx}`;
    if (flaggedKeys.has(key)) return;
    flaggedKeys.add(key);
    flagged.push({ ...obs, reason, severity, confidence: scoreConfidence(checkType, extraData) });
  };

  // Check 1: Invalid / missing coordinates
  observations.forEach(obs => {
    if (isNaN(obs.lat) || isNaN(obs.lng)) {
      flag(obs, 'Missing or unparseable coordinates', 'high', 'null_coords');
    } else if (obs.lat === 0 && obs.lng === 0) {
      flag(obs, 'Null Island (0°, 0°) — likely a geocoding or data-entry error', 'high', 'null_island');
    } else if (obs.lat < -90 || obs.lat > 90 || obs.lng < -180 || obs.lng > 180) {
      flag(obs, 'Coordinates outside valid geographic bounds', 'high', 'bounds');
    }
  });

  const clean = observations.filter(o => !flaggedKeys.has(`${o.source}_${o.idx}`));

  if (clean.length > 4) {
    const lats = clean.map(o => o.lat).sort((a, b) => a - b);
    const lngs = clean.map(o => o.lng).sort((a, b) => a - b);
    const q1Lat = lats[Math.floor(lats.length * 0.25)];
    const q3Lat = lats[Math.floor(lats.length * 0.75)];
    const iqrLat = q3Lat - q1Lat;
    const q1Lng = lngs[Math.floor(lngs.length * 0.25)];
    const q3Lng = lngs[Math.floor(lngs.length * 0.75)];
    const iqrLng = q3Lng - q1Lng;

    clean.forEach(obs => {
      const latLow  = q1Lat - 1.5 * iqrLat;
      const latHigh = q3Lat + 1.5 * iqrLat;
      const lngLow  = q1Lng - 1.5 * iqrLng;
      const lngHigh = q3Lng + 1.5 * iqrLng;
      const latOut  = iqrLat > 0 && (obs.lat < latLow || obs.lat > latHigh);
      const lngOut  = iqrLng > 0 && (obs.lng < lngLow || obs.lng > lngHigh);

      if (latOut && lngOut) {
        flag(obs, 'Statistical outlier — latitude & longitude outside IQR ×1.5 fence', 'medium', 'iqr_both');
      } else if (latOut) {
        const dist = obs.lat < latLow ? (latLow - obs.lat) / iqrLat : (obs.lat - latHigh) / iqrLat;
        flag(obs, 'Statistical outlier — latitude outside IQR ×1.5 fence', 'medium', 'iqr_one', { distance: dist });
      } else if (lngOut) {
        const dist = obs.lng < lngLow ? (lngLow - obs.lng) / iqrLng : (obs.lng - lngHigh) / iqrLng;
        flag(obs, 'Statistical outlier — longitude outside IQR ×1.5 fence', 'medium', 'iqr_one', { distance: dist });
      }
    });

    const coordMap = {};
    clean.forEach(obs => {
      if (flaggedKeys.has(`${obs.source}_${obs.idx}`)) return;
      const k = `${obs.lat.toFixed(4)},${obs.lng.toFixed(4)}`;
      if (!coordMap[k]) coordMap[k] = [];
      coordMap[k].push(obs);
    });
    Object.values(coordMap).forEach(group => {
      if (group.length > 1) {
        group.slice(1).forEach(obs =>
          flag(obs, 'Duplicate coordinates — exact location matches another record', 'low', 'duplicate')
        );
      }
    });
  }

  return {
    total: observations.length,
    flagged,
    cleanCount: observations.length - flagged.length,
    cleanPoints: clean,
  };
}

export const severityConfig = {
  high:   { card: 'border-red-200 bg-red-50',    badge: 'bg-red-500 text-white',    bar: 'bg-red-500',    color: '#ef4444' },
  medium: { card: 'border-amber-200 bg-amber-50', badge: 'bg-amber-500 text-white',  bar: 'bg-amber-500',  color: '#f59e0b' },
  low:    { card: 'border-blue-200 bg-blue-50',   badge: 'bg-blue-400 text-white',   bar: 'bg-blue-400',   color: '#60a5fa' },
};

export function confidenceLabel(c) {
  if (c >= 90) return 'Very High';
  if (c >= 70) return 'High';
  if (c >= 50) return 'Moderate';
  if (c >= 30) return 'Low';
  return 'Very Low';
}

// Distinct hues for multi-species maps
export const SPECIES_COLORS = [
  '#e63946', '#2a9d8f', '#e9c46a', '#264653', '#f4a261',
  '#a8dadc', '#457b9d', '#6a4c93', '#ff6b6b', '#51cf66',
  '#339af0', '#f06595', '#fcc419', '#20c997', '#74c0fc',
  '#e599f7', '#a9e34b', '#63e6be', '#ff922b', '#9775fa',
];