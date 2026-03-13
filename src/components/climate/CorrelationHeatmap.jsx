import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';

// Color scale: -1 (blue) → 0 (white) → +1 (red)
function corrColor(r) {
  const abs = Math.abs(r);
  if (r > 0) {
    const g = Math.round(255 * (1 - abs));
    return `rgb(255,${g},${g})`;
  } else {
    const g = Math.round(255 * (1 - abs));
    return `rgb(${g},${g},255)`;
  }
}

function textColor(r) {
  return Math.abs(r) > 0.5 ? 'text-white' : 'text-slate-700';
}

export default function CorrelationHeatmap({ variables, matrix, threshold = 0.7, selectedVars, onToggle }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="overflow-auto">
      <table className="border-collapse text-xs" style={{ minWidth: variables.length * 36 + 80 }}>
        <thead>
          <tr>
            <th className="w-20 min-w-[80px]" />
            {variables.map((v, j) => (
              <th
                key={v.id}
                className={`w-9 h-9 text-center font-bold cursor-pointer transition-opacity ${
                  selectedVars && !selectedVars.includes(v.id) ? 'opacity-30' : ''
                }`}
                onClick={() => onToggle && onToggle(v.id)}
                title={v.label}
              >
                <span className="block truncate" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 60, lineHeight: '36px' }}>
                  {v.id}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variables.map((vi, i) => (
            <tr key={vi.id}>
              <td
                className={`pr-2 font-bold text-right text-xs cursor-pointer transition-opacity ${
                  selectedVars && !selectedVars.includes(vi.id) ? 'opacity-30' : ''
                }`}
                onClick={() => onToggle && onToggle(vi.id)}
              >
                {vi.id}
              </td>
              {variables.map((vj, j) => {
                const r = matrix[i][j];
                const isHigh = i !== j && Math.abs(r) >= threshold;
                const isDiag = i === j;
                const dimmed = selectedVars && (!selectedVars.includes(vi.id) || !selectedVars.includes(vj.id));
                return (
                  <td
                    key={vj.id}
                    className={`w-9 h-9 text-center cursor-default transition-all ${textColor(r)} ${
                      isHigh ? 'ring-2 ring-offset-0 ring-black/30' : ''
                    } ${dimmed ? 'opacity-20' : ''}`}
                    style={{ backgroundColor: isDiag ? '#334155' : corrColor(r) }}
                    title={isDiag ? vi.label : `${vi.id} vs ${vj.id}: r = ${r.toFixed(2)}`}
                    onMouseEnter={() => setHovered({ i, j, r, a: vi.id, b: vj.id })}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {isDiag ? (
                      <span className="text-white font-bold text-[9px]">1</span>
                    ) : (
                      <span className="text-[9px] font-semibold">{r.toFixed(1)}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {hovered && hovered.i !== hovered.j && (
        <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded px-3 py-1.5 border border-slate-200 inline-block">
          <strong>{hovered.a}</strong> vs <strong>{hovered.b}</strong>: r = {hovered.r.toFixed(3)}
          {Math.abs(hovered.r) >= threshold && (
            <Badge className="ml-2 bg-red-100 text-red-700 border-red-200 text-xs">⚠ Correlated</Badge>
          )}
        </div>
      )}
    </div>
  );
}