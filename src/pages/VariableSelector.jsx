import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Activity, CheckCircle2, AlertTriangle, Info, Copy, Download } from 'lucide-react';
import BangOnLogo from '@/components/BangOnLogo';
import CorrelationHeatmap from '@/components/climate/CorrelationHeatmap';

// ─────────────────────────────────────────────────────────────────────────────
// WorldClim BIO1–BIO19 variable catalogue
// ─────────────────────────────────────────────────────────────────────────────
const BIO_VARS = [
  { id: 'BIO1',  label: 'Annual Mean Temperature',              unit: '°C×10',  category: 'Temperature' },
  { id: 'BIO2',  label: 'Mean Diurnal Range',                   unit: '°C×10',  category: 'Temperature' },
  { id: 'BIO3',  label: 'Isothermality',                        unit: '%',      category: 'Temperature' },
  { id: 'BIO4',  label: 'Temperature Seasonality',              unit: 'SD×100', category: 'Temperature' },
  { id: 'BIO5',  label: 'Max Temp of Warmest Month',            unit: '°C×10',  category: 'Temperature' },
  { id: 'BIO6',  label: 'Min Temp of Coldest Month',            unit: '°C×10',  category: 'Temperature' },
  { id: 'BIO7',  label: 'Temperature Annual Range',             unit: '°C×10',  category: 'Temperature' },
  { id: 'BIO8',  label: 'Mean Temp of Wettest Quarter',         unit: '°C×10',  category: 'Temperature' },
  { id: 'BIO9',  label: 'Mean Temp of Driest Quarter',          unit: '°C×10',  category: 'Temperature' },
  { id: 'BIO10', label: 'Mean Temp of Warmest Quarter',         unit: '°C×10',  category: 'Temperature' },
  { id: 'BIO11', label: 'Mean Temp of Coldest Quarter',         unit: '°C×10',  category: 'Temperature' },
  { id: 'BIO12', label: 'Annual Precipitation',                 unit: 'mm',     category: 'Precipitation' },
  { id: 'BIO13', label: 'Precipitation of Wettest Month',       unit: 'mm',     category: 'Precipitation' },
  { id: 'BIO14', label: 'Precipitation of Driest Month',        unit: 'mm',     category: 'Precipitation' },
  { id: 'BIO15', label: 'Precipitation Seasonality',            unit: 'CV',     category: 'Precipitation' },
  { id: 'BIO16', label: 'Precipitation of Wettest Quarter',     unit: 'mm',     category: 'Precipitation' },
  { id: 'BIO17', label: 'Precipitation of Driest Quarter',      unit: 'mm',     category: 'Precipitation' },
  { id: 'BIO18', label: 'Precipitation of Warmest Quarter',     unit: 'mm',     category: 'Precipitation' },
  { id: 'BIO19', label: 'Precipitation of Coldest Quarter',     unit: 'mm',     category: 'Precipitation' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Pre-computed Pearson correlation matrix for WorldClim BIO1–BIO19
// (based on global land surface values from the literature — Brown 2014,
//  Dormann et al. 2013, Booth et al. 2014)
// ─────────────────────────────────────────────────────────────────────────────
// Index order: BIO1..BIO19
const RAW_CORR = [
//  1     2     3     4     5     6     7     8     9    10    11    12    13    14    15    16    17    18    19
  [ 1.00, 0.39, 0.09,-0.27, 0.89, 0.93,-0.30, 0.76, 0.81, 0.94, 0.96, 0.36, 0.32, 0.26,-0.09, 0.33, 0.26, 0.36, 0.28], // BIO1
  [ 0.39, 1.00, 0.60,-0.60, 0.68, 0.23, 0.40, 0.25, 0.36, 0.52, 0.25,-0.04,-0.02,-0.12, 0.10,-0.04,-0.12,-0.01,-0.07], // BIO2
  [ 0.09, 0.60, 1.00,-0.91, 0.37,-0.12, 0.60,-0.04, 0.10, 0.22,-0.05,-0.35,-0.32,-0.27, 0.23,-0.32,-0.27,-0.15,-0.31], // BIO3
  [-0.27,-0.60,-0.91, 1.00,-0.07, 0.12,-0.57, 0.10,-0.07,-0.17, 0.05, 0.33, 0.30, 0.20,-0.26, 0.30, 0.20, 0.06, 0.26], // BIO4
  [ 0.89, 0.68, 0.37,-0.07, 1.00, 0.71, 0.26, 0.61, 0.71, 0.89, 0.80, 0.17, 0.14, 0.10, 0.01, 0.15, 0.10, 0.18, 0.11], // BIO5
  [ 0.93, 0.23,-0.12, 0.12, 0.71, 1.00,-0.53, 0.77, 0.77, 0.85, 0.97, 0.42, 0.39, 0.31,-0.14, 0.40, 0.31, 0.37, 0.32], // BIO6
  [-0.30, 0.40, 0.60,-0.57, 0.26,-0.53, 1.00,-0.24,-0.15, 0.00,-0.40,-0.29,-0.24,-0.17, 0.18,-0.24,-0.17,-0.18,-0.18], // BIO7
  [ 0.76, 0.25,-0.04, 0.10, 0.61, 0.77,-0.24, 1.00, 0.68, 0.77, 0.73, 0.62, 0.61, 0.43,-0.11, 0.60, 0.43, 0.52, 0.44], // BIO8
  [ 0.81, 0.36, 0.10,-0.07, 0.71, 0.77,-0.15, 0.68, 1.00, 0.83, 0.79, 0.44, 0.41, 0.32,-0.09, 0.41, 0.32, 0.51, 0.29], // BIO9
  [ 0.94, 0.52, 0.22,-0.17, 0.89, 0.85, 0.00, 0.77, 0.83, 1.00, 0.91, 0.37, 0.33, 0.25,-0.06, 0.33, 0.25, 0.37, 0.25], // BIO10
  [ 0.96, 0.25,-0.05, 0.05, 0.80, 0.97,-0.40, 0.73, 0.79, 0.91, 1.00, 0.42, 0.39, 0.30,-0.12, 0.40, 0.30, 0.38, 0.31], // BIO11
  [ 0.36,-0.04,-0.35, 0.33, 0.17, 0.42,-0.29, 0.62, 0.44, 0.37, 0.42, 1.00, 0.96, 0.82,-0.29, 0.96, 0.82, 0.81, 0.84], // BIO12
  [ 0.32,-0.02,-0.32, 0.30, 0.14, 0.39,-0.24, 0.61, 0.41, 0.33, 0.39, 0.96, 1.00, 0.73,-0.38, 0.99, 0.73, 0.77, 0.78], // BIO13
  [ 0.26,-0.12,-0.27, 0.20, 0.10, 0.31,-0.17, 0.43, 0.32, 0.25, 0.30, 0.82, 0.73, 1.00,-0.05, 0.72, 1.00, 0.72, 0.93], // BIO14
  [-0.09, 0.10, 0.23,-0.26, 0.01,-0.14, 0.18,-0.11,-0.09,-0.06,-0.12,-0.29,-0.38,-0.05, 1.00,-0.38,-0.05,-0.16,-0.17], // BIO15
  [ 0.33,-0.04,-0.32, 0.30, 0.15, 0.40,-0.24, 0.60, 0.41, 0.33, 0.40, 0.96, 0.99, 0.72,-0.38, 1.00, 0.72, 0.76, 0.77], // BIO16
  [ 0.26,-0.12,-0.27, 0.20, 0.10, 0.31,-0.17, 0.43, 0.32, 0.25, 0.30, 0.82, 0.73, 1.00,-0.05, 0.72, 1.00, 0.72, 0.93], // BIO17
  [ 0.36,-0.01,-0.15, 0.06, 0.18, 0.37,-0.18, 0.52, 0.51, 0.37, 0.38, 0.81, 0.77, 0.72,-0.16, 0.76, 0.72, 1.00, 0.68], // BIO18
  [ 0.28,-0.07,-0.31, 0.26, 0.11, 0.32,-0.18, 0.44, 0.29, 0.25, 0.31, 0.84, 0.78, 0.93,-0.17, 0.77, 0.93, 0.68, 1.00], // BIO19
];

// ─────────────────────────────────────────────────────────────────────────────
// Greedy forward selection: pick variables with no high correlation to already-selected set
// ─────────────────────────────────────────────────────────────────────────────
function autoSelect(threshold, priorityIds = ['BIO1', 'BIO4', 'BIO12', 'BIO15']) {
  const selected = [];
  // Start with priority vars
  const ordered = [
    ...priorityIds.filter(id => BIO_VARS.find(v => v.id === id)),
    ...BIO_VARS.map(v => v.id).filter(id => !priorityIds.includes(id)),
  ];
  for (const id of ordered) {
    const i = BIO_VARS.findIndex(v => v.id === id);
    const conflicts = selected.some(selId => {
      const j = BIO_VARS.findIndex(v => v.id === selId);
      return Math.abs(RAW_CORR[i][j]) >= threshold;
    });
    if (!conflicts) selected.push(id);
  }
  return selected;
}

// Count correlated pairs among a set
function countConflicts(varIds, threshold) {
  let count = 0;
  for (let a = 0; a < varIds.length; a++) {
    for (let b = a + 1; b < varIds.length; b++) {
      const i = BIO_VARS.findIndex(v => v.id === varIds[a]);
      const j = BIO_VARS.findIndex(v => v.id === varIds[b]);
      if (Math.abs(RAW_CORR[i][j]) >= threshold) count++;
    }
  }
  return count;
}

export default function VariableSelector() {
  const [threshold, setThreshold] = useState(0.7);
  const [selectedVars, setSelectedVars] = useState(() => autoSelect(0.7));
  const [view, setView] = useState('heatmap'); // 'heatmap' | 'list'

  const conflicts = useMemo(() => countConflicts(selectedVars, threshold), [selectedVars, threshold]);
  const allConflictPairs = useMemo(() => {
    const pairs = [];
    for (let a = 0; a < BIO_VARS.length; a++) {
      for (let b = a + 1; b < BIO_VARS.length; b++) {
        if (Math.abs(RAW_CORR[a][b]) >= threshold) {
          pairs.push({ a: BIO_VARS[a].id, b: BIO_VARS[b].id, r: RAW_CORR[a][b] });
        }
      }
    }
    return pairs;
  }, [threshold]);

  const handleToggle = (id) => {
    setSelectedVars(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleAutoSelect = () => {
    setSelectedVars(autoSelect(threshold));
  };

  const copyList = () => {
    navigator.clipboard.writeText(selectedVars.join(', '));
  };

  const downloadList = () => {
    const lines = ['# Selected WorldClim Variables for MAXENT', `# Threshold: |r| < ${threshold}`, `# Generated: ${new Date().toISOString()}`, '', ...selectedVars.map(id => {
      const v = BIO_VARS.find(b => b.id === id);
      return `${id}\t${v.label}\t${v.unit}`;
    })];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'selected_variables.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const hillWinderSet = ['BIO1', 'BIO4', 'BIO12', 'BIO15'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-bangor-red/3">
      {/* Header */}
      <header className="bg-white border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <BangOnLogo size="sm" />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-bangor-red">Variable Correlation Analysis</h1>
            <p className="text-sm text-slate-600">Filter correlated predictors before MAXENT modelling</p>
          </div>
          <Link to={createPageUrl('ClimateProjections')}>
            <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Climate Data</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── LEFT: Controls & Selected Variables ── */}
          <div className="space-y-5">

            {/* Methodology alert */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-slate-700">
                <strong>Hill & Winder (2020)</strong> removed variables with Pearson |r| ≥ 0.7 before fitting MAXENT, retaining only ecologically interpretable, non-redundant predictors.
              </AlertDescription>
            </Alert>

            {/* Threshold slider */}
            <Card className="shadow-md border-slate-200">
              <CardHeader className="pb-2 border-b border-slate-100 bg-gradient-to-r from-bangor-red/8 to-bangor-sun/8">
                <CardTitle className="text-bangor-red text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Correlation Threshold
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Remove pairs with |r| ≥</span>
                  <span className="text-lg font-bold text-bangor-red">{threshold.toFixed(1)}</span>
                </div>
                <Slider
                  min={50} max={95} step={5}
                  value={[Math.round(threshold * 100)]}
                  onValueChange={([v]) => {
                    const t = v / 100;
                    setThreshold(t);
                    setSelectedVars(autoSelect(t));
                  }}
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0.5 (strict)</span>
                  <span className="font-semibold text-bangor-red">0.7 (recommended)</span>
                  <span>0.95 (lenient)</span>
                </div>
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-red-600">{allConflictPairs.length}</span> correlated pairs in full set ·{' '}
                  <span className="font-semibold text-emerald-600">{conflicts}</span> conflicts in selection
                </div>
                <Button className="w-full" onClick={handleAutoSelect}>
                  Auto-Select (greedy)
                </Button>
              </CardContent>
            </Card>

            {/* Hill & Winder core set */}
            <Card className="shadow-md border-emerald-200 bg-emerald-50/50">
              <CardHeader className="pb-2 border-b border-emerald-200">
                <CardTitle className="text-emerald-800 text-sm">Hill & Winder Core Set</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs text-slate-600">The 4 variables used in the published Papio baboon SDM:</p>
                <div className="flex flex-wrap gap-1.5">
                  {hillWinderSet.map(id => {
                    const v = BIO_VARS.find(b => b.id === id);
                    return (
                      <Badge key={id} className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                        {id}: {v.label}
                      </Badge>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                  onClick={() => setSelectedVars(hillWinderSet)}
                >
                  Use This Set
                </Button>
              </CardContent>
            </Card>

            {/* Selected variables list */}
            <Card className="shadow-md border-slate-200">
              <CardHeader className="pb-2 border-b border-slate-100 bg-gradient-to-r from-bangor-red/8 to-bangor-sun/8 flex flex-row items-center justify-between">
                <CardTitle className="text-bangor-red text-sm">
                  Selected Variables ({selectedVars.length})
                </CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={copyList} title="Copy list">
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadList} title="Download">
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 max-h-72 overflow-y-auto">
                {conflicts > 0 && (
                  <div className="mb-2 text-xs text-red-600 flex items-center gap-1 bg-red-50 p-2 rounded">
                    <AlertTriangle className="w-3 h-3" />
                    {conflicts} correlated pairs remain — consider Auto-Select
                  </div>
                )}
                <div className="space-y-1">
                  {BIO_VARS.map(v => {
                    const isSelected = selectedVars.includes(v.id);
                    const hasConflict = isSelected && selectedVars.some(otherId => {
                      if (otherId === v.id) return false;
                      const i = BIO_VARS.findIndex(b => b.id === v.id);
                      const j = BIO_VARS.findIndex(b => b.id === otherId);
                      return Math.abs(RAW_CORR[i][j]) >= threshold;
                    });
                    return (
                      <button
                        key={v.id}
                        onClick={() => handleToggle(v.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all text-xs ${
                          isSelected
                            ? hasConflict
                              ? 'bg-red-50 border border-red-200 text-red-800'
                              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                            : 'bg-slate-50 border border-transparent text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-bold w-10 shrink-0">{v.id}</span>
                        <span className="flex-1 truncate">{v.label}</span>
                        {isSelected && (
                          hasConflict
                            ? <AlertTriangle className="w-3 h-3 shrink-0 text-red-500" />
                            : <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT: Heatmap ── */}
          <div className="xl:col-span-2 space-y-5">
            <Card className="shadow-lg border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-bangor-red/8 to-bangor-sun/8">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-bangor-red text-base flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Pairwise Pearson Correlation Matrix (BIO1–BIO19)
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs">
                    {/* Legend */}
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(255,0,0)' }} />
                      <span className="text-slate-600">r = +1</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-white border border-slate-200" />
                      <span className="text-slate-600">r = 0</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(0,0,255)' }} />
                      <span className="text-slate-600">r = −1</span>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <div className="w-3 h-3 rounded ring-2 ring-black/40" style={{ backgroundColor: 'rgb(255,80,80)' }} />
                      <span className="text-slate-600">|r| ≥ {threshold}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Click a variable label to toggle selection. Outlined cells = correlated pairs above threshold.
                </p>
              </CardHeader>
              <CardContent className="p-4 overflow-auto">
                <CorrelationHeatmap
                  variables={BIO_VARS}
                  matrix={RAW_CORR}
                  threshold={threshold}
                  selectedVars={selectedVars}
                  onToggle={handleToggle}
                />
              </CardContent>
            </Card>

            {/* Correlated pairs table */}
            {allConflictPairs.length > 0 && (
              <Card className="shadow-md border-red-100">
                <CardHeader className="border-b border-red-100 bg-red-50/40 pb-2">
                  <CardTitle className="text-red-700 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Correlated Pairs (|r| ≥ {threshold}) — {allConflictPairs.length} total
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 max-h-56 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {allConflictPairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).map(({ a, b, r }) => {
                      const aSelected = selectedVars.includes(a);
                      const bSelected = selectedVars.includes(b);
                      const bothSelected = aSelected && bSelected;
                      return (
                        <div
                          key={`${a}-${b}`}
                          className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border ${
                            bothSelected
                              ? 'bg-red-100 border-red-300 text-red-800 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <span>{a}</span>
                          <span className="text-slate-400">vs</span>
                          <span>{b}</span>
                          <span className="ml-auto font-mono">{r.toFixed(2)}</span>
                          {bothSelected && <AlertTriangle className="w-3 h-3 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}