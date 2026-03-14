import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Info, ChevronDown, BookOpen } from 'lucide-react';

// ── Hill & Winder (2019) J. Biogeography 46:1380–1405
// "Predicting the impacts of climate change on Papio baboon biogeography"
// Bangor University — Key methodology benchmarks:

const BENCHMARK_CRITERIA = [
  {
    id: 'auc',
    label: 'AUC ≥ 0.916',
    description: 'Hill & Winder achieved AUC >0.916 across all six baboon taxa, defining this as the threshold for "excellent overall performance".',
    check: (run) => {
      const auc = run.results?.auc;
      if (auc == null) return { status: 'missing', detail: 'No AUC result recorded yet' };
      if (auc >= 0.916) return { status: 'pass', detail: `AUC = ${Number(auc).toFixed(3)}` };
      if (auc >= 0.8) return { status: 'warn', detail: `AUC = ${Number(auc).toFixed(3)} — below Hill & Winder threshold of 0.916` };
      return { status: 'fail', detail: `AUC = ${Number(auc).toFixed(3)} — well below benchmark` };
    },
  },
  {
    id: 'occurrence_count',
    label: '≥ 50 occurrence records',
    description: 'Hill & Winder used comprehensive GBIF/museum locality datasets. Fewer than 50 records is considered low data quality for a meaningful SDM.',
    check: (run) => {
      const n = run.occurrence_count;
      if (!n) return { status: 'missing', detail: 'Occurrence count not recorded' };
      if (n >= 50) return { status: 'pass', detail: `${n} occurrence records` };
      if (n >= 10) return { status: 'warn', detail: `${n} records — Hill & Winder recommend ≥50 for robust models` };
      return { status: 'fail', detail: `${n} records — too few for a reliable model` };
    },
  },
  {
    id: 'variable_types',
    label: 'Bioclimatic + Altitude + Vegetation layers',
    description: 'Hill & Winder combined WorldClim bioclimatic variables, altitude, and vegetation (NDVI/land cover) as the three layer categories for each model.',
    check: (run) => {
      const names = (run.climate_dataset_names || []).map(n => n.toLowerCase());
      const hasBio = names.some(n => n.includes('bio') || n.includes('bioclim') || n.includes('worldclim') || n.includes('temperature') || n.includes('precipitation'));
      const hasAlt = names.some(n => n.includes('alt') || n.includes('elev') || n.includes('dem') || n.includes('srtm') || n.includes('topograph'));
      const hasVeg = names.some(n => n.includes('ndvi') || n.includes('vegetation') || n.includes('land cover') || n.includes('landcover') || n.includes('evi'));
      const count = [hasBio, hasAlt, hasVeg].filter(Boolean).length;
      const missing = [!hasBio && 'bioclimatic', !hasAlt && 'altitude', !hasVeg && 'vegetation'].filter(Boolean);
      if (names.length === 0) return { status: 'missing', detail: 'No climate layers recorded' };
      if (count === 3) return { status: 'pass', detail: 'Bioclimatic, altitude and vegetation layers all present' };
      if (count === 2) return { status: 'warn', detail: `Missing: ${missing.join(', ')}` };
      return { status: 'fail', detail: `Missing: ${missing.join(', ')} — Hill & Winder require all three layer types` };
    },
  },
  {
    id: 'gcm_coverage',
    label: '≥ 3 GCMs for future projections',
    description: 'Hill & Winder ran three General Circulation Models (MIROC-ESM, CCSM4, HadGEM2-ES) to capture a range of possible climate futures.',
    check: (run) => {
      const names = (run.climate_dataset_names || []).map(n => n.toLowerCase());
      const gcms = ['miroc', 'ccsm', 'hadgem', 'ipsl', 'gfdl', 'mpi', 'cnrm', 'access', 'bcc', 'cmip'];
      const found = gcms.filter(g => names.some(n => n.includes(g)));
      if (names.length === 0) return { status: 'missing', detail: 'No layer data to evaluate GCM coverage' };
      const isFuture = names.some(n => n.includes('ssp') || n.includes('rcp') || n.includes('2050') || n.includes('2070') || n.includes('future'));
      if (!isFuture) return { status: 'warn', detail: 'No future projection layers detected — Hill & Winder benchmark requires multi-GCM future runs' };
      if (found.length >= 3) return { status: 'pass', detail: `GCMs detected: ${found.join(', ')}` };
      if (found.length > 0) return { status: 'warn', detail: `Only ${found.length} GCM(s) detected — Hill & Winder used 3` };
      return { status: 'warn', detail: 'GCM names not identifiable from layer names — confirm ≥3 GCMs are used' };
    },
  },
  {
    id: 'rcp_coverage',
    label: 'Both RCP2.6 and RCP6.0 (or equivalent SSPs)',
    description: 'Hill & Winder used RCP2.6 (low emissions) and RCP6.0 (high emissions) to bracket a range of scenarios. SSP1-2.6 and SSP3-7.0 are broadly equivalent.',
    check: (run) => {
      const names = (run.climate_dataset_names || []).map(n => n.toLowerCase());
      const isFuture = names.some(n => n.includes('ssp') || n.includes('rcp') || n.includes('2050') || n.includes('2070'));
      if (!isFuture) return { status: 'warn', detail: 'No future scenario layers detected' };
      const hasLow = names.some(n => n.includes('rcp2') || n.includes('rcp 2') || n.includes('ssp1') || n.includes('ssp 1') || n.includes('2.6'));
      const hasHigh = names.some(n => n.includes('rcp6') || n.includes('rcp 6') || n.includes('ssp3') || n.includes('ssp5') || n.includes('6.0') || n.includes('7.0') || n.includes('8.5'));
      if (hasLow && hasHigh) return { status: 'pass', detail: 'Low and high emission scenarios both detected' };
      if (hasLow || hasHigh) return { status: 'warn', detail: `Only one emission scenario detected — Hill & Winder used both RCP2.6 and RCP6.0` };
      return { status: 'warn', detail: 'Scenario identifiers not found in layer names — confirm RCP/SSP coverage' };
    },
  },
  {
    id: 'time_horizons',
    label: 'Both 2050 and 2070 time horizons',
    description: 'Hill & Winder projected to both 2050 and 2070 to show how habitat suitability changes over time under each scenario.',
    check: (run) => {
      const names = (run.climate_dataset_names || []).map(n => n.toLowerCase());
      const has2050 = names.some(n => n.includes('2050') || n.includes('2041') || n.includes('2060'));
      const has2070 = names.some(n => n.includes('2070') || n.includes('2061') || n.includes('2080'));
      if (!names.some(n => n.includes('20'))) return { status: 'warn', detail: 'No time horizon detected in layer names' };
      if (has2050 && has2070) return { status: 'pass', detail: '2050 and 2070 projections both present' };
      if (has2050 || has2070) return { status: 'warn', detail: `Only one time horizon detected — Hill & Winder used both 2050 and 2070` };
      return { status: 'warn', detail: 'Time horizons not identifiable from layer names' };
    },
  },
  {
    id: 'variable_importance',
    label: 'Variable importance (jackknife) reported',
    description: 'Hill & Winder reported the % contribution of each variable (e.g. altitude 41.6% for Guinea baboons) using MAXENT\'s jackknife procedure.',
    check: (run) => {
      const fi = run.results?.feature_importance ?? run.results?.variable_importance;
      if (!fi) return { status: 'missing', detail: 'No variable importance data in results — check MAXENT output includes jackknife contributions' };
      const entries = Object.entries(fi);
      if (entries.length === 0) return { status: 'fail', detail: 'Feature importance object is empty' };
      const topVar = entries.sort((a, b) => b[1] - a[1])[0];
      return { status: 'pass', detail: `${entries.length} variables scored — top: ${topVar[0]} (${Number(topVar[1]).toFixed(1)}%)` };
    },
  },
  {
    id: 'replicates',
    label: 'Multiple replicates for validation',
    description: 'Hill & Winder used replicated cross-validation to ensure robust performance estimates rather than a single model run.',
    check: (run) => {
      const reps = run.parameters?.replicates ?? run.results?.replicates_completed;
      if (reps == null) return { status: 'missing', detail: 'Replicate count not recorded' };
      if (reps >= 5) return { status: 'pass', detail: `${reps} replicates` };
      if (reps >= 2) return { status: 'warn', detail: `${reps} replicate(s) — Hill & Winder recommend ≥5 for stable AUC estimates` };
      return { status: 'fail', detail: '1 replicate — add cross-validation replicates to match Hill & Winder standards' };
    },
  },
];

const STATUS_CONFIG = {
  pass:    { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50 border-green-200',  badge: 'bg-green-100 text-green-700' },
  warn:    { icon: AlertTriangle, color: 'text-amber-500',  bg: 'bg-amber-50 border-amber-200',  badge: 'bg-amber-100 text-amber-700' },
  fail:    { icon: XCircle,       color: 'text-red-500',    bg: 'bg-red-50 border-red-200',      badge: 'bg-red-100 text-red-700'     },
  missing: { icon: Info,          color: 'text-slate-400',  bg: 'bg-slate-50 border-slate-200',  badge: 'bg-slate-100 text-slate-500' },
};

function CriterionRow({ criterion, result }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[result.status];
  const Icon = cfg.icon;
  return (
    <div className={`rounded-lg border ${cfg.bg} overflow-hidden`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:brightness-95 transition-all"
        onClick={() => setExpanded(v => !v)}
      >
        <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
        <span className="flex-1 text-sm font-semibold text-slate-800">{criterion.label}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cfg.badge}`}>
          {result.status}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-0 space-y-1 text-xs border-t border-current/10">
          <p className="text-slate-600 mt-2">{result.detail}</p>
          <p className="text-slate-400 italic">{criterion.description}</p>
        </div>
      )}
    </div>
  );
}

function RunBenchmark({ run }) {
  const results = BENCHMARK_CRITERIA.map(c => ({ criterion: c, result: c.check(run) }));
  const pass  = results.filter(r => r.result.status === 'pass').length;
  const warn  = results.filter(r => r.result.status === 'warn').length;
  const fail  = results.filter(r => r.result.status === 'fail').length;
  const total = BENCHMARK_CRITERIA.length;
  const score = Math.round((pass + warn * 0.5) / total * 100);

  const scoreColor = score >= 80 ? 'text-green-700' : score >= 50 ? 'text-amber-600' : 'text-red-600';
  const scoreBg    = score >= 80 ? 'bg-green-50 border-green-200' : score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <div className="space-y-3">
      {/* Score header */}
      <div className={`rounded-xl border p-4 flex flex-wrap items-center gap-4 ${scoreBg}`}>
        <div>
          <div className={`text-3xl font-bold ${scoreColor}`}>{score}%</div>
          <div className="text-xs text-slate-500">Hill & Winder compliance</div>
        </div>
        <div className="flex gap-3 flex-wrap text-xs">
          <span className="flex items-center gap-1 text-green-700 font-semibold"><CheckCircle className="w-3.5 h-3.5" />{pass} passed</span>
          <span className="flex items-center gap-1 text-amber-600 font-semibold"><AlertTriangle className="w-3.5 h-3.5" />{warn} warnings</span>
          {fail > 0 && <span className="flex items-center gap-1 text-red-600 font-semibold"><XCircle className="w-3.5 h-3.5" />{fail} failed</span>}
        </div>
        <div className="ml-auto text-xs text-slate-500 italic max-w-xs hidden sm:block">
          Run: <strong className="not-italic text-slate-700">{run.name || run.species_name}</strong>
        </div>
      </div>

      {/* Criteria rows */}
      <div className="space-y-2">
        {results.map(({ criterion, result }) => (
          <CriterionRow key={criterion.id} criterion={criterion} result={result} />
        ))}
      </div>
    </div>
  );
}

export default function HillWinderBenchmark({ runs = [] }) {
  const [selectedRunIdx, setSelectedRunIdx] = useState(0);
  const run = runs[selectedRunIdx];

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-amber-100/50 py-3 px-5">
        <CardTitle className="text-slate-800 text-sm font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-600" />
          Hill &amp; Winder (2019) Benchmark
          <Badge variant="outline" className="ml-auto text-xs text-amber-700 border-amber-300">J. Biogeography 46:1380–1405</Badge>
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          Scores each run against the methodology of Hill &amp; Winder (2019) — <em>Bangor University's</em> published MAXENT framework for SDMs under climate change. Click any criterion to expand.
        </p>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {runs.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Select runs from the left panel to benchmark them.
          </div>
        ) : (
          <>
            {/* Run tabs */}
            {runs.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {runs.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRunIdx(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      selectedRunIdx === i
                        ? 'bg-bangor-red text-white border-bangor-red'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-bangor-red/40'
                    }`}
                  >
                    {r.name || r.species_name || `Run ${i + 1}`}
                  </button>
                ))}
              </div>
            )}

            {run && <RunBenchmark run={run} />}

            {/* Citation footer */}
            <p className="text-xs text-slate-400 italic border-t border-slate-100 pt-3">
              Reference: Hill SE, Winder IC (2019). Predicting the impacts of climate change on Papio baboon biogeography: Are widespread, generalist primates 'safe'? <em>Journal of Biogeography</em>, 46(7), 1380–1405. doi:10.1111/jbi.13582
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}