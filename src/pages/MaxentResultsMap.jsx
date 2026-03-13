import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Map, Layers, Info, CheckCircle, Clock, AlertCircle, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import SuitabilityMap from '@/components/maxent/SuitabilityMap';

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     bg: 'bg-slate-100',  text: 'text-slate-600',  icon: FileText },
  submitted: { label: 'Submitted', bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Clock },
  running:   { label: 'Running',   bg: 'bg-amber-100',  text: 'text-amber-700',  icon: Loader2, spin: true },
  completed: { label: 'Completed', bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle },
  failed:    { label: 'Failed',    bg: 'bg-red-100',    text: 'text-red-700',    icon: AlertCircle },
};

function RunStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  );
}

export default function MaxentResultsMap() {
  const [selectedRunId, setSelectedRunId] = useState(null);

  const { data: allRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ['maxentRuns'],
    queryFn: () => base44.entities.MaxentRun.list('-created_date', 100),
  });

  const { data: allSpecies = [] } = useQuery({
    queryKey: ['species-all-slim'],
    queryFn: () => base44.entities.Species.list('-created_date', 200),
  });

  const selectedRun = useMemo(
    () => allRuns.find(r => r.id === selectedRunId) ?? null,
    [allRuns, selectedRunId]
  );

  const linkedSpecies = useMemo(() => {
    if (!selectedRun) return null;
    return allSpecies.find(
      s => s.id === selectedRun.species_id || s.scientific_name === selectedRun.species_name
    ) ?? null;
  }, [selectedRun, allSpecies]);

  const hasSuitabilityData = !!selectedRun?.results?.suitability_geojson;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-8">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-bangor-red tracking-tight flex items-center gap-3">
            <Map className="w-8 h-8" />
            MAXENT Results Map Viewer
          </h1>
          <p className="mt-2 text-slate-600 max-w-2xl leading-relaxed">
            Visualise predicted habitat suitability output from completed MAXENT runs, overlaid with occurrence points.
          </p>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">

          {/* ── Run selector panel ── */}
          <div>
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b bg-slate-50 py-3 px-4">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-bangor-red" />
                  Select a Model Run
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {runsLoading ? (
                  <div className="py-10 text-center text-slate-400 text-sm">Loading…</div>
                ) : allRuns.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm px-4">
                    No runs found. Submit a run from the MAXENT Modeller page.
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[520px] overflow-y-auto">
                    {allRuns.map(run => (
                      <button
                        key={run.id}
                        onClick={() => setSelectedRunId(run.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm ${
                          selectedRunId === run.id
                            ? 'border-bangor-red bg-red-50'
                            : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-semibold text-slate-900 truncate">{run.name || run.species_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <em className="not-italic italic text-slate-600">{run.species_name}</em>
                          {run.created_date && (
                            <span>{format(new Date(run.created_date), 'dd MMM yy')}</span>
                          )}
                        </div>
                        <div className="mt-1.5">
                          <RunStatusBadge status={run.status} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Map panel ── */}
          <div className="space-y-4">
            {!selectedRun ? (
              <div className="flex flex-col items-center justify-center h-80 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
                <Map className="w-10 h-10 mb-3 opacity-40" />
                <p className="font-semibold text-sm">Select a run from the panel</p>
                <p className="text-xs mt-1">The suitability map will render here.</p>
              </div>
            ) : (
              <>
                {/* Run info bar */}
                <Card className="shadow-sm border-slate-200">
                  <CardContent className="px-5 py-3 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{selectedRun.name || selectedRun.species_name}</div>
                      <div className="text-xs text-slate-500 italic">{selectedRun.species_name}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 flex-wrap text-xs text-slate-600">
                      <span>{selectedRun.occurrence_count || 0} occurrences</span>
                      <span>{selectedRun.climate_dataset_names?.length || 0} layers</span>
                      {selectedRun.results?.auc != null && (
                        <span className="font-mono font-semibold text-green-700">AUC {Number(selectedRun.results.auc).toFixed(3)}</span>
                      )}
                      <RunStatusBadge status={selectedRun.status} />
                    </div>
                  </CardContent>
                </Card>

                {/* No suitability data notice */}
                {!hasSuitabilityData && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                    <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">No suitability raster data yet</p>
                      <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                        Populate <code className="font-mono bg-amber-100 px-1 rounded">results.suitability_geojson</code> on this run
                        when MAXENT processing completes. Showing occurrence points only in the meantime.
                      </p>
                    </div>
                  </div>
                )}

                {/* The map */}
                <SuitabilityMap run={selectedRun} species={linkedSpecies} />

                {/* Layer legend / parameter summary */}
                {selectedRun.climate_dataset_names?.length > 0 && (
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="border-b bg-slate-50 py-2.5 px-5">
                      <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Environmental Layers Used
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 py-3 flex flex-wrap gap-2">
                      {selectedRun.climate_dataset_names.map(name => (
                        <Badge key={name} variant="outline" className="text-xs">{name}</Badge>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}