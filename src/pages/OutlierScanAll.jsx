import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Loader2, ArrowLeft, Trash2, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import OutlierMapPanel from '@/components/species/OutlierMapPanel';
import { detectOutliers, severityConfig, SPECIES_COLORS } from '@/components/outlierDetection';

const MAX_CLEAN_PER_SPECIES = 80;

function sampleArray(arr, max) {
  if (arr.length <= max) return arr;
  const step = Math.ceil(arr.length / max);
  return arr.filter((_, i) => i % step === 0).slice(0, max);
}

export default function OutlierScanAll() {
  const queryClient = useQueryClient();
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null);
  const [expandedSpeciesId, setExpandedSpeciesId] = useState(null);
  const [actioning, setActioning] = useState(null);

  const { data: allSpecies = [], isLoading } = useQuery({
    queryKey: ['allSpeciesOutlierScan'],
    queryFn: () => base44.entities.Species.list('-created_date', 10000),
  });

  const speciesWithObs = useMemo(() =>
    allSpecies.filter(sp => (sp.observations?.length || 0) + (sp.gbif_occurrences?.length || 0) > 0),
    [allSpecies]
  );

  const scanResults = useMemo(() =>
    speciesWithObs.map((sp, si) => ({
      species: sp,
      color: SPECIES_COLORS[si % SPECIES_COLORS.length],
      ...detectOutliers(sp),
    })),
    [speciesWithObs]
  );

  const stats = useMemo(() => {
    const totalObs      = scanResults.reduce((s, r) => s + r.total, 0);
    const totalFlagged  = scanResults.reduce((s, r) => s + r.flagged.length, 0);
    const withIssues    = scanResults.filter(r => r.flagged.length > 0).length;
    const byHigh        = scanResults.reduce((s, r) => s + r.flagged.filter(f => f.severity === 'high').length, 0);
    const byMed         = scanResults.reduce((s, r) => s + r.flagged.filter(f => f.severity === 'medium').length, 0);
    const byLow         = scanResults.reduce((s, r) => s + r.flagged.filter(f => f.severity === 'low').length, 0);
    return { totalObs, totalFlagged, withIssues, byHigh, byMed, byLow };
  }, [scanResults]);

  const { mapCleanPoints, mapOutlierPoints } = useMemo(() => {
    const filtered = selectedSpeciesId
      ? scanResults.filter(r => r.species.id === selectedSpeciesId)
      : scanResults;

    const cleanPoints = filtered.flatMap(r =>
      sampleArray(r.cleanPoints.filter(p => !isNaN(p.lat) && !isNaN(p.lng)), MAX_CLEAN_PER_SPECIES)
        .map(p => ({ ...p, color: r.color, speciesName: r.species.scientific_name }))
    );

    const outlierPoints = filtered.flatMap(r =>
      r.flagged.filter(p => !isNaN(p.lat) && !isNaN(p.lng)).map(p => ({
        ...p,
        speciesColor: r.color,
        speciesName: r.species.scientific_name,
        speciesId: r.species.id,
      }))
    );

    return { mapCleanPoints: cleanPoints, mapOutlierPoints: outlierPoints };
  }, [scanResults, selectedSpeciesId]);

  const handleFlag = async (speciesId, source, idx) => {
    const key = `${speciesId}-${source}-${idx}`;
    setActioning(key);
    const sp = allSpecies.find(s => s.id === speciesId);
    if (!sp) { setActioning(null); return; }
    const patch = {};
    if (source === 'iNaturalist' && sp.observations) {
      patch.observations = sp.observations.map((obs, i) => i === idx ? { ...obs, is_outlier: true } : obs);
    } else if (source === 'GBIF' && sp.gbif_occurrences) {
      patch.gbif_occurrences = sp.gbif_occurrences.map((occ, i) => i === idx ? { ...occ, is_outlier: true } : occ);
    }
    if (Object.keys(patch).length > 0) await base44.entities.Species.update(speciesId, patch);
    queryClient.invalidateQueries({ queryKey: ['allSpeciesOutlierScan'] });
    setActioning(null);
  };

  const handleRemove = async (speciesId, source, idx) => {
    const key = `${speciesId}-${source}-${idx}`;
    setActioning(key);
    const sp = allSpecies.find(s => s.id === speciesId);
    if (!sp) { setActioning(null); return; }
    const patch = {};
    if (source === 'iNaturalist' && sp.observations) {
      patch.observations = sp.observations.filter((_, i) => i !== idx);
    } else if (source === 'GBIF' && sp.gbif_occurrences) {
      patch.gbif_occurrences = sp.gbif_occurrences.filter((_, i) => i !== idx);
    }
    if (Object.keys(patch).length > 0) await base44.entities.Species.update(speciesId, patch);
    queryClient.invalidateQueries({ queryKey: ['allSpeciesOutlierScan'] });
    setActioning(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-bangor-red animate-spin mb-3" />
        <p className="text-slate-600">Loading all species data…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>

      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-4 shrink-0 flex-wrap">
        <Link to={createPageUrl('DataManagement')} className="text-slate-400 hover:text-bangor-red transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-bangor-red leading-tight">Multi-Species Outlier Scan</h1>
          <p className="text-xs text-slate-500">{speciesWithObs.length} species · each gets a unique colour</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-600 font-medium">{stats.totalObs.toLocaleString()} obs</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${stats.totalFlagged > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {stats.totalFlagged} outliers
          </span>
          {stats.byHigh > 0 && <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-bold">{stats.byHigh} HIGH</span>}
          {stats.byMed > 0  && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-full font-bold">{stats.byMed} MED</span>}
          {stats.byLow > 0  && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold">{stats.byLow} LOW</span>}
        </div>
      </div>

      {/* Map + Side panel */}
      <div className="flex flex-1 overflow-hidden">

        {/* Map */}
        <div className="flex-1 relative">
          {speciesWithObs.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No species with observation data found</p>
                <p className="text-slate-400 text-sm mt-1">Enrich species with iNaturalist or GBIF data first</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0">
              <OutlierMapPanel
                cleanPoints={mapCleanPoints}
                outlierPoints={mapOutlierPoints}
                singleColor="#22c55e"
              />
            </div>
          )}

          {/* Map legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 p-3 text-xs space-y-1.5 shadow-lg z-[1000]">
            <p className="font-semibold text-slate-700 mb-1">Legend</p>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-400 opacity-60"/><span className="text-slate-600">Clean occurrence (sampled)</span></div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full border-2 border-white" style={{ background: '#ef4444' }}/><span className="text-slate-600">High confidence outlier</span></div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full border-2 border-white" style={{ background: '#f59e0b' }}/><span className="text-slate-600">Medium confidence outlier</span></div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full border-2 border-white" style={{ background: '#60a5fa' }}/><span className="text-slate-600">Low confidence outlier</span></div>
            <p className="text-slate-400 italic pt-1 border-t border-slate-100">Outlier size = confidence level<br />Outlier ring = species colour</p>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-slate-100 shrink-0 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Species with data
              <span className="ml-2 text-slate-400 font-normal text-xs">({speciesWithObs.length})</span>
            </p>
            {selectedSpeciesId && (
              <button onClick={() => setSelectedSpeciesId(null)} className="text-xs text-bangor-red hover:underline">Show All</button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {scanResults.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-sm">No species with observations</div>
            )}
            {scanResults.map((result) => {
              const { species, color, flagged } = result;
              const isSelected = selectedSpeciesId === species.id;
              const isExpanded = expandedSpeciesId === species.id;

              return (
                <div key={species.id} className={`border-b border-slate-100 transition-colors ${isSelected ? 'bg-bangor-red/5' : 'hover:bg-slate-50'}`}>

                  {/* Species row */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/50" style={{ background: color }} />
                    <button
                      onClick={() => setSelectedSpeciesId(isSelected ? null : species.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-xs font-semibold text-slate-800 italic truncate">{species.scientific_name}</p>
                      <p className="text-xs text-slate-400">{result.total} obs · {result.cleanCount} clean</p>
                    </button>
                    {flagged.length > 0 ? (
                      <Badge className={`text-xs shrink-0 cursor-pointer ${
                        flagged.some(f => f.severity === 'high') ? 'bg-red-500' :
                        flagged.some(f => f.severity === 'medium') ? 'bg-amber-500' : 'bg-blue-400'
                      } text-white`}>
                        {flagged.length}
                      </Badge>
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    )}
                    {flagged.length > 0 && (
                      <button
                        onClick={() => setExpandedSpeciesId(isExpanded ? null : species.id)}
                        className="text-slate-400 hover:text-slate-600 shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  {/* Expanded outlier list */}
                  {isExpanded && flagged.length > 0 && (
                    <div className="bg-slate-50 border-t border-slate-100 px-2 pb-2 space-y-1.5">
                      {flagged.map((obs, oi) => {
                        const cfg = severityConfig[obs.severity];
                        const actionKey = `${species.id}-${obs.source}-${obs.idx}`;
                        const isActioning = actioning === actionKey;
                        return (
                          <div key={oi} className={`rounded-lg border p-2 text-xs ${cfg.card}`}>
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1 flex-wrap min-w-0">
                                <span className={`px-1.5 py-0.5 rounded-full font-bold text-xs shrink-0 ${cfg.badge}`}>{obs.severity.toUpperCase()}</span>
                                <span className="text-slate-500 text-xs shrink-0">{obs.source}</span>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => handleFlag(species.id, obs.source, obs.idx)}
                                  disabled={isActioning}
                                  className="p-1 rounded hover:bg-amber-100 text-amber-600 transition-colors"
                                  title="Flag as outlier (keeps data, marks for exclusion)"
                                >
                                  {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => handleRemove(species.id, obs.source, obs.idx)}
                                  disabled={isActioning}
                                  className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
                                  title="Remove permanently"
                                >
                                  {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                            <p className="font-medium text-slate-700 leading-tight text-xs">{obs.reason}</p>
                            {!isNaN(obs.lat) && (
                              <p className="text-slate-500 mt-0.5 text-xs">{obs.lat.toFixed(4)}°, {obs.lng.toFixed(4)}°</p>
                            )}
                            {obs.date && <p className="text-slate-400 text-xs">{obs.date}</p>}
                            {/* Confidence bar */}
                            <div className="w-full bg-slate-200 rounded-full h-1 mt-1.5 overflow-hidden">
                              <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${obs.confidence}%` }} />
                            </div>
                            <p className="text-slate-400 text-xs mt-0.5">{obs.confidence}% error confidence</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}