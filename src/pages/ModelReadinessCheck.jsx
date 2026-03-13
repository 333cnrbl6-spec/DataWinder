import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronRight,
  Database, Filter, Layers, Cpu, ClipboardList, ExternalLink, Info
} from 'lucide-react';

// ─── Checklist item component ─────────────────────────────────────────────────
function CheckItem({ icon: Icon, label, status, detail, linkLabel, linkTo }) {
  const cfg = {
    pass:    { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700',  badge: 'bg-emerald-100 text-emerald-800',  Icon: CheckCircle2,    iconColor: 'text-emerald-500' },
    warn:    { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',    badge: 'bg-amber-100 text-amber-800',      Icon: AlertTriangle,   iconColor: 'text-amber-500'  },
    fail:    { bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700',      badge: 'bg-red-100 text-red-800',          Icon: XCircle,         iconColor: 'text-red-500'    },
    pending: { bg: 'bg-slate-50',    border: 'border-slate-200',   text: 'text-slate-500',    badge: 'bg-slate-100 text-slate-600',      Icon: Info,            iconColor: 'text-slate-400'  },
  }[status];

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}>
      <cfg.Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-sm font-semibold text-slate-800">{label}</span>
        </div>
        <p className={`text-xs mt-0.5 ${cfg.text}`}>{detail}</p>
      </div>
      {linkLabel && linkTo && (
        <Link to={linkTo}>
          <Button size="sm" variant="outline" className="shrink-0 text-xs h-7 gap-1 border-slate-300">
            {linkLabel} <ExternalLink className="w-3 h-3" />
          </Button>
        </Link>
      )}
    </div>
  );
}

// ─── Overall badge ────────────────────────────────────────────────────────────
function ReadinessBadge({ score }) {
  if (score === 5) return <Badge className="bg-emerald-600 text-white text-sm px-3 py-1">✅ Ready to Model</Badge>;
  if (score >= 3)  return <Badge className="bg-amber-500 text-white text-sm px-3 py-1">⚠️ Almost Ready</Badge>;
  return <Badge className="bg-red-600 text-white text-sm px-3 py-1">❌ Not Ready</Badge>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ModelReadinessCheck() {
  const [selectedId, setSelectedId] = useState('');

  const { data: species = [] } = useQuery({
    queryKey: ['species-list'],
    queryFn: () => base44.entities.Species.list('scientific_name', 200),
  });

  const { data: exports = [] } = useQuery({
    queryKey: ['exported-files'],
    queryFn: () => base44.entities.ExportedFile.list('-created_date', 100),
    enabled: !!selectedId,
  });

  const { data: runs = [] } = useQuery({
    queryKey: ['maxent-runs'],
    queryFn: () => base44.entities.MaxentRun.list('-created_date', 100),
    enabled: !!selectedId,
  });

  const sp = useMemo(() => species.find(s => s.id === selectedId), [species, selectedId]);

  const checks = useMemo(() => {
    if (!sp) return null;

    const inatCount = sp.observations?.length || 0;
    const gbifCount = sp.gbif_occurrences?.length || 0;
    const totalOcc = inatCount + gbifCount;

    // Check exports for this species
    const spExports = exports.filter(e =>
      e.species_names?.includes(sp.scientific_name) && e.status === 'ready'
    );
    const thinnedExport = spExports.length > 0;

    // MAXENT runs for this species
    const spRuns = runs.filter(r => r.species_id === sp.id || r.species_name === sp.scientific_name);
    const hasRun = spRuns.length > 0;

    return [
      {
        icon: Database,
        label: 'Occurrence Records Collected',
        status: totalOcc >= 30 ? 'pass' : totalOcc >= 10 ? 'warn' : 'fail',
        detail: totalOcc === 0
          ? 'No occurrence records found. Fetch iNaturalist and GBIF data first.'
          : totalOcc < 10
          ? `Only ${totalOcc} records — MAXENT requires a minimum of ~10, ideally 30+.`
          : totalOcc < 30
          ? `${totalOcc} records (${inatCount} iNat + ${gbifCount} GBIF) — usable but limited. 30+ recommended.`
          : `${totalOcc} records (${inatCount} iNat + ${gbifCount} GBIF) — sufficient for MAXENT.`,
        linkLabel: totalOcc === 0 ? 'Fetch Data' : null,
        linkTo: createPageUrl('SavedData'),
      },
      {
        icon: Filter,
        label: 'Outlier Review Completed',
        status: sp.observations?.length > 0 || sp.gbif_occurrences?.length > 0 ? 'warn' : 'pending',
        detail: 'Run the outlier scan to flag and remove geographic anomalies before modelling. Mark as done once reviewed.',
        linkLabel: 'Outlier Scan',
        linkTo: createPageUrl('OutlierScanAll'),
      },
      {
        icon: Layers,
        label: 'Spatial Thinning Applied & Data Exported',
        status: thinnedExport ? 'pass' : 'fail',
        detail: thinnedExport
          ? `${spExports.length} export(s) found for this species — spatial thinning applied.`
          : 'No data export found. Use Data Prep to apply spatial thinning and generate occurrence files.',
        linkLabel: thinnedExport ? null : 'Data Prep',
        linkTo: createPageUrl('DataPreparation'),
      },
      {
        icon: ClipboardList,
        label: 'Environmental Variables Selected',
        status: 'warn',
        detail: 'Use the Variable Filter to remove correlated predictors (|r| ≥ 0.7) and note the selected BIO variables.',
        linkLabel: 'Variable Filter',
        linkTo: createPageUrl('VariableSelector'),
      },
      {
        icon: Cpu,
        label: 'MAXENT Run Configured',
        status: hasRun ? 'pass' : 'fail',
        detail: hasRun
          ? `${spRuns.length} run(s) found — most recent: "${spRuns[0].name}" (${spRuns[0].status}).`
          : 'No MAXENT run configured for this species yet.',
        linkLabel: hasRun ? null : 'Configure Run',
        linkTo: createPageUrl('MAXENTModeler'),
      },
    ];
  }, [sp, exports, runs]);

  const score = checks ? checks.filter(c => c.status === 'pass').length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-bangor-red/3">
      {/* Header */}
      <header className="bg-white border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-bangor-red">Pre-Modelling Readiness Check</h1>
          <p className="text-sm text-slate-600">Verify all pipeline steps are complete before running MAXENT</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Species selector */}
        <Card className="shadow-md border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-bangor-red/8 to-bangor-sun/8">
            <CardTitle className="text-bangor-red text-sm">Select Species</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-bangor-red/30"
            >
              <option value="">— choose a species —</option>
              {species.map(s => (
                <option key={s.id} value={s.id}>
                  {s.scientific_name}{s.common_name ? ` (${s.common_name})` : ''}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Checklist */}
        {sp && checks && (
          <>
            {/* Summary bar */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm">
              <div>
                <p className="font-bold text-slate-900 italic">{sp.scientific_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{score} of 5 checks passed</p>
              </div>
              <ReadinessBadge score={score} />
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  score === 5 ? 'bg-emerald-500' : score >= 3 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${(score / 5) * 100}%` }}
              />
            </div>

            {/* Check items */}
            <div className="space-y-3">
              {checks.map((c, i) => (
                <CheckItem key={i} {...c} />
              ))}
            </div>

            {/* Go to modeller CTA */}
            {score === 5 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-emerald-800">All checks passed!</p>
                  <p className="text-sm text-emerald-700 mt-0.5">This species is ready for MAXENT modelling.</p>
                </div>
                <Link to={createPageUrl('MAXENTModeler')}>
                  <Button className="bg-emerald-600 border-emerald-600 text-white shrink-0">
                    Open MAXENT Modeller <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}

        {!selectedId && (
          <div className="text-center text-slate-400 py-16 text-sm">
            Select a species above to see its modelling readiness checklist
          </div>
        )}

      </main>
    </div>
  );
}