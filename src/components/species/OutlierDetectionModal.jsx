import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle, Loader2, Trash2, MapPin, ShieldAlert,
         ChevronDown, ChevronUp, Info, Map, List, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Detection criteria ───────────────────────────────────────────────────────
const CRITERIA = [
  {
    label: 'Check 1 — Invalid / Missing Coordinates',
    severity: 'HIGH', confidence: '96–98%',
    color: 'bg-red-100 border-red-300 text-red-900', badge: 'bg-red-500 text-white',
    rules: [
      'NaN or unparseable lat/lng values → flagged as missing coordinates.',
      'Exact (0°, 0°) — "Null Island" — almost always a geocoding or default-value error.',
      'Values outside −90/+90 (lat) or −180/+180 (lng) are physically impossible.',
    ],
  },
  {
    label: 'Check 2 — IQR Statistical Outliers',
    severity: 'MEDIUM', confidence: '55–82%',
    color: 'bg-amber-100 border-amber-300 text-amber-900', badge: 'bg-amber-500 text-white',
    rules: [
      'Only applied when ≥ 5 clean records are available.',
      'IQR fence: Q1 − 1.5×IQR … Q3 + 1.5×IQR (Tukey method).',
      'Points outside the fence on both axes score higher (~82%) than single-axis outliers (~55–78%).',
      'Confidence scales with distance beyond the fence — farther = more likely erroneous.',
    ],
  },
  {
    label: 'Check 3 — Duplicate Coordinates',
    severity: 'LOW', confidence: '~35%',
    color: 'bg-blue-100 border-blue-300 text-blue-900', badge: 'bg-blue-400 text-white',
    rules: [
      'Coordinates rounded to 4 decimal places (~11 m precision) are compared.',
      'If two or more records share the same rounded location, all but the first are flagged.',
      'Low confidence — repeated valid sightings at the same site are common; review manually.',
    ],
  },
];

function DetectionCriteriaPanel() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-slate-700 transition-colors">
        <span className="flex items-center gap-2"><Info className="w-4 h-4 text-slate-400" /> Detection Criteria</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="p-3 space-y-3 bg-white">
          {CRITERIA.map((c, i) => (
            <div key={i} className={`rounded-lg border p-3 ${c.color}`}>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.badge}`}>{c.severity}</span>
                <span className="text-xs font-bold">{c.label}</span>
                <span className="text-xs ml-auto opacity-70">Confidence: {c.confidence}</span>
              </div>
              <ul className="mt-1 space-y-0.5 list-disc list-inside text-xs opacity-80">
                {c.rules.map((r, j) => <li key={j}>{r}</li>)}
              </ul>
            </div>
          ))}
          <p className="text-xs text-slate-400 italic">
            Confidence reflects the probability the record is genuinely erroneous. Always review medium and low confidence flags manually.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Confidence scoring ───────────────────────────────────────────────────────
function scoreConfidence(check, extraData = {}) {
  switch (check) {
    case 'null_coords': return 98;
    case 'null_island': return 96;
    case 'bounds':      return 97;
    case 'iqr_both':    return 82;
    case 'iqr_one': {
      const { distance } = extraData;
      return Math.min(78, 55 + Math.round((distance || 0) * 5));
    }
    case 'duplicate':   return 35;
    default:            return 50;
  }
}

// ─── Outlier detection ────────────────────────────────────────────────────────
function detectOutliers(species) {
  const observations = [];
  (species.observations || []).forEach((obs, idx) => {
    observations.push({ idx, source: 'iNaturalist', lat: parseFloat(obs.latitude), lng: parseFloat(obs.longitude), date: obs.observed_on, location: obs.location, observer: obs.user });
  });
  (species.gbif_occurrences || []).forEach((occ, idx) => {
    observations.push({ idx, source: 'GBIF', lat: parseFloat(occ.decimalLatitude), lng: parseFloat(occ.decimalLongitude), date: occ.eventDate, location: occ.locality || occ.stateProvince || occ.country });
  });

  const flagged = [];
  const flaggedKeys = new Set();
  const flag = (obs, reason, severity, checkType, extraData) => {
    const key = `${obs.source}_${obs.idx}`;
    if (flaggedKeys.has(key)) return;
    flaggedKeys.add(key);
    flagged.push({ ...obs, reason, severity, confidence: scoreConfidence(checkType, extraData) });
  };

  observations.forEach(obs => {
    if (isNaN(obs.lat) || isNaN(obs.lng)) flag(obs, 'Missing or unparseable coordinates', 'high', 'null_coords');
    else if (obs.lat === 0 && obs.lng === 0) flag(obs, 'Null Island (0°, 0°) — likely a geocoding or data-entry error', 'high', 'null_island');
    else if (obs.lat < -90 || obs.lat > 90 || obs.lng < -180 || obs.lng > 180) flag(obs, 'Coordinates outside valid geographic bounds', 'high', 'bounds');
  });

  const clean = observations.filter(o => !flaggedKeys.has(`${o.source}_${o.idx}`));

  if (clean.length > 4) {
    const lats = clean.map(o => o.lat).sort((a, b) => a - b);
    const lngs = clean.map(o => o.lng).sort((a, b) => a - b);
    const q1Lat = lats[Math.floor(lats.length * 0.25)], q3Lat = lats[Math.floor(lats.length * 0.75)];
    const iqrLat = q3Lat - q1Lat;
    const q1Lng = lngs[Math.floor(lngs.length * 0.25)], q3Lng = lngs[Math.floor(lngs.length * 0.75)];
    const iqrLng = q3Lng - q1Lng;

    clean.forEach(obs => {
      const latLow = q1Lat - 1.5 * iqrLat, latHigh = q3Lat + 1.5 * iqrLat;
      const lngLow = q1Lng - 1.5 * iqrLng, lngHigh = q3Lng + 1.5 * iqrLng;
      const latOut = iqrLat > 0 && (obs.lat < latLow || obs.lat > latHigh);
      const lngOut = iqrLng > 0 && (obs.lng < lngLow || obs.lng > lngHigh);
      if (latOut && lngOut) flag(obs, 'Statistical outlier — latitude & longitude outside IQR ×1.5 fence', 'medium', 'iqr_both');
      else if (latOut) { const dist = obs.lat < latLow ? (latLow - obs.lat) / iqrLat : (obs.lat - latHigh) / iqrLat; flag(obs, 'Statistical outlier — latitude outside IQR ×1.5 fence', 'medium', 'iqr_one', { distance: dist }); }
      else if (lngOut) { const dist = obs.lng < lngLow ? (lngLow - obs.lng) / iqrLng : (obs.lng - lngHigh) / iqrLng; flag(obs, 'Statistical outlier — longitude outside IQR ×1.5 fence', 'medium', 'iqr_one', { distance: dist }); }
    });

    const coordMap = {};
    clean.forEach(obs => {
      if (flaggedKeys.has(`${obs.source}_${obs.idx}`)) return;
      const k = `${obs.lat.toFixed(4)},${obs.lng.toFixed(4)}`;
      if (!coordMap[k]) coordMap[k] = [];
      coordMap[k].push(obs);
    });
    Object.values(coordMap).forEach(group => {
      if (group.length > 1) group.slice(1).forEach(obs => flag(obs, 'Duplicate coordinates — exact location matches another record', 'low', 'duplicate'));
    });
  }

  return { all: observations, flagged, clean, cleanCount: observations.length - flagged.length, total: observations.length };
}

// ─── Map symbology ────────────────────────────────────────────────────────────
const SEV_COLOUR = { high: '#ef4444', medium: '#f59e0b', low: '#60a5fa' };

function MapFitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter(p => !isNaN(p.lat) && !isNaN(p.lng));
    if (valid.length === 0) return;
    const lats = valid.map(p => p.lat), lngs = valid.map(p => p.lng);
    map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [40, 40] });
  }, [points, map]);
  return null;
}

function OutlierMap({ results, selected, hoveredIdx, onHover, onToggle }) {
  const cleanPoints = (results.clean || []).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
  const allPoints = [...cleanPoints, ...results.flagged.filter(p => !isNaN(p.lat) && !isNaN(p.lng))];

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200" style={{ height: 380 }}>
      <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap contributors'
        />
        <MapFitBounds points={allPoints} />

        {/* Clean points */}
        {cleanPoints.map((pt, i) => (
          <CircleMarker
            key={`clean-${i}`}
            center={[pt.lat, pt.lng]}
            radius={4}
            pathOptions={{ fillColor: '#22c55e', fillOpacity: 0.55, color: '#16a34a', weight: 1 }}
          >
            <Popup>
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-green-700">✓ Clean</p>
                <p>{pt.source} · {pt.date || 'no date'}</p>
                <p>{pt.lat.toFixed(5)}°, {pt.lng.toFixed(5)}°</p>
                {pt.location && <p className="text-slate-500">{pt.location}</p>}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Outlier points */}
        {results.flagged.filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng)).map((pt, i) => {
          const isChecked = selected.has(i);
          const colour = SEV_COLOUR[pt.severity];
          const radius = 5 + Math.round((pt.confidence / 100) * 8); // 5–13 based on confidence
          return (
            <CircleMarker
              key={`flag-${i}`}
              center={[pt.lat, pt.lng]}
              radius={radius}
              pathOptions={{
                fillColor: colour,
                fillOpacity: isChecked ? 0.85 : 0.3,
                color: hoveredIdx === i ? '#1e293b' : colour,
                weight: hoveredIdx === i ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onToggle(i),
                mouseover: () => onHover(i),
                mouseout:  () => onHover(null),
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 min-w-[180px]">
                  <p className="font-semibold" style={{ color: colour }}>⚠ {pt.severity.toUpperCase()} — {pt.confidence}% confidence</p>
                  <p className="text-slate-700">{pt.reason}</p>
                  <p className="text-slate-500">{pt.source} · {pt.date || 'no date'}</p>
                  <p>{pt.lat.toFixed(5)}°, {pt.lng.toFixed(5)}°</p>
                  {pt.location && <p className="text-slate-400">{pt.location}</p>}
                  <p className="text-slate-400 italic mt-1">{isChecked ? 'Click to deselect' : 'Click to select for action'}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Map legend */}
      <div className="flex flex-wrap gap-3 px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block opacity-60" />Clean</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />High severity</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />Medium severity</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />Low severity</span>
        <span className="text-slate-400 ml-auto italic">Marker size = confidence level</span>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const severityConfig = {
  high:   { card: 'border-red-200 bg-red-50',    badge: 'bg-red-500 text-white',    bar: 'bg-red-500' },
  medium: { card: 'border-amber-200 bg-amber-50', badge: 'bg-amber-500 text-white',  bar: 'bg-amber-500' },
  low:    { card: 'border-blue-200 bg-blue-50',   badge: 'bg-blue-400 text-white',   bar: 'bg-blue-400' },
};

function confidenceLabel(c) {
  if (c >= 90) return 'Very High';
  if (c >= 70) return 'High';
  if (c >= 50) return 'Moderate';
  if (c >= 30) return 'Low';
  return 'Very Low';
}

function ConfidenceBar({ confidence, severity }) {
  const cfg = severityConfig[severity];
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500 font-medium">Error confidence</span>
        <span className="text-xs font-bold text-slate-700">{confidence}% — {confidenceLabel(confidence)}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
        <motion.div className={`h-full rounded-full ${cfg.bar}`}
          initial={{ width: 0 }} animate={{ width: `${confidence}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OutlierDetectionModal({ species, open, onClose, onComplete }) {
  const [step, setStep]         = useState('scanning');
  const [results, setResults]   = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [removing, setRemoving] = useState(false);
  const [removedCount, setRemovedCount] = useState(0);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const cardRefs = useRef({});

  useEffect(() => {
    if (!open) return;
    setStep('scanning');
    setResults(null);
    setSelected(new Set());
    setViewMode('list');
    const timer = setTimeout(() => {
      const r = detectOutliers(species);
      setResults(r);
      setSelected(new Set(r.flagged.map((_, i) => i)));
      setStep('results');
    }, 700);
    return () => clearTimeout(timer);
  }, [open, species]);

  const toggleItem = (i) => setSelected(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const selectAll  = () => setSelected(new Set(results.flagged.map((_, i) => i)));
  const selectNone = () => setSelected(new Set());

  const handleHover = (i) => {
    setHoveredIdx(i);
    if (i !== null && cardRefs.current[i]) {
      cardRefs.current[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const removeSelected = async () => {
    setRemoving(true);
    const toRemove = results.flagged.filter((_, i) => selected.has(i));
    const inatIdxs = new Set(toRemove.filter(f => f.source === 'iNaturalist').map(f => f.idx));
    const gbifIdxs = new Set(toRemove.filter(f => f.source === 'GBIF').map(f => f.idx));
    const patch = {};
    if (inatIdxs.size > 0 && species.observations?.length) patch.observations = species.observations.filter((_, i) => !inatIdxs.has(i));
    if (gbifIdxs.size > 0 && species.gbif_occurrences?.length) patch.gbif_occurrences = species.gbif_occurrences.filter((_, i) => !gbifIdxs.has(i));
    if (Object.keys(patch).length > 0) await base44.entities.Species.update(species.id, patch);
    setRemovedCount(toRemove.length);
    setRemoving(false);
    setStep('complete');
    onComplete?.();
  };

  const flagSelected = async () => {
    setRemoving(true);
    const toFlag = results.flagged.filter((_, i) => selected.has(i));
    const inatIdxs = new Set(toFlag.filter(f => f.source === 'iNaturalist').map(f => f.idx));
    const gbifIdxs = new Set(toFlag.filter(f => f.source === 'GBIF').map(f => f.idx));
    const patch = {};
    if (inatIdxs.size > 0 && species.observations?.length) {
      patch.observations = species.observations.map((obs, i) =>
        inatIdxs.has(i) ? { ...obs, flagged_outlier: true } : obs
      );
    }
    if (gbifIdxs.size > 0 && species.gbif_occurrences?.length) {
      patch.gbif_occurrences = species.gbif_occurrences.map((occ, i) =>
        gbifIdxs.has(i) ? { ...occ, flagged_outlier: true } : occ
      );
    }
    if (Object.keys(patch).length > 0) await base44.entities.Species.update(species.id, patch);
    setRemovedCount(toFlag.length);
    setRemoving(false);
    setStep('complete');
    onComplete?.();
  };

  const hasMapData = results?.flagged.some(p => !isNaN(p.lat) && !isNaN(p.lng)) ||
                     results?.clean?.some(p => !isNaN(p.lat) && !isNaN(p.lng));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-bangor-red flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Observation Outlier Detection
          </DialogTitle>
          <p className="text-sm italic text-slate-500">{species?.scientific_name}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          <AnimatePresence mode="wait">

            {step === 'scanning' && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-14 space-y-4">
                <Loader2 className="w-8 h-8 text-bangor-red animate-spin" />
                <p className="font-medium text-slate-700">Scanning observation records…</p>
                <p className="text-xs text-slate-400">Coordinate validity · IQR statistics · duplicate detection</p>
              </motion.div>
            )}

            {step === 'results' && results && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-4 py-2">

                <DetectionCriteriaPanel />

                {/* Summary tiles */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-slate-800">{results.total}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Total Observations</div>
                  </div>
                  <div className={`border rounded-lg p-3 text-center ${results.flagged.length > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className={`text-2xl font-bold ${results.flagged.length > 0 ? 'text-red-700' : 'text-green-700'}`}>{results.flagged.length}</div>
                    <div className={`text-xs mt-0.5 ${results.flagged.length > 0 ? 'text-red-500' : 'text-green-500'}`}>Flagged</div>
                  </div>
                  <div className="bg-green-50 border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">{results.cleanCount}</div>
                    <div className="text-xs text-green-500 mt-0.5">Clean Records</div>
                  </div>
                </div>

                {results.flagged.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex flex-col items-center gap-3 text-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                    <p className="font-semibold text-green-900">All observations look clean!</p>
                    <p className="text-sm text-green-700">No coordinate errors, statistical outliers, or duplicates detected.</p>
                  </div>
                ) : (
                  <>
                    {/* View mode toggle */}
                    {hasMapData && (
                      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                        <button onClick={() => setViewMode('list')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-white shadow text-bangor-red' : 'text-slate-500 hover:text-slate-700'}`}>
                          <List className="w-3.5 h-3.5" /> List
                        </button>
                        <button onClick={() => setViewMode('map')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'map' ? 'bg-white shadow text-bangor-red' : 'text-slate-500 hover:text-slate-700'}`}>
                          <Map className="w-3.5 h-3.5" /> Map View
                        </button>
                      </div>
                    )}

                    {/* Header bar */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900">
                          {results.flagged.length} observation{results.flagged.length !== 1 ? 's' : ''} flagged
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Review each item, then choose to <strong>Remove</strong> (delete permanently) or <strong>Flag</strong> (mark as outlier, keeps the raw data for reference).
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0 text-xs">
                        <button onClick={selectAll}  className="text-bangor-red font-semibold hover:underline">All</button>
                        <span className="text-slate-300">|</span>
                        <button onClick={selectNone} className="text-slate-500 hover:underline">None</button>
                      </div>
                    </div>

                    {/* Map view */}
                    {viewMode === 'map' && (
                      <OutlierMap
                        results={results}
                        selected={selected}
                        hoveredIdx={hoveredIdx}
                        onHover={handleHover}
                        onToggle={toggleItem}
                      />
                    )}

                    {/* List view (always rendered but hidden when map is shown, so refs stay valid) */}
                    <div className={viewMode === 'map' ? 'hidden' : 'space-y-2'}>
                      {results.flagged.map((obs, i) => {
                        const cfg = severityConfig[obs.severity];
                        const isChecked = selected.has(i);
                        const isHovered = hoveredIdx === i;
                        return (
                          <div key={i} ref={el => cardRefs.current[i] = el}
                            onClick={() => toggleItem(i)}
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                            className={`rounded-lg border p-3 cursor-pointer transition-all ${cfg.card} ${isChecked ? 'ring-2 ring-bangor-red/30' : 'opacity-60'} ${isHovered ? 'ring-2 ring-slate-400/50 opacity-100' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox checked={isChecked} onCheckedChange={() => toggleItem(i)} onClick={e => e.stopPropagation()} className="mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>{obs.severity.toUpperCase()}</span>
                                  <span className="text-xs font-semibold text-slate-600">{obs.source}</span>
                                  <span className="text-xs text-slate-400 ml-auto">{obs.confidence}% confidence</span>
                                </div>
                                <p className="text-sm font-medium text-slate-800">{obs.reason}</p>
                                <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {isNaN(obs.lat) ? 'N/A' : obs.lat.toFixed(5)}°, {isNaN(obs.lng) ? 'N/A' : obs.lng.toFixed(5)}°
                                  </span>
                                  {obs.date     && <span>📅 {obs.date}</span>}
                                  {obs.location && <span className="truncate max-w-[180px]">📍 {obs.location}</span>}
                                </div>
                                <ConfidenceBar confidence={obs.confidence} severity={obs.severity} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {step === 'complete' && (
              <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-14 space-y-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
                <p className="font-semibold text-slate-900">Done</p>
                <p className="text-sm text-slate-600">
                  {removedCount} observation{removedCount !== 1 ? 's' : ''} processed for <em>{species?.scientific_name}</em>
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-4 border-t shrink-0 flex-wrap">
          {step === 'scanning' && (
            <Button disabled className="flex-1 bg-slate-200 text-slate-600 border-slate-300">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning…
            </Button>
          )}
          {step === 'results' && (
            <>
              <Button onClick={onClose} variant="outline" className="flex-1">Close</Button>
              {results?.flagged?.length > 0 && (
                <>
                  <Button
                    onClick={flagSelected}
                    disabled={removing || selected.size === 0}
                    variant="outline"
                    className="flex-1 border-amber-400 text-amber-700 hover:bg-amber-50"
                  >
                    {removing
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Working…</>
                      : <><Flag className="w-4 h-4 mr-2" />Flag {selected.size} as Outlier</>
                    }
                  </Button>
                  <Button
                    onClick={removeSelected}
                    disabled={removing || selected.size === 0}
                    className="flex-1 bg-bangor-red text-white font-semibold"
                  >
                    {removing
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Removing…</>
                      : <><Trash2 className="w-4 h-4 mr-2" />Remove {selected.size}</>
                    }
                  </Button>
                </>
              )}
            </>
          )}
          {step === 'complete' && (
            <Button onClick={onClose} className="flex-1 bg-bangor-red text-white font-semibold">
              <CheckCircle className="w-4 h-4 mr-2" /> Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}