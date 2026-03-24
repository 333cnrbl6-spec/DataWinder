/**
 * DataWinderReport — "What DataWinder Found"
 * Evidence report with visuals woven inline in document order:
 * Cover → Species Gallery → Map → Charts → Completeness Table
 *
 * Accessed via /DataWinderReport?genus=Callithrix
 * ADMIN ONLY — never linked from public nav.
 */

import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2, Lock, Database, MapPin, AlertTriangle,
  CheckCircle2, BarChart3, Globe, Printer, ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataWinderReportMap from '@/components/paperlab/DataWinderReportMap';
import {
  IUCNStatusChart, PopulationTrendChart, SourceBreakdownChart,
  BasisOfRecordChart, OccurrencePerSpeciesChart, OutlierFlagsChart, CompletenessRadarChart
} from '@/components/paperlab/DataWinderReportCharts';

const STATUS_COLORS = {
  LC: 'bg-green-100 text-green-700 border-green-200',
  NT: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  VU: 'bg-orange-100 text-orange-700 border-orange-200',
  EN: 'bg-red-100 text-red-700 border-red-200',
  CR: 'bg-red-800 text-white border-red-900',
  DD: 'bg-slate-100 text-slate-500 border-slate-200',
};
const TREND_ICONS = { decreasing: '↘', stable: '→', increasing: '↗', unknown: '?' };

function SectionHeading({ number, title, subtitle }) {
  return (
    <div className="flex items-start gap-4 mb-5 print:mb-4">
      <span className="w-8 h-8 rounded-full bg-bangor-red text-white text-sm font-bold flex items-center justify-center shrink-0 print:bg-black">{number}</span>
      <div>
        <h2 className="text-base font-bold text-slate-800 print:text-black">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function DataWinderReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const reportRef = useRef(null);

  const params = new URLSearchParams(window.location.search);
  const genus = params.get('genus') || 'Callithrix';
  const autoPrint = params.get('print') === '1';

  const { data: user, isLoading: authLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    base44.functions.invoke('generateDataWinderReport', { genus })
      .then(res => { setReport(res.data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [user, genus]);

  // Auto-trigger print when ?print=1
  useEffect(() => {
    if (autoPrint && report) {
      setTimeout(() => window.print(), 1500);
    }
  }, [autoPrint, report]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-bangor-red" />
        <p className="text-sm text-slate-500">
          {authLoading ? 'Checking access…' : `Building evidence report for ${genus}…`}
        </p>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <Lock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h2 className="font-bold text-slate-700">Access Restricted</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const flaggedCount = report.outlier_flags?.filter(o => o.flagged).length || 0;
  const totalRecords = Object.values(report.source_totals || {}).reduce((a, b) => a + b, 0);
  const speciesWithImages = report.species?.filter(s => s.image_url) || [];

  return (
    <>
      {/* Print-only styles injected globally */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          body { background: white !important; }
          .leaflet-container { height: 280px !important; }
        }
      `}</style>

      {/* Floating toolbar — hidden on print */}
      <div className="no-print sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-bangor-red" />
          <span className="text-sm font-bold text-slate-800">DataWinder Evidence Report</span>
          <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">{genus}</Badge>
          <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs">🔒 DEVELOPER ONLY</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={() => window.history.back()} className="gap-1.5 text-slate-500">
            <ExternalLink className="w-3.5 h-3.5" /> Back
          </Button>
        </div>
      </div>

      {/* ── REPORT DOCUMENT ── */}
      <div ref={reportRef} className="bg-white max-w-5xl mx-auto px-6 sm:px-10 py-10 print:px-8 print:py-6 space-y-12 print:space-y-8">

        {/* ══ COVER ══ */}
        <section>
          <div className="border-b-4 border-bangor-red pb-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-bangor-red mb-2">DataWinder · Internal Evidence Report</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
              What DataWinder Found: {genus}
            </h1>
            <p className="text-slate-500 mt-3 text-sm max-w-2xl">
              A complete audit of multi-source biodiversity data collected, processed and validated by DataWinder
              for the genus <em>{genus}</em> — including georeferenced occurrence records, conservation status,
              population trends, source quality, and data completeness.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-400">
              <span><strong className="text-slate-600">Generated:</strong> {new Date(report.generated_at).toLocaleString('en-GB')}</span>
              <span><strong className="text-slate-600">Species:</strong> {report.species_count}</span>
              <span><strong className="text-slate-600">Total records:</strong> {totalRecords.toLocaleString()}</span>
              <span><strong className="text-slate-600">Map points:</strong> {report.location_points?.length || 0}</span>
              <span className="text-amber-600 font-semibold">⚠ DEVELOPER ONLY — NOT FOR DISTRIBUTION</span>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Species in DB', value: report.species_count, Icon: Globe, bg: 'bg-blue-50', tc: 'text-blue-600' },
              { label: 'Total Records', value: totalRecords.toLocaleString(), Icon: Database, bg: 'bg-green-50', tc: 'text-green-600' },
              { label: 'Georef. Points', value: report.location_points?.length || 0, Icon: MapPin, bg: 'bg-purple-50', tc: 'text-purple-600' },
              { label: 'Outliers Flagged', value: flaggedCount, Icon: AlertTriangle, bg: flaggedCount > 0 ? 'bg-red-50' : 'bg-slate-50', tc: flaggedCount > 0 ? 'text-red-600' : 'text-slate-500' },
            ].map(({ label, value, Icon, bg, tc }) => (
              <div key={label} className={`rounded-xl p-3 flex items-center gap-3 ${bg}`}>
                <Icon className={`w-5 h-5 ${tc} shrink-0`} />
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-xl font-bold ${tc}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ §1 SPECIES GALLERY (images first — visual context) ══ */}
        {speciesWithImages.length > 0 && (
          <section>
            <SectionHeading
              number="1"
              title="Species in the Database"
              subtitle={`${report.species_count} ${genus} species · images sourced from DataWinder database`}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {speciesWithImages.map(s => (
                <div key={s.name} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    src={s.image_url}
                    alt={s.common_name || s.name}
                    className="w-full h-36 object-cover"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-slate-700 italic leading-tight">{s.name}</p>
                    {s.common_name && <p className="text-xs text-slate-400 mt-0.5 truncate">{s.common_name}</p>}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {s.iucn_status && (
                        <Badge className={`text-xs border ${STATUS_COLORS[s.iucn_status] || 'bg-slate-100 text-slate-500'}`}>
                          {s.iucn_status}
                        </Badge>
                      )}
                      {s.population_trend && (
                        <span className="text-xs text-slate-400">{TREND_ICONS[s.population_trend]}</span>
                      )}
                      {s.total > 0 && (
                        <span className="text-xs text-slate-400 ml-auto">{s.total?.toLocaleString()} rec.</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Species without images listed below gallery */}
            {report.species?.filter(s => !s.image_url).length > 0 && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-2">Species without images in database:</p>
                <div className="flex flex-wrap gap-2">
                  {report.species.filter(s => !s.image_url).map(s => (
                    <span key={s.name} className="text-xs italic text-slate-600 bg-white border border-slate-200 rounded-full px-2.5 py-0.5">{s.name}</span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ══ §2 CONSERVATION STATUS (charts inline) ══ */}
        <section className="print-break">
          <SectionHeading
            number="2"
            title="Conservation Status & Population Trends"
            subtitle="IUCN Red List categories and population trajectories across all species"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <IUCNStatusChart data={report.iucn_status_distribution} />
            <PopulationTrendChart data={report.population_trend_distribution} />
          </div>
          <p className="text-xs text-slate-400 mt-3 italic">
            Figure 1. Left: Distribution of IUCN Red List categories. Right: Population trend breakdown. Data sourced from IUCN API via DataWinder.
          </p>
        </section>

        {/* ══ §3 GEOREFERENCED MAP ══ */}
        <section>
          <SectionHeading
            number="3"
            title="Georeferenced Occurrence Records"
            subtitle={`${report.location_points?.length || 0} validated location points from GBIF, iNaturalist and speciesLink`}
          />
          <DataWinderReportMap points={report.location_points || []} />
          <div className="flex gap-5 mt-3 text-xs text-slate-500 flex-wrap">
            {[['#2563eb', 'GBIF'], ['#16a34a', 'iNaturalist'], ['#d97706', 'speciesLink']].map(([col, label]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block border border-white shadow-sm" style={{ background: col }} />
                {label}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2 italic">
            Figure 2. Mapped distribution of all georeferenced occurrence records in DataWinder. Each point represents a validated observation or specimen record.
          </p>
        </section>

        {/* ══ §4 DATA SOURCES (charts inline) ══ */}
        <section className="print-break">
          <SectionHeading
            number="4"
            title="Data Sources & Record Types"
            subtitle="Breakdown of record counts and basis-of-record classifications across data providers"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <SourceBreakdownChart data={report.source_totals} />
            <BasisOfRecordChart data={report.basis_of_record} />
          </div>
          <p className="text-xs text-slate-400 mt-3 italic">
            Figure 3. Left: Total records per data provider. Right: GBIF basis-of-record classifications (PRESERVED_SPECIMEN, HUMAN_OBSERVATION, etc.).
          </p>

          {/* Per-species occurrence chart immediately after — contextually linked */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Record Counts per Species</h3>
            <OccurrencePerSpeciesChart species={report.species} />
            <p className="text-xs text-slate-400 mt-2 italic">
              Figure 4. Stacked occurrence records per species, broken down by data source (GBIF · iNaturalist · speciesLink).
            </p>
          </div>
        </section>

        {/* ══ §5 OUTLIER DETECTION ══ */}
        <section>
          <SectionHeading
            number="5"
            title="Outlier Detection & Data Quality Flags"
            subtitle={`${flaggedCount} species flagged as data-poor or spatially suspect`}
          />
          <OutlierFlagsChart outliers={report.outlier_flags} />
          <p className="text-xs text-slate-400 mt-3 italic">
            Figure 5. Outlier detection results. Species with &lt;5 georeferenced records or high IQR spatial deviation are flagged for review before MAXENT modelling.
          </p>
          {flaggedCount > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs font-semibold text-red-700 mb-2">⚠ Flagged species — recommended action: enrich data before modelling</p>
              <div className="flex flex-wrap gap-2">
                {report.outlier_flags?.filter(o => o.flagged).map(o => (
                  <span key={o.name} className="text-xs italic text-red-600 bg-white border border-red-200 rounded-full px-2.5 py-0.5">{o.name}</span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ══ §6 DATA COMPLETENESS ══ */}
        <section className="print-break">
          <SectionHeading
            number="6"
            title="Data Completeness Assessment"
            subtitle="Radar overview and per-species matrix across all data dimensions"
          />

          {/* Radar chart first for visual overview */}
          <CompletenessRadarChart matrix={report.completeness_matrix} />
          <p className="text-xs text-slate-400 mt-2 mb-6 italic">
            Figure 6. Completeness radar showing percentage of species with data present per source dimension.
          </p>

          {/* Then the detailed table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-600">Species</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-slate-600">GBIF</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-slate-600">iNat</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-slate-600">SpeciesLink</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-slate-600">Image</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-slate-600">IUCN</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-slate-600">Score</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600">Total Records</th>
                </tr>
              </thead>
              <tbody>
                {report.completeness_matrix?.map((s, i) => {
                  const sp = report.species?.[i];
                  return (
                    <tr key={s.name} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 italic text-slate-700 truncate max-w-[160px]">{s.name}</td>
                      {[s.has_gbif, s.has_inat, s.has_specieslink, s.has_image, s.has_iucn].map((v, ci) => (
                        <td key={ci} className="text-center py-2 px-2">
                          {v
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 inline" />
                            : <span className="text-slate-200 text-sm">—</span>}
                        </td>
                      ))}
                      <td className="text-center py-2 px-2">
                        <span className={`font-bold ${s.score >= 4 ? 'text-green-600' : s.score >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
                          {s.score}/5
                        </span>
                      </td>
                      <td className="text-right py-2 px-3 text-slate-500">{sp?.total?.toLocaleString() || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2 italic">
            Table 1. Per-species data completeness. Score 5/5 = data present in all five sources (GBIF, iNaturalist, speciesLink, image, IUCN).
          </p>
        </section>

        {/* ══ FOOTER ══ */}
        <footer className="border-t border-slate-200 pt-5 text-xs text-slate-400 flex flex-col sm:flex-row justify-between gap-2">
          <span>DataWinder Evidence Report · {genus} · {new Date(report.generated_at).toLocaleDateString('en-GB')}</span>
          <span className="text-amber-600 font-semibold">⚠ DEVELOPER ONLY — NOT FOR DISTRIBUTION</span>
        </footer>

      </div>
    </>
  );
}