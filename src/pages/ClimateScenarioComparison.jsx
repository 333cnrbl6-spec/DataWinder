import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Minus, CloudRain, Info } from 'lucide-react';

const SCENARIO_COLORS = {
  'Historical/Baseline': '#64748b',
  'SSP1-2.6': '#22c55e',
  'SSP2-4.5': '#f59e0b',
  'SSP3-7.0': '#f97316',
  'SSP5-8.5': '#ef4444',
};

const SCENARIO_LABELS = {
  'Historical/Baseline': 'Baseline',
  'SSP1-2.6': 'SSP1-2.6',
  'SSP2-4.5': 'SSP2-4.5',
  'SSP3-7.0': 'SSP3-7.0',
  'SSP5-8.5': 'SSP5-8.5',
};

function inferScenario(run, datasets) {
  // Try to match climate dataset scenario from run's climate_dataset_ids
  if (run.climate_dataset_ids?.length) {
    const ds = datasets.find(d => run.climate_dataset_ids.includes(d.id));
    if (ds?.scenario) return ds.scenario;
  }
  // Fallback: scan names
  const names = (run.climate_dataset_names || []).join(' ').toLowerCase();
  if (names.includes('ssp585') || names.includes('ssp5-8.5')) return 'SSP5-8.5';
  if (names.includes('ssp370') || names.includes('ssp3-7.0')) return 'SSP3-7.0';
  if (names.includes('ssp245') || names.includes('ssp2-4.5')) return 'SSP2-4.5';
  if (names.includes('ssp126') || names.includes('ssp1-2.6')) return 'SSP1-2.6';
  return 'Historical/Baseline';
}

function MetricDelta({ value, baseline }) {
  if (baseline == null || value == null) return null;
  const delta = value - baseline;
  if (Math.abs(delta) < 0.001) return <Minus className="w-3 h-3 text-slate-400 inline" />;
  return delta > 0
    ? <span className="text-green-600 text-xs font-semibold">▲ {delta.toFixed(3)}</span>
    : <span className="text-red-500 text-xs font-semibold">▼ {Math.abs(delta).toFixed(3)}</span>;
}

function ScenarioCard({ scenario, run, baseline, color }) {
  const auc = run?.results?.auc ?? null;
  const tss = run?.results?.tss ?? null;
  const omission = run?.results?.omission_rate ?? null;
  const baselineAuc = baseline?.results?.auc ?? null;
  const baselineTss = baseline?.results?.tss ?? null;
  const isBaseline = scenario === 'Historical/Baseline';

  return (
    <Card className="border-2 shadow-sm" style={{ borderColor: color + '40' }}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold" style={{ color }}>{SCENARIO_LABELS[scenario]}</CardTitle>
          {isBaseline && <Badge className="bg-slate-100 text-slate-600 text-xs">Baseline</Badge>}
          {run ? (
            <Badge className="bg-green-50 text-green-700 text-xs">Run found</Badge>
          ) : (
            <Badge className="bg-slate-50 text-slate-400 text-xs">No run</Badge>
          )}
        </div>
        {run && <p className="text-xs text-slate-400 truncate mt-1">{run.name}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {run ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-lg font-bold text-slate-800">{auc != null ? auc.toFixed(3) : '—'}</div>
                <div className="text-xs text-slate-500">AUC</div>
                {!isBaseline && <MetricDelta value={auc} baseline={baselineAuc} />}
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-lg font-bold text-slate-800">{tss != null ? tss.toFixed(3) : '—'}</div>
                <div className="text-xs text-slate-500">TSS</div>
                {!isBaseline && <MetricDelta value={tss} baseline={baselineTss} />}
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-lg font-bold text-slate-800">{omission != null ? (omission * 100).toFixed(1) + '%' : '—'}</div>
                <div className="text-xs text-slate-500">Omission</div>
              </div>
            </div>
            {run.climate_dataset_names?.length > 0 && (
              <div className="text-xs text-slate-400 pt-1">
                {run.climate_dataset_names.slice(0, 3).join(', ')}
                {run.climate_dataset_names.length > 3 && ` +${run.climate_dataset_names.length - 3} more`}
              </div>
            )}
          </>
        ) : (
          <div className="py-4 text-center text-sm text-slate-400">No completed run for this scenario</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClimateScenarioComparison() {
  const [selectedSpecies, setSelectedSpecies] = useState('');

  const { data: allRuns = [] } = useQuery({
    queryKey: ['maxentRuns-comparison'],
    queryFn: () => base44.entities.MaxentRun.filter({ status: 'completed' }, '-created_date', 200),
  });

  const { data: allSpecies = [] } = useQuery({
    queryKey: ['species-names-comparison'],
    queryFn: () => base44.entities.Species.list('-scientific_name', 500),
  });

  const { data: datasets = [] } = useQuery({
    queryKey: ['climate-datasets-comparison'],
    queryFn: () => base44.entities.ClimateDataset.list(),
  });

  const speciesWithRuns = useMemo(() => {
    const names = [...new Set(allRuns.map(r => r.species_name).filter(Boolean))];
    return names.sort();
  }, [allRuns]);

  const runsForSpecies = useMemo(() => {
    if (!selectedSpecies) return [];
    return allRuns.filter(r => r.species_name === selectedSpecies);
  }, [allRuns, selectedSpecies]);

  const scenarioMap = useMemo(() => {
    const map = {};
    for (const run of runsForSpecies) {
      const scenario = inferScenario(run, datasets);
      if (!map[scenario]) map[scenario] = run; // take most recent per scenario
    }
    return map;
  }, [runsForSpecies, datasets]);

  const SCENARIOS = ['Historical/Baseline', 'SSP1-2.6', 'SSP2-4.5', 'SSP3-7.0', 'SSP5-8.5'];
  const baseline = scenarioMap['Historical/Baseline'];

  // Radar chart data
  const radarData = useMemo(() => {
    return [
      { metric: 'AUC', ...Object.fromEntries(SCENARIOS.map(s => [SCENARIO_LABELS[s], scenarioMap[s]?.results?.auc ?? null])) },
      { metric: 'TSS', ...Object.fromEntries(SCENARIOS.map(s => [SCENARIO_LABELS[s], scenarioMap[s]?.results?.tss ?? null])) },
    ].filter(d => Object.values(d).some(v => typeof v === 'number'));
  }, [scenarioMap]);

  // Bar chart data for AUC across scenarios
  const barData = useMemo(() => {
    return SCENARIOS
      .filter(s => scenarioMap[s]?.results?.auc != null)
      .map(s => ({
        scenario: SCENARIO_LABELS[s],
        AUC: scenarioMap[s].results.auc,
        TSS: scenarioMap[s].results.tss ?? 0,
        color: SCENARIO_COLORS[s],
      }));
  }, [scenarioMap]);

  const completedCount = SCENARIOS.filter(s => scenarioMap[s]).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-bangor-red tracking-tight">Climate Scenario Comparison</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Compare MAXENT model performance across SSP climate scenarios for a single species.
            </p>
          </div>
          <div className="w-72">
            <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Select a species…" />
              </SelectTrigger>
              <SelectContent>
                {speciesWithRuns.map(name => (
                  <SelectItem key={name} value={name}><span className="italic">{name}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedSpecies && (
          <Card className="border-dashed border-2 border-slate-200 shadow-none">
            <CardContent className="py-16 text-center">
              <CloudRain className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Select a species to compare scenario results</p>
              <p className="text-sm text-slate-400 mt-1">Only species with completed MAXENT runs are shown</p>
            </CardContent>
          </Card>
        )}

        {selectedSpecies && (
          <>
            {/* Summary banner */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-600">
                Found <strong>{runsForSpecies.length}</strong> completed run{runsForSpecies.length !== 1 ? 's' : ''} across <strong>{completedCount}</strong> of 5 scenarios for <em>{selectedSpecies}</em>.
                {!baseline && ' No baseline run detected — deltas unavailable.'}
              </span>
            </div>

            {/* Scenario Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {SCENARIOS.map(scenario => (
                <ScenarioCard
                  key={scenario}
                  scenario={scenario}
                  run={scenarioMap[scenario] || null}
                  baseline={baseline}
                  color={SCENARIO_COLORS[scenario]}
                />
              ))}
            </div>

            {/* Charts */}
            {barData.length > 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-slate-800">AUC & TSS by Scenario</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={barData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="scenario" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={v => v?.toFixed(3)} />
                        <Legend />
                        <Bar dataKey="AUC" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="TSS" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {radarData.length > 0 && (
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-slate-800">Performance Radar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={240}>
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                          {SCENARIOS.filter(s => scenarioMap[s]).map(s => (
                            <Radar
                              key={s}
                              name={SCENARIO_LABELS[s]}
                              dataKey={SCENARIO_LABELS[s]}
                              stroke={SCENARIO_COLORS[s]}
                              fill={SCENARIO_COLORS[s]}
                              fillOpacity={0.15}
                            />
                          ))}
                          <Legend />
                          <Tooltip formatter={v => v?.toFixed(3)} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Interpretation guide */}
            <Card className="shadow-sm border-slate-100 bg-slate-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600 font-semibold">Scenario Interpretation Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {SCENARIOS.map(s => (
                    <div key={s} className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: SCENARIO_COLORS[s] }} />
                      <div>
                        <div className="text-xs font-semibold text-slate-700">{s}</div>
                        <div className="text-xs text-slate-500">
                          {s === 'Historical/Baseline' && 'Current climate conditions'}
                          {s === 'SSP1-2.6' && 'Strong mitigation, +1.5–2°C'}
                          {s === 'SSP2-4.5' && 'Intermediate, +2–3°C'}
                          {s === 'SSP3-7.0' && 'High emissions, +3–4°C'}
                          {s === 'SSP5-8.5' && 'Very high emissions, +4–5°C'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

      </div>
    </div>
  );
}