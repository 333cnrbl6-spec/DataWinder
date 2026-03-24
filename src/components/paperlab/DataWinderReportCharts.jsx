/**
 * DataWinderReportCharts — All recharts figures for the DataWinder visual report
 */
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis
} from 'recharts';

const STATUS_COLORS = {
  LC: '#22c55e', NT: '#eab308', VU: '#f97316',
  EN: '#ef4444', CR: '#991b1b', DD: '#94a3b8', EW: '#7c3aed', EX: '#1e293b'
};
const TREND_COLORS = { decreasing: '#ef4444', stable: '#3b82f6', increasing: '#22c55e', unknown: '#94a3b8' };
const SOURCE_COLORS = { GBIF: '#2563eb', iNaturalist: '#16a34a', speciesLink: '#d97706' };

function ChartCard({ title, caption, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-bold text-slate-700 mb-0.5">{title}</p>
      {caption && <p className="text-xs text-slate-400 mb-3 italic">{caption}</p>}
      {children}
    </div>
  );
}

export function IUCNStatusChart({ data }) {
  const entries = Object.entries(data || {}).filter(([, v]) => v > 0);
  if (!entries.length) return null;
  const barData = entries.map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] || '#94a3b8' }));
  return (
    <ChartCard title="IUCN Conservation Status Distribution" caption="Number of species per Red List category in DataWinder database">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={barData}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {barData.map((e, i) => <Cell key={i} fill={e.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function PopulationTrendChart({ data }) {
  const entries = Object.entries(data || {}).filter(([, v]) => v > 0);
  if (!entries.length) return null;
  const pieData = entries.map(([name, value]) => ({ name, value }));
  return (
    <ChartCard title="Population Trend Breakdown" caption="Species classified by IUCN population trajectory">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
            {pieData.map((e, i) => <Cell key={i} fill={TREND_COLORS[e.name] || '#94a3b8'} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function SourceBreakdownChart({ data }) {
  const entries = Object.entries(data || {}).filter(([, v]) => v > 0);
  if (!entries.length) return null;
  const pieData = entries.map(([name, value]) => ({ name, value }));
  return (
    <ChartCard title="Occurrence Records by Source" caption="Total records aggregated per data provider">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
            {pieData.map((e, i) => <Cell key={i} fill={SOURCE_COLORS[e.name] || '#64748b'} />)}
          </Pie>
          <Tooltip formatter={v => v.toLocaleString()} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function BasisOfRecordChart({ data }) {
  const entries = Object.entries(data || {}).filter(([, v]) => v > 0);
  if (!entries.length) return null;
  const barData = entries.sort((a, b) => b[1] - a[1]).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    value
  }));
  return (
    <ChartCard title="GBIF Basis of Record" caption="How occurrence evidence was collected (specimen, observation, etc.)">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={barData} layout="vertical" margin={{ left: 80 }}>
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
          <Tooltip formatter={v => v.toLocaleString()} />
          <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function OccurrencePerSpeciesChart({ species }) {
  if (!species?.length) return null;
  const data = [...species].sort((a, b) => b.total - a.total).slice(0, 15).map(s => ({
    name: s.name.split(' ').slice(1).join(' ') || s.name,
    GBIF: s.gbif_count,
    iNat: s.inat_count,
    SL: s.specieslink_count,
  }));
  return (
    <ChartCard title="Occurrence Records per Species" caption="Stacked by data source — top 15 species by record count">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ bottom: 20 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={v => v.toLocaleString()} />
          <Legend />
          <Bar dataKey="GBIF" stackId="a" fill="#2563eb" />
          <Bar dataKey="iNat" stackId="a" fill="#16a34a" />
          <Bar dataKey="SL" stackId="a" fill="#d97706" name="speciesLink" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function OutlierFlagsChart({ outliers }) {
  if (!outliers?.length) return null;
  const data = [...outliers].sort((a, b) => a.total - b.total).slice(0, 15).map(o => ({
    name: o.name.split(' ').slice(1).join(' ') || o.name,
    total: o.total,
    flagged: o.flagged,
  }));
  return (
    <ChartCard title="Data Sparsity / Outlier Detection" caption="Species with unusually low record counts are flagged as data-poor outliers">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ bottom: 20 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {data.map((e, i) => (
              <Cell key={i} fill={e.flagged ? '#ef4444' : '#3b82f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Data-poor (outlier flagged)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Sufficient records</span>
      </div>
    </ChartCard>
  );
}

export function CompletenessRadarChart({ matrix }) {
  if (!matrix?.length) return null;
  // Aggregate completeness scores
  const totals = { GBIF: 0, iNaturalist: 0, speciesLink: 0, Image: 0, IUCN: 0 };
  matrix.forEach(s => {
    if (s.has_gbif) totals.GBIF++;
    if (s.has_inat) totals.iNaturalist++;
    if (s.has_specieslink) totals.speciesLink++;
    if (s.has_image) totals.Image++;
    if (s.has_iucn) totals.IUCN++;
  });
  const n = matrix.length;
  const radarData = Object.entries(totals).map(([subject, val]) => ({
    subject, value: Math.round((val / n) * 100)
  }));
  return (
    <ChartCard title="Database Completeness by Data Type" caption="Percentage of species with data present per source (out of all species in genus)">
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
          <Radar name="Completeness %" dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
          <Tooltip formatter={v => `${v}%`} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}