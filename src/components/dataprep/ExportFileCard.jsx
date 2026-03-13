import React, { useState } from 'react';
import { Download, Loader2, FileArchive, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const STATUS = {
  generating: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', label: 'Generating…', spin: false },
  ready:      { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Ready', spin: false },
  failed:     { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', label: 'Failed', spin: false },
};

export default function ExportFileCard({ file }) {
  const [downloading, setDownloading] = useState(false);
  const s = STATUS[file.status] || STATUS.generating;
  const StatusIcon = s.icon;

  const handleDownload = async () => {
    setDownloading(true);
    const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: file.file_uri, expires_in: 300 });
    window.open(res.signed_url, '_blank');
    setDownloading(false);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all cursor-default">
            <div className="w-10 h-10 bg-bangor-red/10 rounded-xl flex items-center justify-center shrink-0">
              <FileArchive className="w-5 h-5 text-bangor-red" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 text-sm truncate">{file.name}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${s.bg} ${s.color}`}>
                  <StatusIcon className={`w-3 h-3 ${file.status === 'generating' ? 'animate-spin' : ''}`} />
                  {s.label}
                </span>
                <span className="text-xs text-slate-400">
                  {file.species_count} species · {format(new Date(file.created_date), 'dd MMM yyyy HH:mm')}
                </span>
              </div>
              {file.data_types?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {file.data_types.slice(0, 4).map(dt => (
                    <span key={dt} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">
                      {dt.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {file.data_types.length > 4 && (
                    <span className="text-xs text-slate-400">+{file.data_types.length - 4} more</span>
                  )}
                </div>
              )}
            </div>

            {file.status === 'ready' && (
              <Button
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
                className="bg-bangor-red text-white shrink-0 gap-1.5"
              >
                {downloading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Download className="w-4 h-4" /> Download</>
                }
              </Button>
            )}
          </div>
        </TooltipTrigger>
        {file.description && (
          <TooltipContent side="top" className="max-w-sm">
            <p className="text-sm leading-relaxed">{file.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}