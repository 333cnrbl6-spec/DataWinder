/**
 * GenusComparison — Side-by-side comparison dashboard for two genera
 * Compares: data completeness, occurrence density, conservation status trends
 * ADMIN ONLY
 */

import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2, Lock, BarChart3, RefreshCw, ArrowLeftRight,
  CheckCircle2, AlertTriangle, Database, MapPin, Globe
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const STATUS_COLORS = {
  LC: '#22c55e', NT: '#eab308', VU: '#f97316',
  EN: '#ef4444', CR: '#991b1b', DD: '#94a3b8', EW: '#7c3aed', EX: '#1e293b'
};
const TREND_COLORS = { decreasing: '#ef4444', stable: '#3b82f6', increasing: '#22c55e', unknown: '#94a3b8' };
const GENUS_A_COLOR = '#2563eb';
const GENUS_B_COLOR = '#d946ef';

// ── Shared helpers ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'text-slate-700' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">{children}</p>;
}

// ── Completeness Radar (one per genus, overlaid) ────────────────────────────

function ComparisonRadar({ reportA, reportB, labelA, labelB }) {
  const dims = ['GBIF', 'iNaturalist', 'speciesLink', 'Image', 'IUCN'];
  const calc = (matrix) => {
    if (!matrix?.length) return {};
    const n = matrix.length;
    return {
      GBIF: Math.round(matrix.filter(s => s.has_gbif).length / n * 100),
      iNaturalist: Math.round(matrix.filter(s => s.has_inat).length / n * 100),
      speciesLink: Math.round(matrix.filter(s => s.has_specieslink).length / n * 100),
      Image: Math.round(matrix.filter(s => s.has_image).length / n * 100),
      IUCN: Math.round(matrix.filter(s => s.has_iucn).length / n * 100),
    };
  };
  const scoreA = calc(reportA?.completeness_matrix);
  const scoreB = calc(reportB?.completeness_matrix);
  const data = dims.map(d => ({ subject: d, [labelA]: scoreA[d] || 0, [labelB]: scoreB[d] || 0 }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
        <Radar name={labelA} dataKey={labelA} stroke={GENUS_A_COLOR} fill={GENUS_A_COLOR} fillOpacity={0.25} />
        <Radar name={labelB} dataKey={labelB} stroke={GENUS_B_COLOR} fill={GENUS_B_COLOR} fillOpacity={0.2} />
        <Tooltip formatter={v => `${v}%`} />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Conservation status grouped bar ────────────────────────────────────────

function StatusComparisonChart({ reportA, reportB, labelA, labelB }) {
  const allStatuses = [...new Set([
    ...Object.keys(reportA?.iucn_status_distribution || {}),
    ...Object.keys(reportB?.iucn_status_distribution || {}),
  ])].filter(s => ['LC','NT','VU','EN','CR','DD','EW','EX'].includes(s));

  const data = allStatuses.map(s => ({
    status: s,
    [labelA]: reportA?.iucn_status_distribution?.[s] || 0,
    [labelB]: reportB?.iucn_status_distribution?.[s] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="status" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey={labelA} fill={GENUS_A_COLOR} radius={[3,3,0,0]} />
        <Bar dataKey={labelB} fill={GENUS_B_COLOR} radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Population trend comparison pie side-by-side ───────────────────────────

function TrendPie({ data, label, color }) {
  const entries = Object.entries(data || {}).filter(([,v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
  if (!entries.length) return <p className="text-xs text-slate-400 text-center pt-8">No data</p>;
  return (
    <div>
      <p className="text-xs font-semibold text-center mb-1" style={{ color }}>{label}</p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={entries} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55}
            label={({ name, percent }) => percent > 0.1 ? `${name.slice(0,3)} ${(percent*100).toFixed(0)}%` : ''}>
            {entries.map((e, i) => <Cell key={i} fill={TREND_COLORS[e.name] || '#94a3b8'} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Source breakdown side-by-side bars ─────────────────────────────────────

function SourceComparisonChart({ reportA, reportB, labelA, labelB }) {
  const sources = ['GBIF', 'iNaturalist', 'speciesLink'];
  const data = sources.map(s => ({
    source: s,
    [labelA]: reportA?.source_totals?.[s] || 0,
    [labelB]: reportB?.source_totals?.[s] || 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data}>
        <XAxis dataKey="source" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip formatter={v => v.toLocaleString()} />
        <Legend />
        <Bar dataKey={labelA} fill={GENUS_A_COLOR} radius={[3,3,0,0]} />
        <Bar dataKey={labelB} fill={GENUS_B_COLOR} radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Occurrence density (per-species scatter bar) ────────────────────────────

function DensityChart({ report, label, color }) {
  if (!report?.species?.length) return <p className="text-xs text-slate-400 text-center pt-8">No data</p>;
  const data = [...report.species]
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)
    .map(s => ({
      name: s.name.split(' ').slice(1).join(' ') || s.name,
      total: s.total,
    }));
  return (
    <div>
      <p className="text-xs font-semibold text-center mb-1" style={{ color }}>{label}</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ bottom: 24 }}>
          <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-40} textAnchor="end" />
          <YAxis tick={{ fontSize: 9 }} />
          <Tooltip formatter={v => v.toLocaleString()} />
          <Bar dataKey="total" fill={color} radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Completeness score distribution ────────────────────────────────────────

function CompletenessScoreBar({ report, label, color }) {
  if (!report?.completeness_matrix?.length) return null;
  const buckets = [0,1,2,3,4,5].map(score => ({
    score: `${score}/5`,
    count: report.completeness_matrix.filter(s => s.score === score).length,
  }));
  return (
    <div>
      <p className="text-xs font-semibold text-center mb-1" style={{ color }}>{label}</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={buckets}>
          <XAxis dataKey="score" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill={color} radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Genus input panel ───────────────────────────────────────────────────────

function GenusInput({ label, value, onChange, color, placeholder }) {
  return (
    <div className="flex-1">
      <label className="text-xs font-bold mb-1 block" style={{ color }}>{label}</label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-sm font-medium"
        style={{ borderColor: color, outlineColor: color }}
      />
    </div>
  );
}

// ── Chart section wrapper ───────────────────────────────────────────────────

function ChartSection({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </div>
  );
}

// ══ MAIN PAGE ══════════════════════════════════════════════════════════════

export default function GenusComparison() {
  const [genusA, setGenusA] = useState('Callithrix');
  const [genusB, setGenusB] = useState('Cebus');
  const [inputA, setInputA] = useState('Callithrix');
  const [inputB, setInputB] = useState('Cebus');
  const [reportA, setReportA] = useState(null);
  const [reportB, setReportB] = useState(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [errorA, setErrorA] = useState(null);
  const [errorB, setErrorB] = useState(null);

  const { data: user, isLoading: authLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const fetchReport = async (genus, setReport, setLoading, setError) => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('generateDataWinderReport', { genus });
      setReport(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = () => {
    const a = inputA.trim();
    const b = inputB.trim();
    if (!a || !b) return;
    setGenusA(a);
    setGenusB(b);
    fetchReport(a, setReportA, setLoadingA, setErrorA);
    fetchReport(b, setReportB, setLoadingB, setErrorB);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-bangor-red" />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <Lock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h2 className="font-bold text-slate-700">Access Restricted</h2>
          <p className="text-sm text-slate-500">Admin only</p>
        </div>
      </div>
    );
  }

  const isLoading = loadingA || loadingB;
  const hasData = reportA && reportB;

  const avgA = reportA?.avg_records_per_species || 0;
  const avgB = reportB?.avg_records_per_species || 0;
  const completenessA = reportA?.completeness_matrix
    ? Math.round(reportA.completeness_matrix.reduce((a, s) => a + s.score, 0) / reportA.completeness_matrix.length * 20)
    : null;
  const completenessB = reportB?.completeness_matrix
    ? Math.round(reportB.completeness_matrix.reduce((a, s) => a + s.score, 0) / reportB.completeness_matrix.length * 20)
    : null;
  const totalA = Object.values(reportA?.source_totals || {}).reduce((a, b) => a + b, 0);
  const totalB = Object.values(reportB?.source_totals || {}).reduce((a, b) => a + b, 0);
  const flaggedA = reportA?.outlier_flags?.filter(o => o.flagged).length || 0;
  const flaggedB = reportB?.outlier_flags?.filter(o => o.flagged).length || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-bangor-red rounded-xl flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Genus Comparison Dashboard</h1>
            <p className="text-sm text-slate-500">Compare data quality, completeness and conservation status between two genera</p>
          </div>
          <Badge className="ml-auto bg-red-100 text-red-700 border border-red-200 text-xs shrink-0">Admin Only</Badge>
        </div>

        {/* Genus selector */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <GenusInput
              label="Genus A"
              value={inputA}
              onChange={setInputA}
              color={GENUS_A_COLOR}
              placeholder="e.g. Callithrix"
            />
            <div className="flex items-center justify-center pb-1">
              <ArrowLeftRight className="w-5 h-5 text-slate-300" />
            </div>
            <GenusInput
              label="Genus B"
              value={inputB}
              onChange={setInputB}
              color={GENUS_B_COLOR}
              placeholder="e.g. Cebus"
            />
            <Button
              onClick={handleCompare}
              disabled={isLoading || !inputA.trim() || !inputB.trim()}
              className="bg-bangor-red hover:bg-bangor-red/90 text-white shrink-0 gap-2"
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                : <><BarChart3 className="w-4 h-4" /> Compare</>
              }
            </Button>
          </div>
          {(errorA || errorB) && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {errorA && <p>Genus A error: {errorA}</p>}
              {errorB && <p>Genus B error: {errorB}</p>}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-bangor-red" />
            <p className="text-sm">Fetching data for <strong>{genusA}</strong> and <strong>{genusB}</strong>…</p>
          </div>
        )}

        {!isLoading && !hasData && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <BarChart3 className="w-10 h-10 opacity-30" />
            <p className="text-sm">Enter two genera above and click Compare</p>
          </div>
        )}

        {!isLoading && hasData && (
          <div className="space-y-6">

            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Species in DB"
                value={reportA.species_count}
                sub={`vs ${reportB.species_count}`}
                color={reportA.species_count >= reportB.species_count ? 'text-blue-600' : 'text-slate-700'}
              />
              <StatCard
                label="Total Records"
                value={totalA.toLocaleString()}
                sub={`vs ${totalB.toLocaleString()}`}
                color={totalA >= totalB ? 'text-blue-600' : 'text-slate-700'}
              />
              <StatCard
                label="Avg Completeness"
                value={completenessA != null ? `${completenessA}%` : '—'}
                sub={`vs ${completenessB != null ? completenessB + '%' : '—'}`}
                color={completenessA >= completenessB ? 'text-blue-600' : 'text-slate-700'}
              />
              <StatCard
                label="Outliers Flagged"
                value={flaggedA}
                sub={`vs ${flaggedB} in ${genusB}`}
                color={flaggedA <= flaggedB ? 'text-green-600' : 'text-red-600'}
              />
            </div>

            {/* Legend strip */}
            <div className="flex gap-5 text-xs text-slate-600 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: GENUS_A_COLOR }} />
                {genusA}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: GENUS_B_COLOR }} />
                {genusB}
              </span>
            </div>

            {/* 1. Data Completeness radar (overlaid) */}
            <ChartSection title="1 · Data Completeness — Radar Overlay">
              <ComparisonRadar reportA={reportA} reportB={reportB} labelA={genusA} labelB={genusB} />
              <p className="text-xs text-slate-400 mt-2 italic">
                Percentage of species with data present per source. Larger polygon = more complete dataset.
              </p>
            </ChartSection>

            {/* 2. Completeness score distribution */}
            <ChartSection title="2 · Completeness Score Distribution (0–5 per species)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CompletenessScoreBar report={reportA} label={genusA} color={GENUS_A_COLOR} />
                <CompletenessScoreBar report={reportB} label={genusB} color={GENUS_B_COLOR} />
              </div>
              <p className="text-xs text-slate-400 mt-2 italic">
                Score = number of sources with data present (GBIF, iNat, speciesLink, Image, IUCN) out of 5.
              </p>
            </ChartSection>

            {/* 3. Occurrence density per species */}
            <ChartSection title="3 · Occurrence Density per Species">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DensityChart report={reportA} label={genusA} color={GENUS_A_COLOR} />
                <DensityChart report={reportB} label={genusB} color={GENUS_B_COLOR} />
              </div>
              <p className="text-xs text-slate-400 mt-2 italic">
                Total records per species (GBIF + iNat + speciesLink). Top 12 shown per genus.
              </p>
            </ChartSection>

            {/* 4. Source breakdown grouped bars */}
            <ChartSection title="4 · Occurrence Records by Data Source">
              <SourceComparisonChart reportA={reportA} reportB={reportB} labelA={genusA} labelB={genusB} />
              <p className="text-xs text-slate-400 mt-2 italic">
                Side-by-side total record counts per data provider.
              </p>
            </ChartSection>

            {/* 5. Conservation status grouped bars */}
            <ChartSection title="5 · Conservation Status Distribution (IUCN Red List)">
              <StatusComparisonChart reportA={reportA} reportB={reportB} labelA={genusA} labelB={genusB} />
              <p className="text-xs text-slate-400 mt-2 italic">
                Species count per IUCN category. Grouped by genus for direct comparison.
              </p>
            </ChartSection>

            {/* 6. Population trends side-by-side */}
            <ChartSection title="6 · Population Trend Breakdown">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TrendPie data={reportA?.population_trend_distribution} label={genusA} color={GENUS_A_COLOR} />
                <TrendPie data={reportB?.population_trend_distribution} label={genusB} color={GENUS_B_COLOR} />
              </div>
              <p className="text-xs text-slate-400 mt-2 italic">
                IUCN population trajectory per genus. Decreasing = conservation concern.
              </p>
            </ChartSection>

            {/* 7. Summary comparison table */}
            <ChartSection title="7 · Head-to-Head Summary">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 font-semibold text-slate-600">Metric</th>
                      <th className="text-center py-2 px-3 font-semibold" style={{ color: GENUS_A_COLOR }}>{genusA}</th>
                      <th className="text-center py-2 px-3 font-semibold" style={{ color: GENUS_B_COLOR }}>{genusB}</th>
                      <th className="text-center py-2 px-3 font-semibold text-slate-500">Better</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { metric: 'Species in database', a: reportA.species_count, b: reportB.species_count, higherIsBetter: true, fmt: v => v },
                      { metric: 'Total occurrence records', a: totalA, b: totalB, higherIsBetter: true, fmt: v => v.toLocaleString() },
                      { metric: 'Avg records per species', a: avgA, b: avgB, higherIsBetter: true, fmt: v => v.toLocaleString() },
                      { metric: 'Avg completeness score (%)', a: completenessA, b: completenessB, higherIsBetter: true, fmt: v => v != null ? `${v}%` : '—' },
                      { metric: 'Outliers flagged', a: flaggedA, b: flaggedB, higherIsBetter: false, fmt: v => v },
                      { metric: 'GBIF records', a: reportA.source_totals?.GBIF || 0, b: reportB.source_totals?.GBIF || 0, higherIsBetter: true, fmt: v => v.toLocaleString() },
                      { metric: 'iNaturalist observations', a: reportA.source_totals?.iNaturalist || 0, b: reportB.source_totals?.iNaturalist || 0, higherIsBetter: true, fmt: v => v.toLocaleString() },
                      { metric: 'speciesLink records', a: reportA.source_totals?.speciesLink || 0, b: reportB.source_totals?.speciesLink || 0, higherIsBetter: true, fmt: v => v.toLocaleString() },
                    ].map(({ metric, a, b, higherIsBetter, fmt }) => {
                      const aWins = higherIsBetter ? a > b : a < b;
                      const bWins = higherIsBetter ? b > a : b < a;
                      return (
                        <tr key={metric} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-700">{metric}</td>
                          <td className={`text-center py-2 px-3 font-semibold ${aWins ? '' : 'text-slate-400'}`}
                            style={aWins ? { color: GENUS_A_COLOR } : {}}>
                            {fmt(a)}
                          </td>
                          <td className={`text-center py-2 px-3 font-semibold ${bWins ? '' : 'text-slate-400'}`}
                            style={bWins ? { color: GENUS_B_COLOR } : {}}>
                            {fmt(b)}
                          </td>
                          <td className="text-center py-2 px-3">
                            {aWins && <span className="font-bold text-xs" style={{ color: GENUS_A_COLOR }}>{genusA} ✓</span>}
                            {bWins && <span className="font-bold text-xs" style={{ color: GENUS_B_COLOR }}>{genusB} ✓</span>}
                            {!aWins && !bWins && <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ChartSection>

          </div>
        )}
      </div>
    </div>
  );
}