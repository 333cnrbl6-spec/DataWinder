import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Loader2, Trash2, Flag, MapPin, ShieldAlert, ChevronDown, ChevronUp, Info, Map, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { detectOutliers, severityConfig, confidenceLabel, CRITERIA } from '@/lib/outlierDetection';
import OutlierMapPanel from './OutlierMapPanel';

// ─── Detection criteria reference ────────────────────────────────────────────
function DetectionCriteriaPanel() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-slate-700 transition-colors"
      >
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
            Confidence reflects the probability the record is genuinely erroneous. Always review medium/low confidence flags manually before removing.
          </p>
        </div>
      )}
    </div>
  );
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
        <motion.div
          className={`h-full rounded-full ${cfg.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OutlierDetectionModal({ species, open, onClose, onComplete }) {
  const [step, setStep]               = useState('scanning');
  const [results, setResults]         = useState(null);
  const [selected, setSelected]       = useState(new Set());
  const [processing, setProcessing]   = useState(false);
  const [completedAction, setCompletedAction] = useState(null); // 'flagged' | 'removed'
  const [completedCount, setCompletedCount]   = useState(0);
  const [activeTab, setActiveTab]     = useState('list'); // 'list' | 'map'
  const [highlightedIdx, setHighlightedIdx]   = useState(null);

  useEffect(() => {
    if (!open) return;
    setStep('scanning');
    setResults(null);
    setSelected(new Set());
    setActiveTab('list');
    setHighlightedIdx(null);
    const timer = setTimeout(() => {
      const r = detectOutliers(species);
      setResults(r);
      setSelected(new Set(r.flagged.map((_, i) => i)));
      setStep('results');
    }, 700);
    return () => clearTimeout(timer);
  }, [open, species]);

  const toggleItem = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleOutlierClick = (i) => {
    setHighlightedIdx(i);
    setActiveTab('list');
  };

  // Flag: mark observations with is_outlier:true without deleting
  const flagSelected = async () => {
    setProcessing(true);
    const toFlag = results.flagged.filter((_, i) => selected.has(i));
    const inatIdxs = new Set(toFlag.filter(f => f.source === 'iNaturalist').map(f => f.idx));
    const gbifIdxs = new Set(toFlag.filter(f => f.source === 'GBIF').map(f => f.idx));
    const patch = {};
    if (inatIdxs.size > 0 && species.observations?.length) {
      patch.observations = species.observations.map((obs, i) =>
        inatIdxs.has(i) ? { ...obs, is_outlier: true } : obs
      );
    }
    if (gbifIdxs.size > 0 && species.gbif_occurrences?.length) {
      patch.gbif_occurrences = species.gbif_occurrences.map((occ, i) =>
        gbifIdxs.has(i) ? { ...occ, is_outlier: true } : occ
      );
    }
    if (Object.keys(patch).length > 0) {
      await base44.entities.Species.update(species.id, patch);
    }
    setCompletedCount(toFlag.length);
    setCompletedAction('flagged');
    setProcessing(false);
    setStep('complete');
    onComplete?.();
  };

  // Remove: permanently delete observations
  const removeSelected = async () => {
    setProcessing(true);
    const toRemove = results.flagged.filter((_, i) => selected.has(i));
    const inatIdxs = new Set(toRemove.filter(f => f.source === 'iNaturalist').map(f => f.idx));
    const gbifIdxs = new Set(toRemove.filter(f => f.source === 'GBIF').map(f => f.idx));
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
    setCompletedCount(toRemove.length);
    setCompletedAction('removed');
    setProcessing(false);
    setStep('complete');
    onComplete?.();
  };

  const mapCleanPoints   = results?.cleanPoints?.filter(p => !isNaN(p.lat) && !isNaN(p.lng)) || [];
  const mapOutlierPoints = results?.flagged?.filter(p => !isNaN(p.lat) && !isNaN(p.lng)) || [];

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

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <AnimatePresence mode="wait">

            {/* Scanning */}
            {step === 'scanning' && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-14 space-y-4">
                <Loader2 className="w-8 h-8 text-bangor-red animate-spin" />
                <p className="font-medium text-slate-700">Scanning observation records…</p>
                <p className="text-xs text-slate-400">Coordinate validity · IQR statistics · duplicate detection</p>
              </motion.div>
            )}

            {/* Results */}
            {step === 'results' && results && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col flex-1 min-h-0 space-y-3 py-1">

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3 shrink-0">
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
                    {/* List / Map tab switcher */}
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden shrink-0">
                      <button
                        onClick={() => setActiveTab('list')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-colors ${activeTab === 'list' ? 'bg-bangor-red text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <List className="w-4 h-4" /> List
                      </button>
                      <button
                        onClick={() => setActiveTab('map')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-colors ${activeTab === 'map' ? 'bg-bangor-red text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <Map className="w-4 h-4" /> Map View
                        {mapOutlierPoints.length > 0 && (
                          <Badge className="bg-red-500 text-white text-xs ml-1 px-1.5 py-0">{mapOutlierPoints.length}</Badge>
                        )}
                      </button>
                    </div>

                    {/* List tab */}
                    {activeTab === 'list' && (
                      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
                        <DetectionCriteriaPanel />

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 shrink-0">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-900">
                              {results.flagged.length} observation{results.flagged.length !== 1 ? 's' : ''} flagged
                            </p>
                            <p className="text-xs text-amber-700 mt-0.5">
                              <strong>Flag</strong> to mark without deleting (excluded in Data Prep exports) ·
                              <strong> Remove</strong> to permanently delete.
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0 text-xs">
                            <button onClick={() => setSelected(new Set(results.flagged.map((_, i) => i)))} className="text-bangor-red font-semibold hover:underline">All</button>
                            <span className="text-slate-300">|</span>
                            <button onClick={() => setSelected(new Set())} className="text-slate-500 hover:underline">None</button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {results.flagged.map((obs, i) => {
                            const cfg = severityConfig[obs.severity];
                            const isChecked = selected.has(i);
                            const isHighlighted = highlightedIdx === i;
                            return (
                              <div
                                key={i}
                                onClick={() => { toggleItem(i); setHighlightedIdx(i); }}
                                className={`rounded-lg border p-3 cursor-pointer transition-all ${cfg.card} ${isChecked ? 'ring-2 ring-bangor-red/30' : 'opacity-60'} ${isHighlighted ? 'ring-2 ring-bangor-sun' : ''}`}
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => { toggleItem(i); setHighlightedIdx(i); }}
                                    onClick={e => e.stopPropagation()}
                                    className="mt-0.5 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                                        {obs.severity.toUpperCase()}
                                      </span>
                                      <span className="text-xs font-semibold text-slate-600">{obs.source}</span>
                                      {obs.isFlagged && (
                                        <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">Previously flagged</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm font-medium text-slate-800">{obs.reason}</p>
                                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                                      <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {isNaN(obs.lat) ? 'N/A' : obs.lat.toFixed(5)}°, {isNaN(obs.lng) ? 'N/A' : obs.lng.toFixed(5)}°
                                      </span>
                                      {obs.date && <span>📅 {obs.date}</span>}
                                      {obs.location && <span className="truncate max-w-[180px]">📍 {obs.location}</span>}
                                    </div>
                                    <ConfidenceBar confidence={obs.confidence} severity={obs.severity} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Map tab */}
                    {activeTab === 'map' && (
                      <div className="flex-1 min-h-0 relative" style={{ minHeight: '380px' }}>
                        <div className="absolute inset-0 rounded-lg overflow-hidden">
                          <OutlierMapPanel
                            cleanPoints={mapCleanPoints}
                            outlierPoints={mapOutlierPoints}
                            highlightedIdx={highlightedIdx}
                            onOutlierClick={handleOutlierClick}
                            singleColor="#22c55e"
                          />
                        </div>
                        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 p-2.5 text-xs space-y-1.5 shadow z-[1000]">
                          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-400 opacity-60"/><span className="text-slate-600">Clean</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border-2 border-white" style={{ background: '#ef4444' }}/><span className="text-slate-600">High confidence</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border-2 border-white" style={{ background: '#f59e0b' }}/><span className="text-slate-600">Medium confidence</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border-2 border-white" style={{ background: '#60a5fa' }}/><span className="text-slate-600">Low confidence</span></div>
                          <p className="text-slate-400 italic">Size = error confidence · Click to highlight</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* Complete */}
            {step === 'complete' && (
              <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-14 space-y-4 text-center px-4">
                {completedAction === 'flagged' ? (
                  <>
                    <Flag className="w-10 h-10 text-amber-500" />
                    <p className="font-semibold text-slate-900">Flagged as outliers</p>
                    <p className="text-sm text-slate-600">
                      {completedCount} observation{completedCount !== 1 ? 's' : ''} marked with <code className="bg-slate-100 px-1 rounded text-xs">is_outlier: true</code> on <em>{species?.scientific_name}</em>.
                      These will be excluded from exports in the Data Preparation Hub when outlier filtering is enabled.
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-10 h-10 text-green-600" />
                    <p className="font-semibold text-slate-900">Removal complete</p>
                    <p className="text-sm text-slate-600">
                      {completedCount} observation{completedCount !== 1 ? 's' : ''} permanently removed from <em>{species?.scientific_name}</em>.
                    </p>
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-4 border-t shrink-0">
          {step === 'scanning' && (
            <Button disabled className="flex-1 bg-slate-200 text-slate-600">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning…
            </Button>
          )}
          {step === 'results' && (
            <>
              <Button onClick={onClose} variant="outline">Close</Button>
              {results?.flagged?.length > 0 && (
                <>
                  <Button
                    onClick={flagSelected}
                    disabled={processing || selected.size === 0}
                    variant="outline"
                    className="flex-1 border-amber-400 text-amber-700 hover:bg-amber-50"
                  >
                    {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Flag className="w-4 h-4 mr-2" />}
                    Flag {selected.size} for Exclusion
                  </Button>
                  <Button
                    onClick={removeSelected}
                    disabled={processing || selected.size === 0}
                    className="flex-1 bg-bangor-red text-white font-semibold"
                  >
                    {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Remove {selected.size} Permanently
                  </Button>
                </>
              )}
            </>
          )}
          {step === 'complete' && (
            <Button onClick={onClose} className="flex-1 bg-bangor-red text-white font-semibold">
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}