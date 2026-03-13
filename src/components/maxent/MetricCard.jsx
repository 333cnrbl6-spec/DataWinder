import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const THRESHOLDS = {
  auc:  { excellent: 0.9, good: 0.7 },
  tss:  { excellent: 0.6, good: 0.4 },
};

function getQuality(key, value) {
  const t = THRESHOLDS[key];
  if (!t || value == null) return null;
  if (value >= t.excellent) return { label: 'Excellent', color: 'text-green-700', bg: 'bg-green-50 border-green-200' };
  if (value >= t.good)      return { label: 'Good',      color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
  return                           { label: 'Poor',      color: 'text-red-700',   bg: 'bg-red-50 border-red-200' };
}

export default function MetricCard({ label, value, metricKey, description, unit = '' }) {
  const quality = getQuality(metricKey, value);
  const display = value != null ? `${Number(value).toFixed(3)}${unit}` : '—';

  return (
    <div className={`rounded-xl border p-4 ${quality?.bg ?? 'bg-slate-50 border-slate-200'}`}>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-3xl font-bold text-slate-900 font-mono">{display}</div>
      {quality && (
        <span className={`inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${quality.bg} ${quality.color}`}>
          {quality.label}
        </span>
      )}
      {description && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{description}</p>}
    </div>
  );
}