import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Play, CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw, ChevronDown, ChevronUp, Map, BarChart2, Activity, Thermometer, Droplets, Wind, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import SDMPredictionMap from '@/components/sdm/SDMPredictionMap';
import ProcessingFeedback from '@/components/ui/ProcessingFeedback';
import SDMReportGenerator from '@/components/reports/SDMReportGenerator';
import SDMProgressMonitor from '@/components/SDMProgressMonitor';

const BIOCLIM_OPTIONS = [
  { id: 'bio1',  label: 'BIO1 — Mean Annual Temp',       icon: Thermometer },
  { id: 'bio2',  label: 'BIO2 — Mean Diurnal Range',     icon: Thermometer },
  { id: 'bio3',  label: 'BIO3 — Isothermality',          icon: Thermometer },
  { id: 'bio4',  label: 'BIO4 — Temperature Seasonality',icon: Thermometer },
  { id: 'bio5',  label: 'BIO5 — Max Temp Warmest Month', icon: Thermometer },
  { id: 'bio6',  label: 'BIO6 — Min Temp Coldest Month', icon: Wind },
  { id: 'bio11', label: 'BIO11 — Mean Temp Coldest Qtr', icon: Wind },
  { id: 'bio12', label: 'BIO12 — Annual Precipitation',  icon: Droplets },
  { id: 'bio15', label: 'BIO15 — Precip Seasonality',    icon: Droplets },
  { id: 'bio17', label: 'BIO17 — Precip Driest Quarter', icon: Droplets },
];

const STAGE_ORDER = ['queued','cleaning','thinning','fetching_climate','modeling','completed','failed'];
const STAGE_LABELS = {
  queued: 'Queued', cleaning: 'Cleaning Outliers', thinning: 'Spatial Thinning',
  fetching_climate: 'Climate Variables', modeling: 'MaxEnt Modeling', completed: 'Complete', failed: 'Failed',
};

function StatusBadge({ status }) {
  const cfg = {
    queued:           { cls: 'bg-slate-100 text-slate-600',  icon: Clock },
    cleaning:         { cls: 'bg-blue-100 text-blue-700',    icon: Loader2, spin: true },
    thinning:         { cls: 'bg-indigo-100 text-indigo-700',icon: Loader2, spin: true },
    fetching_climate: { cls: 'bg-cyan-100 text-cyan-700',    icon: Loader2, spin: true },
    modeling:         { cls: 'bg-amber-100 text-amber-700',  icon: Loader2, spin: true },
    completed:        { cls: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
    failed:           { cls: 'bg-red-100 text-red-700',      icon: XCircle },
  }[status] || { cls: 'bg-slate-100 text-slate-600', icon: Clock };
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.cls} flex items-center gap-1 border-0`}>
      <Icon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`} />
      {STAGE_LABELS[status] || status}
    </Badge>
  );
}

function ProgressBar({ pct, status }) {
  const color = status === 'completed' ? 'bg-green-500' : status === 'failed' ? 'bg-red-500' : 'bg-bangor-red';
  return (
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct || 0}%` }} />
    </div>
  );
}

function MetricCard({ label, value, sub, good }) {
  const color = good === true ? 'text-green-600' : good === false ? 'text-red-500' : 'text-slate-800';
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs font-semibold text-slate-700 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function RunCard({ run, onOpen, isOpen, onDelete }) {
  return (
    <Card className={`border-2 transition-all ${isOpen ? 'border-bangor-red/40' : 'border-slate-200 hover:border-slate-300'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800 truncate">{run.name}</p>
              <StatusBadge status={run.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {run.species_names?.join(', ') || `${run.species_ids?.length || 0} species`}
            </p>
            {run.progress_message && run.status !== 'completed' && run.status !== 'failed' && (
              <p className="text-xs text-blue-600 mt-1 italic">{run.progress_message}</p>
            )}
            {run.status !== 'queued' && run.status !== 'failed' && (
              <div className="mt-2">
                <ProgressBar pct={run.progress_pct} status={run.status} />
              </div>
            )}
            {run.status === 'completed' && run.metrics && (
              <div className="flex gap-3 mt-2 text-xs text-slate-600">
                <span>AUC <strong className="text-green-600">{run.metrics.auc?.toFixed(3)}</strong></span>
                <span>TSS <strong>{run.metrics.tss?.toFixed(3)}</strong></span>
                <span>{run.occurrence_stats?.after_thinning} pts used</span>
                {run.runtime_seconds && <span>{run.runtime_seconds}s</span>}
              </div>
            )}
            {run.status === 'failed' && (
              <p className="text-xs text-red-500 mt-1">{run.error_message}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {run.status === 'completed' && (
              <Button size="sm" variant="outline" onClick={() => onOpen(run.id)} className="text-xs h-8 gap-1">
                {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {isOpen ? 'Hide' : 'View Results'}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onDelete(run.id)} className="text-slate-400 hover:text-red-500 h-8 w-8 p-0">
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultsPanel({ run, navigate, allSpecies = [] }) {
  const [tab, setTab] = useState('map');
  if (!run || !run.metrics) return null;
  const auc = run.metrics.auc;
  const aucGood = auc >= 0.8;

  return (
    <Card className="border-bangor-red/20 bg-gradient-to-br from-slate-50 to-white">
      <CardHeader className="border-b border-slate-200 pb-3">
        <CardTitle className="text-base text-bangor-red flex items-center gap-2">
          <Activity className="w-4 h-4" /> Results — {run.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Metrics row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
          <MetricCard label="AUC" value={auc?.toFixed(3)} sub="≥0.8 = good" good={aucGood} />
          <MetricCard label="TSS" value={run.metrics.tss?.toFixed(3)} sub="≥0.4 = good" good={run.metrics.tss >= 0.4} />
          <MetricCard label="Sensitivity" value={(run.metrics.sensitivity * 100).toFixed(1) + '%'} />
          <MetricCard label="Specificity" value={(run.metrics.specificity * 100).toFixed(1) + '%'} />
          <MetricCard label="Kappa" value={run.metrics.kappa?.toFixed(3)} />
          <MetricCard label="Omission" value={(run.metrics.omission_rate * 100).toFixed(1) + '%'} sub="lower = better" good={run.metrics.omission_rate < 0.1} />
        </div>

        {/* Occurrence stats */}
        {run.occurrence_stats && (
          <div className="flex gap-3 mb-4 text-xs bg-blue-50 border border-blue-100 rounded-lg p-3 flex-wrap">
            <span>Raw: <strong>{run.occurrence_stats.raw_count}</strong></span>
            <span>→ After outlier removal: <strong>{run.occurrence_stats.after_outlier_removal}</strong></span>
            <span>→ After thinning: <strong>{run.occurrence_stats.after_thinning}</strong></span>
            <span className="ml-auto text-slate-500">{run.runtime_seconds}s runtime</span>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-3">
            <TabsTrigger value="map" className="text-xs gap-1"><Map className="w-3 h-3" />Prediction Map</TabsTrigger>
            <TabsTrigger value="importance" className="text-xs gap-1"><BarChart2 className="w-3 h-3" />Variable Importance</TabsTrigger>
            <TabsTrigger value="response" className="text-xs gap-1"><Activity className="w-3 h-3" />Response Curves</TabsTrigger>
          </TabsList>

          <TabsContent value="map">
            <div className="space-y-3">
              <SDMPredictionMap
                grid={run.prediction_grid || []}
                occurrences={run.occurrence_points || []}
              />
              <Button
                onClick={() => navigate(`/SDMMapEditor/${run.id}`)}
                className="w-full bg-bangor-red hover:bg-bangor-red/90 gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Open in Map Editor
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="importance">
            {run.variable_importance?.length > 0 ? (
              <div>
                <p className="text-xs text-slate-500 mb-3">Permutation importance — higher = more influential</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={run.variable_importance} layout="vertical" margin={{ left: 80, right: 20 }}>
                    <XAxis type="number" tickFormatter={v => v.toFixed(3)} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="variable" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={v => v.toFixed(4)} />
                    <Bar dataKey="importance" fill="#c62335" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-sm text-slate-400 text-center py-8">No importance data</p>}
          </TabsContent>

          <TabsContent value="response">
            {run.response_curves?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {run.response_curves.map(curve => (
                  <div key={curve.variable}>
                    <p className="text-xs font-semibold text-slate-600 mb-1">{curve.variable}</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={curve.points} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="x" tick={{ fontSize: 9 }} tickCount={5} />
                        <YAxis domain={[0, 1]} tick={{ fontSize: 9 }} tickCount={3} />
                        <Tooltip formatter={v => v.toFixed(3)} />
                        <Line type="monotone" dataKey="y" stroke="#c62335" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400 text-center py-8">No response curve data</p>}
          </TabsContent>

          <TabsContent value="export">
            <SDMReportGenerator 
              sdmRunId={run.id}
              species={allSpecies.filter(s => run.species_ids?.includes(s.id))}
            />
          </TabsContent>
        </Tabs>

        {/* Report Export Section */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-semibold text-slate-600 mb-3">📄 Generate Publication-Ready PDF Report</p>
          <SDMReportGenerator 
            sdmRunId={run.id}
            species={allSpecies.filter(s => run.species_ids?.includes(s.id))}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SDMPipeline() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState([]);
  const [runName, setRunName] = useState('');
  const [selectedBioclim, setSelectedBioclim] = useState(['bio1', 'bio4', 'bio12', 'bio15', 'bio5', 'bio6']);
  const [thinningKm, setThinningKm] = useState(10);
  const [outlierMode, setOutlierMode] = useState('exclude_high');
  const [regularization, setRegularization] = useState(0.1);
  const [isLaunching, setIsLaunching] = useState(false);
  const [openRunId, setOpenRunId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const pollingRef = useRef({});

  const { data: allSpecies = [] } = useQuery({
    queryKey: ['allSpecies'],
    queryFn: () => base44.entities.Species.list('-created_date'),
  });

  const { data: runs = [] } = useQuery({
    queryKey: ['sdmRuns'],
    queryFn: () => base44.entities.SDMRun.list('-created_date', 50),
    refetchInterval: 3000, // Faster polling for active runs
  });

  // Real-time subscription to SDM run updates
  useEffect(() => {
    const unsubscribe = base44.entities.SDMRun.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        queryClient.invalidateQueries({ queryKey: ['sdmRuns'] });
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  // Poll active runs
  useEffect(() => {
    const activeRuns = runs.filter(r => !['completed', 'failed'].includes(r.status));
    activeRuns.forEach(run => {
      if (!pollingRef.current[run.id]) {
        pollingRef.current[run.id] = true;
      }
    });
    const doneIds = Object.keys(pollingRef.current).filter(id =>
      runs.find(r => r.id === id && ['completed', 'failed'].includes(r.status))
    );
    doneIds.forEach(id => delete pollingRef.current[id]);
  }, [runs]);

  const filteredSpecies = allSpecies.filter(s =>
    s.scientific_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.common_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSpecies = (id) => {
    setSelectedSpeciesIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleBioclim = (id) => {
    setSelectedBioclim(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleLaunch = async () => {
    if (!selectedSpeciesIds.length) { toast.error('Select at least one species'); return; }
    if (!runName.trim()) { toast.error('Enter a run name'); return; }
    if (selectedBioclim.length < 2) { toast.error('Select at least 2 bioclimatic variables'); return; }

    setIsLaunching(true);
    try {
      const selSpecies = allSpecies.filter(s => selectedSpeciesIds.includes(s.id));
      const run = await base44.entities.SDMRun.create({
        name: runName.trim(),
        species_ids: selectedSpeciesIds,
        species_names: selSpecies.map(s => s.scientific_name),
        status: 'queued',
        progress_pct: 0,
        progress_message: 'Queued — starting pipeline…',
        parameters: {
          outlier_handling: outlierMode,
          thinning_km: thinningKm,
          bioclim_vars: selectedBioclim,
          regularization,
          test_fraction: 0.25,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['sdmRuns'] });
      toast.success('Pipeline launched!');
      setOpenRunId(run.id);
      setRunName('');

      // Fire pipeline async — don't await
      base44.functions.invoke('runSDMPipeline', {
        runId: run.id,
        speciesIds: selectedSpeciesIds,
        parameters: {
          outlier_handling: outlierMode,
          thinning_km: thinningKm,
          bioclim_vars: selectedBioclim,
          regularization,
          test_fraction: 0.25,
        },
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['sdmRuns'] });
      }).catch(err => {
        console.error('Pipeline invoke error:', err);
        queryClient.invalidateQueries({ queryKey: ['sdmRuns'] });
      });

    } catch (err) {
      toast.error(`Failed to launch: ${err.message}`);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleDelete = async (runId) => {
    await base44.entities.SDMRun.delete(runId);
    if (openRunId === runId) setOpenRunId(null);
    queryClient.invalidateQueries({ queryKey: ['sdmRuns'] });
  };

  const openRun = runs.find(r => r.id === openRunId);
  const activeRunsCount = runs.filter(r => !['completed', 'failed'].includes(r.status)).length;
  const completedRunsCount = runs.filter(r => r.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
      {/* Header */}
      <header className="bg-white border-b-2 border-bangor-red shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-bangor-red/10 rounded-xl">
              <Activity className="w-6 h-6 text-bangor-red" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-bangor-red">Automated SDM Pipeline</h1>
              <p className="text-sm text-slate-500">Clean outliers → spatial thin → WorldClim bioclim → MaxEnt → prediction map</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {activeRunsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-amber-800 font-semibold">{activeRunsCount} active</span>
              </div>
            )}
            {completedRunsCount > 0 && (
              <div className="text-green-700 font-semibold">{completedRunsCount} completed</div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Configuration ── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Run name */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Run Name</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="e.g. Species name — baseline run 2026"
                  value={runName}
                  onChange={e => setRunName(e.target.value)}
                  className="h-9"
                />
              </CardContent>
            </Card>

            {/* Species selection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Species
                  {selectedSpeciesIds.length > 0 && (
                    <Badge className="bg-bangor-red text-white text-xs">{selectedSpeciesIds.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  placeholder="Search species…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="h-8 text-xs"
                />
                <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2 bg-white">
                  {filteredSpecies.slice(0, 80).map(sp => (
                    <label key={sp.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                      <Checkbox
                        checked={selectedSpeciesIds.includes(sp.id)}
                        onCheckedChange={() => toggleSpecies(sp.id)}
                      />
                      <div className="min-w-0">
                        <p className="text-xs italic text-slate-800 truncate">{sp.scientific_name}</p>
                        {sp.iucn_status && <span className="text-xs text-slate-400">{sp.iucn_status}</span>}
                      </div>
                    </label>
                  ))}
                  {filteredSpecies.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No species found</p>}
                </div>
              </CardContent>
            </Card>

            {/* Cleaning settings */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Cleaning & Thinning</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Outlier Removal</label>
                  {[
                    { v: 'include_all',         l: 'None' },
                    { v: 'exclude_high',        l: 'High-confidence (IQR ×3)' },
                    { v: 'exclude_all_flagged', l: 'Aggressive (IQR ×1.5)' },
                  ].map(opt => (
                    <label key={opt.v} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                      <input type="radio" name="outlier" value={opt.v} checked={outlierMode === opt.v} onChange={e => setOutlierMode(e.target.value)} className="accent-red-600" />
                      <span className="text-xs text-slate-700">{opt.l}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Spatial Thinning — <span className="text-bangor-red font-bold">{thinningKm} km</span>
                  </label>
                  <input
                    type="range" min="0" max="50" step="1"
                    value={thinningKm}
                    onChange={e => setThinningKm(Number(e.target.value))}
                    className="w-full accent-red-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-0.5"><span>0km</span><span>50km</span></div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Regularization — <span className="text-bangor-red font-bold">{regularization}</span>
                  </label>
                  <input
                    type="range" min="0.01" max="2" step="0.01"
                    value={regularization}
                    onChange={e => setRegularization(Number(e.target.value))}
                    className="w-full accent-red-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-0.5"><span>Low (overfit)</span><span>High (smooth)</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Bioclim variables */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Bioclimatic Variables
                  <span className="text-xs font-normal text-slate-400">{selectedBioclim.length} selected</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {BIOCLIM_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <label key={opt.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                        <Checkbox
                          checked={selectedBioclim.includes(opt.id)}
                          onCheckedChange={() => toggleBioclim(opt.id)}
                        />
                        <Icon className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-700">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Launch button */}
             <Button
               onClick={handleLaunch}
               disabled={isLaunching || !selectedSpeciesIds.length || !runName.trim() || selectedBioclim.length < 2}
               className="w-full bg-bangor-red hover:bg-bangor-red/90 text-white font-bold gap-2 h-11"
             >
               {isLaunching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
               {isLaunching ? 'Launching…' : 'Run SDM Pipeline'}
             </Button>

             {isLaunching && (
               <ProcessingFeedback
                 label="Initializing SDM Pipeline"
                 detail="Creating run record and queuing job…"
                 tips={[
                   'The pipeline will run through multiple stages: outlier detection, spatial thinning, climate fetching, and MaxEnt modeling.',
                   'You can close this tab and your pipeline will continue running in the background.',
                   'Check back in the Pipeline Runs section to monitor progress.',
                 ]}
               />
             )}
          </div>

          {/* ── RIGHT: Runs & Results ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Pipeline Runs</h2>
              <Button size="sm" variant="ghost" onClick={() => queryClient.invalidateQueries({ queryKey: ['sdmRuns'] })}>
                <RefreshCw className="w-4 h-4 text-slate-400" />
              </Button>
            </div>

            {runs.length === 0 ? (
              <Card className="border-dashed border-2 border-slate-200">
                <CardContent className="py-16 text-center">
                  <Activity className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 font-medium">No SDM runs yet</p>
                  <p className="text-slate-400 text-sm mt-1">Configure and launch a pipeline on the left</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {runs.map(run => (
                  <div key={run.id}>
                    <RunCard
                      run={run}
                      onOpen={id => setOpenRunId(openRunId === id ? null : id)}
                      isOpen={openRunId === run.id}
                      onDelete={handleDelete}
                    />
                    {openRunId === run.id && (
                       <div className="mt-2">
                         {!['completed', 'failed'].includes(run.status) && (
                           <SDMProgressMonitor 
                             runId={run.id}
                             onComplete={() => queryClient.invalidateQueries({ queryKey: ['sdmRuns'] })}
                           />
                         )}
                         {run.status === 'completed' && (
                           <ResultsPanel run={run} navigate={navigate} allSpecies={allSpecies} />
                         )}
                       </div>
                     )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}