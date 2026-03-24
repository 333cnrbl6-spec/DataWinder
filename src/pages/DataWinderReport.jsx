/**
 * DataWinderReport — "What DataWinder Found"
 * A rich visual companion to the Academic Paper showing all data,
 * maps, charts, images, outlier detection and completeness that
 * DataWinder itself collected and processed.
 *
 * Accessed via /DataWinderReport?genus=Callithrix
 * ADMIN ONLY — never linked from public nav.
 */

import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Lock, Database, MapPin, Image, AlertTriangle, CheckCircle2, BarChart3, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import DataWinderReportMap from '@/components/paperlab/DataWinderReportMap';
import {
  IUCNStatusChart, PopulationTrendChart, SourceBreakdownChart,
  BasisOfRecordChart, OccurrencePerSpeciesChart, OutlierFlagsChart, CompletenessRadarChart
} from '@/components/paperlab/DataWinderReportCharts';

const STATUS_LABELS = { LC: 'Least Concern', NT: 'Near Threatened', VU: 'Vulnerable', EN: 'Endangered', CR: 'Critically Endangered', EX: 'Extinct', EW: 'Extinct in Wild', DD: 'Data Deficient', NE: 'Not Evaluated' };
const STATUS_COLORS = { LC: 'bg-green-100 text-green-700', NT: 'bg-yellow-100 text-yellow-700', VU: 'bg-orange-100 text-orange-700', EN: 'bg-red-100 text-red-700', CR: 'bg-red-900 text-white', DD: 'bg-slate-100 text-slate-500' };
const TREND_ICONS = { decreasing: '↘', stable: '→', increasing: '↗', unknown: '?' };

export default function DataWinderReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const genus = params.get('genus') || 'Callithrix';

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-bangor-red" />
        <p className="text-sm text-slate-500">
          {authLoading ? 'Checking access…' : `Building DataWinder visual report for ${genus}…`}
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-bangor-red/10 rounded-xl">
                <Database className="w-6 h-6 text-bangor-red" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900">DataWinder Evidence Report</h1>
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold">
                    {genus}
                  </Badge>
                  <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs font-bold">
                    🔒 DEVELOPER ONLY
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  Visual record of everything DataWinder collected — maps, occurrence charts, data quality, species images
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-400 shrink-0">
              Generated {new Date(report.generated_at).toLocaleString('en-GB')}
            </div>
          </div>

          {/* KPI strip */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
            { label: 'Species in DB', value: report.species_count, Icon: Globe, bg: 'bg-blue-50', tc: 'text-blue-600' },
            { label: 'Total Records', value: totalRecords.toLocaleString(), Icon: Database, bg: 'bg-green-50', tc: 'text-green-600' },
            { label: 'Location Points', value: report.location_points?.length || 0, Icon: MapPin, bg: 'bg-purple-50', tc: 'text-purple-600' },
            { label: 'Data-poor Outliers', value: flaggedCount, Icon: AlertTriangle, bg: flaggedCount > 0 ? 'bg-red-50' : 'bg-slate-50', tc: flaggedCount > 0 ? 'text-red-600' : 'text-slate-500' },
            ].map(({ label, value, Icon, bg, tc }) => (
            <div key={label} className={`rounded-xl p-3 flex items-center gap-3 ${bg}`}>
              <Icon className={`w-5 h-5 ${tc} shrink-0`} />
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-lg font-bold ${color.split(' ')[0]}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-bangor-red" />
            Georeferenced Occurrence Records
            <span className="text-xs font-normal text-slate-400 ml-1">({report.location_points?.length || 0} points from GBIF · iNaturalist · speciesLink)</span>
          </h2>
          <DataWinderReportMap points={report.location_points || []} />
          <div className="flex gap-4 mt-3 text-xs text-slate-500 flex-wrap">
            {[['#2563eb', 'GBIF'], ['#16a34a', 'iNaturalist'], ['#d97706', 'speciesLink']].map(([col, label]) => (
              <span key={label} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: col }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <IUCNStatusChart data={report.iucn_status_distribution} />
          <PopulationTrendChart data={report.population_trend_distribution} />
          <SourceBreakdownChart data={report.source_totals} />
          <BasisOfRecordChart data={report.basis_of_record} />
          <div className="md:col-span-2">
            <OccurrencePerSpeciesChart species={report.species} />
          </div>
          <OutlierFlagsChart outliers={report.outlier_flags} />
          <CompletenessRadarChart matrix={report.completeness_matrix} />
        </div>

        {/* Species image gallery */}
        {report.species?.some(s => s.image_url) && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
              <Image className="w-4 h-4 text-bangor-red" />
              Species Image Gallery
              <span className="text-xs font-normal text-slate-400 ml-1">(from DataWinder database)</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {report.species.filter(s => s.image_url).map(s => (
                <div key={s.name} className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    src={s.image_url}
                    alt={s.common_name || s.name}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div className="p-2">
                    <p className="text-xs font-semibold text-slate-700 truncate italic">{s.name}</p>
                    {s.common_name && <p className="text-xs text-slate-400 truncate">{s.common_name}</p>}
                    <Badge className={`text-xs mt-1 ${STATUS_COLORS[s.iucn_status] || 'bg-slate-100 text-slate-500'}`}>
                      {s.iucn_status} {TREND_ICONS[s.population_trend] || ''}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completeness table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-bangor-red" />
            Data Completeness Matrix
            <span className="text-xs font-normal text-slate-400 ml-1">per species</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 font-semibold text-slate-600">Species</th>
                  <th className="text-center py-2 px-2 font-semibold text-slate-600">GBIF</th>
                  <th className="text-center py-2 px-2 font-semibold text-slate-600">iNat</th>
                  <th className="text-center py-2 px-2 font-semibold text-slate-600">SL</th>
                  <th className="text-center py-2 px-2 font-semibold text-slate-600">Image</th>
                  <th className="text-center py-2 px-2 font-semibold text-slate-600">IUCN</th>
                  <th className="text-center py-2 px-2 font-semibold text-slate-600">Score</th>
                  <th className="text-right py-2 font-semibold text-slate-600">Records</th>
                </tr>
              </thead>
              <tbody>
                {report.completeness_matrix?.map((s, i) => {
                  const sp = report.species[i];
                  return (
                    <tr key={s.name} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 pr-4 italic text-slate-700 truncate max-w-[160px]">{s.name}</td>
                      {[s.has_gbif, s.has_inat, s.has_specieslink, s.has_image, s.has_iucn].map((v, ci) => (
                        <td key={ci} className="text-center py-2 px-2">
                          {v
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 inline" />
                            : <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                      <td className="text-center py-2 px-2">
                        <span className={`font-bold ${s.score >= 4 ? 'text-green-600' : s.score >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
                          {s.score}/5
                        </span>
                      </td>
                      <td className="text-right py-2 text-slate-500">
                        {sp?.total?.toLocaleString() || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}