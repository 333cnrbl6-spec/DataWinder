import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function IUCNVersionBanner() {
  const [record, setRecord] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadRecord();
  }, []);

  const loadRecord = async () => {
    const records = await base44.entities.IUCNVersionRecord.list();
    setRecord(records?.[0] || null);
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      await base44.functions.invoke('checkIUCNVersion', {});
      await loadRecord();
    } catch (e) {
      console.error(e);
    }
    setChecking(false);
  };

  if (!record) {
    return (
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-500">
        <span>IUCN spatial data version: <em>not yet tracked</em></span>
        <Button size="sm" variant="outline" onClick={handleCheck} disabled={checking}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${checking ? 'animate-spin' : ''}`} />
          Check now
        </Button>
      </div>
    );
  }

  const { imported_version, latest_known_version, update_available, last_checked_at } = record;
  const checkedAgo = last_checked_at
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        -Math.round((Date.now() - new Date(last_checked_at)) / (1000 * 60 * 60 * 24)),
        'day'
      )
    : null;

  if (update_available) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">
              IUCN spatial data update available — version {latest_known_version}
            </p>
            <p className="text-amber-700 text-xs mt-0.5">
              Your last import used <strong>{imported_version || 'unknown'}</strong>. The IUCN Red List has since published version <strong>{latest_known_version}</strong> — range polygons for <em>Callithrix</em> may have changed.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://www.iucnredlist.org/resources/spatial-data-download"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-amber-700 underline hover:text-amber-900"
          >
            Download <ExternalLink className="w-3 h-3" />
          </a>
          <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100 text-xs" onClick={handleCheck} disabled={checking}>
            <RefreshCw className={`w-3 h-3 mr-1 ${checking ? 'animate-spin' : ''}`} />
            Re-check
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2 text-emerald-700">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>
          IUCN spatial data is up to date — version <strong>{imported_version || latest_known_version}</strong>
          {checkedAgo && <span className="text-emerald-600 text-xs ml-2">(checked {checkedAgo})</span>}
        </span>
      </div>
      <Button size="sm" variant="ghost" className="text-emerald-700 hover:bg-emerald-100 text-xs" onClick={handleCheck} disabled={checking}>
        <RefreshCw className={`w-3 h-3 mr-1 ${checking ? 'animate-spin' : ''}`} />
        Re-check
      </Button>
    </div>
  );
}