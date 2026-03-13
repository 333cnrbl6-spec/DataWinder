import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLOR = {
  completed: 'bg-green-100 text-green-700',
  running:   'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  failed:    'bg-red-100 text-red-700',
  draft:     'bg-slate-100 text-slate-600',
};

export default function RunCompareSelector({ runs, selected, onToggle }) {
  return (
    <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
      {runs.map(run => {
        const isSelected = selected.some(r => r.id === run.id);
        return (
          <button
            key={run.id}
            onClick={() => onToggle(run)}
            className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all text-sm ${
              isSelected
                ? 'border-bangor-red bg-red-50'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isSelected
                ? <CheckCircle className="w-4 h-4 text-bangor-red" />
                : <Circle className="w-4 h-4 text-slate-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 truncate">{run.name || run.species_name}</div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <em className="not-italic font-medium">{run.species_name}</em>
                <span>·</span>
                <span>{run.occurrence_count || 0} occ.</span>
                {run.created_date && (
                  <><span>·</span><span>{format(new Date(run.created_date), 'dd MMM yyyy')}</span></>
                )}
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[run.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {run.status}
                </span>
              </div>
              {run.results?.auc != null && (
                <div className="text-xs text-green-700 font-mono mt-0.5">AUC {Number(run.results.auc).toFixed(3)}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}