import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

const COLORS = [
  '#e50000', '#f5a623', '#4a90d9', '#7ed321', '#9b59b6',
  '#1abc9c', '#e67e22', '#2980b9', '#c0392b', '#27ae60',
];

export default function FeatureImportancePlot({ runs }) {
  // Collect all unique variables across selected runs
  const allVars = new Set();
  runs.forEach(run => {
    const imp = run.results?.feature_importance || run.results?.variable_importance || {};
    Object.keys(imp).forEach(k => allVars.add(k));
  });

  if (allVars.size === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-400">
        <p className="text-sm font-semibold">No feature importance data available.</p>
        <p className="text-xs mt-1">Populate <code className="font-mono">results.feature_importance</code> on completed runs.</p>
      </div>
    );
  }

  // Build chart data — one row per variable
  const data = Array.from(allVars).map(varName => {
    const row = { variable: varName };
    runs.forEach(run => {
      const imp = run.results?.feature_importance || run.results?.variable_importance || {};
      row[run.id] = imp[varName] != null ? Number(imp[varName]).toFixed(3) : null;
    });
    return row;
  }).sort((a, b) => {
    // Sort by first run's value descending
    const firstKey = runs[0]?.id;
    return (b[firstKey] || 0) - (a[firstKey] || 0);
  });

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 36)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 12, bottom: 4 }}
        barCategoryGap="25%"
        barGap={2}
      >
        <XAxis type="number" domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="variable" width={120} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v, name) => [`${(v * 100).toFixed(1)}%`, name]} />
        {runs.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {runs.map((run, i) => (
          <Bar
            key={run.id}
            dataKey={run.id}
            name={run.name || run.species_name}
            fill={COLORS[i % COLORS.length]}
            radius={[0, 3, 3, 0]}
            fillOpacity={0.85}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}