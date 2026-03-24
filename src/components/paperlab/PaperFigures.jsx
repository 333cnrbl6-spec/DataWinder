import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const STATUS_COLORS = {
  LC: '#22c55e', NT: '#eab308', VU: '#f97316',
  EN: '#ef4444', CR: '#991b1b', DD: '#94a3b8', EW: '#7c3aed', EX: '#1e293b'
};

const TREND_COLORS = {
  decreasing: '#ef4444', stable: '#3b82f6',
  increasing: '#22c55e', unknown: '#94a3b8'
};

const SOURCE_COLORS = ['#2563eb', '#16a34a', '#d97706'];

export default function PaperFigures({ figures }) {
  if (!figures?.length) return null;

  return (
    <div className="space-y-6">
      {figures.map((fig, i) => {
        const entries = Object.entries(fig.data || {}).filter(([, v]) => v > 0);
        if (!entries.length) return null;

        if (fig.type === 'pie') {
          const pieData = entries.map(([name, value]) => ({ name, value }));
          return (
            <div key={fig.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-600 mb-1">Figure {i + 1}. {fig.title}</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={SOURCE_COLORS[idx % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => v.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        }

        const colorMap = fig.id.includes('status') ? STATUS_COLORS : TREND_COLORS;
        const barData = entries.map(([name, value]) => ({ name, value, fill: colorMap[name] || '#94a3b8' }));

        return (
          <div key={fig.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-600 mb-3">Figure {i + 1}. {fig.title}</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}