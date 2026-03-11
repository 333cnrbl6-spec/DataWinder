import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Loader2, Trash2, MapPin, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Outlier detection (pure function, runs client-side) ────────────────────
function detectOutliers(species) {
  const observations = [];

  // Normalise iNaturalist observations
  (species.observations || []).forEach((obs, idx) => {
    observations.push({
      idx,
      source: 'iNaturalist',
      lat: parseFloat(obs.latitude),
      lng: parseFloat(obs.longitude),
      date: obs.observed_on,
      location: obs.location,
      observer: obs.user,
    });
  });

  // Normalise GBIF occurrences
  (species.gbif_occurrences || []).forEach((occ, idx) => {
    observations.push({
      idx,
      source: 'GBIF',
      lat: parseFloat(occ.decimalLatitude),
      lng: parseFloat(occ.decimalLongitude),
      date: occ.eventDate,
      location: occ.locality || occ.stateProvince || occ.country,
    });
  });

  const flagged = [];
  const flaggedKeys = new Set();

  const flag = (obs, reason, severity) => {
    const key = `${obs.source}_${obs.idx}`;
    if (!flaggedKeys.has(key)) {
      flaggedKeys.add(key);
      flagged.push({ ...obs, reason, severity });
    }
  };

  // ── Check 1: Invalid / missing coordinates ──────────────────────────────
  observations.forEach(obs => {
    if (isNaN(obs.lat) || isNaN(obs.lng)) {
      flag(obs, 'Missing or unparseable coordinates', 'high');
    } else if (obs.lat === 0 && obs.lng === 0) {
      flag(obs, 'Null Island (0°, 0°) — likely a data entry or geocoding error', 'high');
    } else if (obs.lat < -90 || obs.lat > 90 || obs.lng < -180 || obs.lng > 180) {
      flag(obs, 'Coordinates outside valid geographic bounds', 'high');
    }
  });

  // ── Statistics on clean subset ──────────────────────────────────────────
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

    // ── Check 2: IQR statistical outliers ────────────────────────────────
    clean.forEach(obs => {
      const latOut = iqrLat > 0 && (obs.lat < q1Lat - 1.5 * iqrLat || obs.lat > q3Lat + 1.5 * iqrLat);
      const lngOut = iqrLng > 0 && (obs.lng < q1Lng - 1.5 * iqrLng || obs.lng > q3Lng + 1.5 * iqrLng);
      if (latOut || lngOut) {
        const axis = [latOut && 'latitude', lngOut && 'longitude'].filter(Boolean).join(' & ');
        flag(obs, `Statistical outlier — ${axis} outside IQR ×1.5 fence`, 'medium');
      }
    });

    // ── Check 3: Duplicate coordinates ───────────────────────────────────
    const coordMap = {};
    clean.forEach(obs => {
      const k = `${obs.lat.toFixed(4)},${obs.lng.toFixed(4)}`;
      if (!coordMap[k]) coordMap[k] = [];
      coordMap[k].push(obs);
    });
    Object.values(coordMap).forEach(group => {
      if (group.length > 1) {
        group.slice(1).forEach(obs =>
          flag(obs, 'Duplicate coordinates — exact location match with another record', 'low')
        );
      }
    });
  }

  return { total: observations.length, flagged, clean: observations.length - flagged.length };
}

// ─── Severity badge styling ─────────────────────────────────────────────────
const severityConfig = {
  high:   { card: 'bg-red-50 border-red-200',    badge: 'bg-red-500 text-white' },
  medium: { card: 'bg-amber-50 border-amber-200', badge: 'bg-amber-500 text-white' },
  low:    { card: 'bg-blue-50 border-blue-200',   badge: 'bg-blue-400 text-white' },
};

// ─── Main component ─────────────────────────────────────────────────────────
export default function OutlierDetectionModal({ species, open, onClose, onComplete }) {
  const [step, setStep] = useState('scanning');
  const [results, setResults] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('scanning');
    setResults(null);
    const timer = setTimeout(() => {
      const r = detectOutliers(species);
      setResults(r);
      setStep('results');
    }, 700);
    return () => clearTimeout(timer);
  }, [open, species]);

  const removeOutliers = async () => {
    setRemoving(true);
    const inatIdxs = new Set(results.flagged.filter(f => f.source === 'iNaturalist').map(f => f.idx));
    const gbifIdxs = new Set(results.flagged.filter(f => f.source === 'GBIF').map(f => f.idx));

    const patch = {};
    if (inatIdxs.size > 0 && species.observations?.length) {
      patch.observations = species.observations.filter((_, i) => !inatIdxs.has(i));
    }
    if (gbifIdxs.size > 0 && species.gbif_occurrences?.length) {
      patch.gbif_occurrences = species.gbif_occurrences.filter((_, i) => !gbifIdxs.has(i));
    }

    if (Object.keys(patch).length > 0) {
      await base44.entities.Species.update(species.id, patch);
    }
    setRemoving(false);
    setStep('complete');
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-bangor-red flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Observation Outlier Detection
          </DialogTitle>
          <p className="text-sm italic text-slate-500">{species?.scientific_name}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <AnimatePresence mode="wait">

            {/* Scanning */}
            {step === 'scanning' && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-14 space-y-4">
                <Loader2 className="w-8 h-8 text-bangor-red animate-spin" />
                <p className="font-medium text-slate-700">Scanning observation records…</p>
                <p className="text-xs text-slate-400">Running coordinate validity · IQR statistics · duplicate detection</p>
              </motion.div>
            )}

            {/* Results */}
            {step === 'results' && results && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-4 py-2">

                {/* Summary tiles */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-slate-800">{results.total}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Total Observations</div>
                  </div>
                  <div className={`border rounded-lg p-3 text-center ${results.flagged.length > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className={`text-2xl font-bold ${results.flagged.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {results.flagged.length}
                    </div>
                    <div className={`text-xs mt-0.5 ${results.flagged.length > 0 ? 'text-red-500' : 'text-green-500'}`}>Flagged</div>
                  </div>
                  <div className="bg-green-50 border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">{results.clean}</div>
                    <div className="text-xs text-green-500 mt-0.5">Clean Records</div>
                  </div>
                </div>

                {results.flagged.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex flex-col items-center gap-3 text-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                    <p className="font-semibold text-green-900">All observations look clean!</p>
                    <p className="text-sm text-green-700">No invalid coordinates, statistical outliers, or duplicates were detected.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">{results.flagged.length} observations flagged</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Review below. Click <strong>Remove Flagged</strong> to clean the dataset, or close to keep all records.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {results.flagged.map((obs, i) => {
                        const cfg = severityConfig[obs.severity];
                        return (
                          <div key={i} className={`rounded-lg border p-3 ${cfg.card}`}>
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                                    {obs.severity.toUpperCase()}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-600">{obs.source}</span>
                                </div>
                                <p className="text-sm font-medium text-slate-800">{obs.reason}</p>
                                <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {isNaN(obs.lat) ? 'N/A' : obs.lat.toFixed(5)}°,&nbsp;
                                    {isNaN(obs.lng) ? 'N/A' : obs.lng.toFixed(5)}°
                                  </span>
                                  {obs.date && <span>📅 {obs.date}</span>}
                                  {obs.location && <span className="truncate max-w-[180px]">📍 {obs.location}</span>}
                                </div>
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

            {/* Complete */}
            {step === 'complete' && (
              <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-14 space-y-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
                <p className="font-semibold text-slate-900">Outlier removal complete</p>
                <p className="text-sm text-slate-600">
                  {results?.flagged?.length} observation{results?.flagged?.length !== 1 ? 's' : ''} removed from {species?.scientific_name}
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Actions footer */}
        <div className="flex gap-3 pt-4 border-t">
          {step === 'scanning' && (
            <Button disabled className="flex-1 bg-slate-200 text-slate-600 border-slate-300">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning…
            </Button>
          )}
          {step === 'results' && (
            <>
              <Button onClick={onClose} variant="outline" className="flex-1">Close</Button>
              {results?.flagged?.length > 0 && (
                <Button
                  onClick={removeOutliers}
                  disabled={removing}
                  className="flex-1 bg-bangor-red text-white font-semibold"
                >
                  {removing
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Removing…</>
                    : <><Trash2 className="w-4 h-4 mr-2" /> Remove {results.flagged.length} Flagged</>
                  }
                </Button>
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