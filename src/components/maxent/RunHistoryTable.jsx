import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, Loader2, AlertCircle, FileText, Layers } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  draft:     { label: 'Draft',      bg: 'bg-slate-100',  text: 'text-slate-600',  icon: FileText },
  submitted: { label: 'Submitted',  bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Clock },
  running:   { label: 'Running',    bg: 'bg-amber-100',  text: 'text-amber-700',  icon: Loader2, spin: true },
  completed: { label: 'Completed',  bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle },
  failed:    { label: 'Failed',     bg: 'bg-red-100',    text: 'text-red-700',    icon: AlertCircle },
};

function RunStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const StatusIcon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.bg} ${cfg.text}`}>
      <StatusIcon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  );
}

export default function RunHistoryTable({ runs }) {
  if (runs.length === 0) {
    return (
      <Card className="shadow-sm border-slate-200">
        <CardContent className="py-12 text-center text-slate-400">
          <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-sm">No model runs yet.</p>
          <p className="text-xs mt-1">Complete the wizard above to submit your first MAXENT run.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="border-b bg-slate-50 py-3 px-5">
        <CardTitle className="text-slate-700 text-sm font-semibold flex items-center gap-2">
          <Layers className="w-4 h-4 text-bangor-red" />
          Previous Model Runs ({runs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {runs.map(run => (
            <div key={run.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {run.name || run.species_name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  <em className="not-italic font-medium text-slate-600">{run.species_name}</em>
                  {' · '}
                  {run.occurrence_count || 0} occurrences
                  {' · '}
                  {run.climate_dataset_names?.length || 0} layers
                </div>
              </div>
              <div className="text-xs text-slate-400 shrink-0 hidden sm:block">
                {run.created_date
                  ? format(new Date(run.created_date), 'dd MMM yyyy')
                  : '—'}
              </div>
              <RunStatusBadge status={run.status} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}