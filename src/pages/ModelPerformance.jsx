import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart2, GitCompare, Info, Layers } from 'lucide-react';
import MetricCard from '@/components/maxent/MetricCard';
import FeatureImportancePlot from '@/components/maxent/FeatureImportancePlot';
import RunCompareSelector from '@/components/maxent/RunCompareSelector';
import ReportGenerator from '@/components/maxent/ReportGenerator';
import HillWinderBenchmark from '@/components/maxent/HillWinderBenchmark';

export default function ModelPerformance() {
  const [selectedRuns, setSelectedRuns] = useState([]);

  const { data: allRuns = [], isLoading } = useQuery({
    queryKey: ['maxentRuns'],
    queryFn: () => base44.entities.MaxentRun.list('-created_date', 100),
  });

  const { data: allSpecies = [] } = useQuery({
    queryKey: ['species-slim'],
    queryFn: () => base44.entities.Species.list('-created_date', 200),
  });

  const completedRuns = allRuns.filter(r => r.status === 'completed');

  const toggleRun = (run) => {
    setSelectedRuns(prev => {
      const exists = prev.some(r => r.id === run.id);
      if (exists) return prev.filter(r => r.id !== run.id);
      if (prev.length >= 4) return prev; // cap at 4 for readability
      return [...prev, run];
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-8">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-bangor-red tracking-tight flex items-center gap-3">
            <BarChart2 className="w-8 h-8" />
            Model Performance Dashboard
          </h1>
          <p className="mt-2 text-slate-600 max-w-2xl leading-relaxed">
            Review AUC, TSS, and feature importance for completed MAXENT runs. Select up to 4 runs to compare side-by-side.
          </p>
          <div className="mt-4">
            <ReportGenerator runs={selectedRuns} species={allSpecies} />
          </div>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">

          {/* ── Left panel: run selector ── */}
          <div className="space-y-4">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b bg-slate-50 py-3 px-4">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-bangor-red" />
                  Select Runs to Compare
                  {selectedRuns.length > 0 && (
                    <Badge className="ml-auto bg-bangor-red text-white text-xs">{selectedRuns.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="py-10 text-center text-slate-400 text-sm">Loading runs…</div>
                ) : allRuns.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    No MAXENT runs found. Submit a run from the MAXENT Modeller page.
                  </div>
                ) : (
                  <>
                    {completedRuns.length === 0 && (
                      <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                        No completed runs yet — metrics require status <strong>completed</strong>.
                      </div>
                    )}
                    <RunCompareSelector
                      runs={allRuns}
                      selected={selectedRuns}
                      onToggle={toggleRun}
                    />
                    {selectedRuns.length >= 4 && (
                      <p className="text-xs text-slate-400 mt-2 text-center">Maximum 4 runs selected.</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Right panel: metrics + charts ── */}
          <div className="space-y-6">

            {selectedRuns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-72 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
                <GitCompare className="w-10 h-10 mb-3 opacity-40" />
                <p className="font-semibold text-sm">Select one or more runs from the panel</p>
                <p className="text-xs mt-1">Metrics and charts will appear here.</p>
              </div>
            ) : (
              <>
                {/* ── Per-run metric tiles ── */}
                {selectedRuns.map(run => (
                  <Card key={run.id} className="shadow-sm border-slate-200">
                    <CardHeader className="border-b bg-slate-50 py-3 px-5">
                      <CardTitle className="text-slate-800 text-sm font-semibold flex items-center justify-between gap-2 flex-wrap">
                        <span className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-bangor-red" />
                          <em className="not-italic">{run.name || run.species_name}</em>
                        </span>
                        <span className="text-xs font-normal text-slate-500 italic">{run.species_name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-5">

                      {run.results == null ? (
                        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                          <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                          <div className="text-sm text-slate-500">
                            <p className="font-semibold text-slate-700 mb-1">No results data yet</p>
                            <p>This run's <code className="font-mono bg-slate-100 px-1 rounded">results</code> field is empty.
                              Once MAXENT processing completes, metrics (AUC, TSS, feature importance) will populate here automatically.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Metric tiles */}
                          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <MetricCard
                              label="AUC (ROC)"
                              value={run.results?.auc}
                              metricKey="auc"
                              description="Area Under the ROC Curve. 1.0 = perfect, 0.5 = random."
                            />
                            <MetricCard
                              label="TSS"
                              value={run.results?.tss}
                              metricKey="tss"
                              description="True Skill Statistic. Accounts for prevalence. Range: −1 to +1."
                            />
                            <MetricCard
                              label="Omission Rate"
                              value={run.results?.omission_rate}
                              metricKey="omission_rate"
                              description="Fraction of known presences predicted as absent. Lower is better."
                              unit=""
                            />
                            <MetricCard
                              label="Replicates"
                              value={run.results?.replicates_completed ?? run.parameters?.replicates}
                              metricKey={null}
                              description="Number of cross-validation replicates completed."
                            />
                          </div>

                          {/* AUC sd / TSS sd if present */}
                          {(run.results?.auc_sd != null || run.results?.tss_sd != null) && (
                            <div className="flex gap-4 text-xs text-slate-500 font-mono">
                              {run.results?.auc_sd != null && <span>AUC SD: ±{Number(run.results.auc_sd).toFixed(4)}</span>}
                              {run.results?.tss_sd != null && <span>TSS SD: ±{Number(run.results.tss_sd).toFixed(4)}</span>}
                            </div>
                          )}
                        </>
                      )}

                      {/* Model config summary */}
                      <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50 rounded-xl border border-slate-100 p-4">
                        <div>
                          <span className="font-semibold text-slate-700">Occurrences: </span>{run.occurrence_count || '—'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Layers: </span>{run.climate_dataset_names?.length || '—'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Regularisation: </span>{run.parameters?.regularization_multiplier ?? '—'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Output type: </span>{run.parameters?.output_type ?? '—'}
                        </div>
                        {run.climate_dataset_names?.length > 0 && (
                          <div className="sm:col-span-2">
                            <span className="font-semibold text-slate-700">Layers used: </span>
                            {run.climate_dataset_names.join(', ')}
                          </div>
                        )}
                      </div>

                    </CardContent>
                  </Card>
                ))}

                {/* ── Hill & Winder Benchmark ── */}
                <HillWinderBenchmark runs={selectedRuns} />

                {/* ── Feature importance comparison ── */}
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="border-b bg-slate-50 py-3 px-5">
                    <CardTitle className="text-slate-800 text-sm font-semibold flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-bangor-red" />
                      Feature Importance
                      {selectedRuns.length > 1 && (
                        <Badge variant="outline" className="ml-auto text-xs">Comparing {selectedRuns.length} runs</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <FeatureImportancePlot runs={selectedRuns} />
                  </CardContent>
                </Card>

              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}