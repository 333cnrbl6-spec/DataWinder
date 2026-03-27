import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Minus, MapPin, Database } from 'lucide-react';

const IUCN_COLORS = { LC: '#22c55e', NT: '#84cc16', VU: '#f59e0b', EN: '#f97316', CR: '#ef4444', EW: '#7c3aed', EX: '#1e293b', DD: '#94a3b8' };
const TAXON_COLORS = ['#2563eb', '#dc2626'];

function StatCard({ label, valueA, valueB, taxonA, taxonB, format = (v) => v?.toLocaleString() ?? 'N/A' }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-blue-700">{format(valueA)}</p>
          <p className="text-xs text-blue-600 font-semibold italic mt-0.5">{taxonA}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-red-700">{format(valueB)}</p>
          <p className="text-xs text-red-600 font-semibold italic mt-0.5">{taxonB}</p>
        </div>
      </div>
    </div>
  );
}

function ComparativeBarChart({ title, dataA, dataB, taxonA, taxonB }) {
  // Merge both datasets by name key
  const allKeys = [...new Set([...(dataA || []).map(d => d.name), ...(dataB || []).map(d => d.name)])];
  const merged = allKeys.map(k => ({
    name: k,
    [taxonA]: dataA?.find(d => d.name === k)?.value || 0,
    [taxonB]: dataB?.find(d => d.name === k)?.value || 0,
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-slate-700">{title}</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={merged} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey={taxonA} fill={TAXON_COLORS[0]} radius={[3, 3, 0, 0]} />
          <Bar dataKey={taxonB} fill={TAXON_COLORS[1]} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function IUCNStatusRow({ species, color }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
      <span className="text-xs italic text-slate-700">{species.name}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold" style={{ color: IUCN_COLORS[species.status] || '#64748b' }}>{species.status}</span>
        {species.trend === 'decreasing' && <TrendingDown className="w-3 h-3 text-red-500" />}
        {species.trend === 'increasing' && <TrendingUp className="w-3 h-3 text-green-500" />}
        {(species.trend === 'stable' || species.trend === 'unknown') && <Minus className="w-3 h-3 text-slate-400" />}
      </div>
    </div>
  );
}

export default function ComparativeMetricsPanel({ metrics, figures, rawData }) {
  if (!metrics) return null;
  const { taxon_a_label: taxA, taxon_b_label: taxB } = metrics;
  const speciesA = rawData?.taxon_a?.iucn?.species || [];
  const speciesB = rawData?.taxon_b?.iucn?.species || [];

  const comparativeBarFigs = figures?.filter(f => f.type === 'comparative_bar') || [];
  const imageFigs = figures?.filter(f => f.type === 'image') || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-red-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-600 text-white text-sm px-3 py-1 italic">{taxA}</Badge>
            <span className="text-slate-500 font-bold text-sm">vs</span>
            <Badge className="bg-red-600 text-white text-sm px-3 py-1 italic">{taxB}</Badge>
          </div>
          <span className="text-xs text-slate-500 font-medium">Comparative Analysis</span>
        </div>
        {metrics.conservation_comparison_summary && (
          <p className="text-xs text-slate-600 mt-3 italic border-t border-slate-200 pt-2">{metrics.conservation_comparison_summary}</p>
        )}
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard label="Species Count" valueA={metrics.taxon_a_species_count} valueB={metrics.taxon_b_species_count} taxonA={taxA} taxonB={taxB} />
        <StatCard label="Threatened Species" valueA={metrics.taxon_a_iucn_threatened_count} valueB={metrics.taxon_b_iucn_threatened_count} taxonA={taxA} taxonB={taxB} />
        <StatCard label="Total Occurrences" valueA={metrics.taxon_a_occurrences} valueB={metrics.taxon_b_occurrences} taxonA={taxA} taxonB={taxB} />
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Native Region</p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700"><span className="font-semibold italic">{taxA}:</span> {metrics.taxon_a_region}</p>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700"><span className="font-semibold italic">{taxB}:</span> {metrics.taxon_b_region}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Range maps side by side */}
      {imageFigs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {imageFigs.map((fig, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className={`px-3 py-1.5 text-xs font-bold ${i === 0 ? 'bg-blue-50 text-blue-800 border-b border-blue-100' : 'bg-red-50 text-red-800 border-b border-red-100'}`}>
                {fig.title}
              </div>
              <img src={fig.image_url} alt={fig.title} className="w-full h-auto" loading="lazy" />
              <p className="text-xs text-slate-500 italic px-3 py-2">{fig.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comparative charts */}
      {comparativeBarFigs.map((fig, i) => (
        <ComparativeBarChart
          key={i}
          title={fig.title}
          dataA={fig.data_a}
          dataB={fig.data_b}
          taxonA={taxA}
          taxonB={taxB}
        />
      ))}

      {/* Species lists side by side */}
      {(speciesA.length > 0 || speciesB.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { taxon: taxA, species: speciesA, headerCls: 'bg-blue-50 border-blue-100', iconCls: 'text-blue-500', textCls: 'text-blue-800' },
            { taxon: taxB, species: speciesB, headerCls: 'bg-red-50 border-red-100', iconCls: 'text-red-500', textCls: 'text-red-800' }
          ].map(({ taxon, species, headerCls, iconCls, textCls }) => (
            <div key={taxon} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className={`px-3 py-2 ${headerCls} border-b flex items-center gap-2`}>
                <Database className={`w-3.5 h-3.5 ${iconCls}`} />
                <p className={`text-xs font-bold ${textCls} italic`}>{taxon} — IUCN Species</p>
              </div>
              <div className="p-3 space-y-0.5 max-h-48 overflow-y-auto">
                {species.map((s, i) => <IUCNStatusRow key={i} species={s} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}