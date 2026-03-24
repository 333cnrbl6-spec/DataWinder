import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, RotateCcw, FileText, Database, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ENTITY_COLORS = {
  Species: 'bg-emerald-100 text-emerald-800',
  ClimateDataset: 'bg-blue-100 text-blue-800',
  MaxentRun: 'bg-purple-100 text-purple-800',
  SpeciesList: 'bg-amber-100 text-amber-800',
  SavedSearch: 'bg-slate-100 text-slate-700',
  ExportedFile: 'bg-pink-100 text-pink-800',
};

export default function ImportHistory() {
  const queryClient = useQueryClient();
  const [revertTarget, setRevertTarget] = useState(null); // import log object
  const [isReverting, setIsReverting] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['import_logs'],
    queryFn: () => base44.entities.ImportLog.list('-created_date', 100),
  });

  const handleRevert = async () => {
    if (!revertTarget) return;
    setIsReverting(true);
    try {
      const res = await base44.functions.invoke('revertImport', { import_log_id: revertTarget.id });
      const { message, deleted, failed } = res.data;
      toast.success(message || `Reverted ${deleted} records`);
      queryClient.invalidateQueries({ queryKey: ['import_logs'] });
      queryClient.invalidateQueries({ queryKey: ['allSpecies'] });
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      toast.error('Revert failed: ' + msg);
    } finally {
      setIsReverting(false);
      setRevertTarget(null);
    }
  };

  const completed = logs.filter(l => l.status !== 'reverted');
  const reverted = logs.filter(l => l.status === 'reverted');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <header className="bg-white border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bangor-red/10 rounded-xl">
              <History className="w-6 h-6 text-bangor-red" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-bangor-red">Import History</h1>
              <p className="text-sm text-slate-600">View and undo previous data imports</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-800">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
          <p>Each Smart Import is logged here. You can <strong>revert</strong> any completed import to delete all the records it created — useful if you uploaded the wrong file.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading import history…
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No imports yet</p>
              <p className="text-sm mt-1">Imports made via Smart Import will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Active imports */}
            {completed.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Active Imports ({completed.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-slate-100">
                    {completed.map(log => (
                      <li key={log.id} className="flex items-center gap-4 px-5 py-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-sm font-medium text-slate-800 truncate">
                              {log.file_name || 'Unknown file'}
                            </span>
                            <Badge className={`text-xs ${ENTITY_COLORS[log.entity_type] || 'bg-slate-100 text-slate-700'}`}>
                              <Database className="w-3 h-3 mr-1" />
                              {log.entity_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span><strong>{log.record_count}</strong> records</span>
                            <span>·</span>
                            <span>{log.user_name || log.user_email || 'Unknown user'}</span>
                            <span>·</span>
                            <span title={log.created_date ? format(new Date(log.created_date), 'PPpp') : ''}>
                              {log.created_date ? formatDistanceToNow(new Date(log.created_date), { addSuffix: true }) : '—'}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                          onClick={() => setRevertTarget(log)}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          Revert
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Reverted imports */}
            {reverted.length > 0 && (
              <Card className="opacity-70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-500">
                    <AlertCircle className="w-4 h-4" />
                    Reverted ({reverted.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-slate-100">
                    {reverted.map(log => (
                      <li key={log.id} className="flex items-center gap-4 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="w-4 h-4 text-slate-300 shrink-0" />
                            <span className="text-sm text-slate-400 line-through truncate">
                              {log.file_name || 'Unknown file'}
                            </span>
                            <Badge variant="outline" className="text-xs text-slate-400">
                              {log.entity_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                            <span>{log.record_count} records deleted</span>
                            <span>·</span>
                            <span>Reverted by {log.reverted_by || 'unknown'}</span>
                            {log.reverted_at && (
                              <>
                                <span>·</span>
                                <span>{formatDistanceToNow(new Date(log.reverted_at), { addSuffix: true })}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs text-slate-400 shrink-0">Reverted</Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>

      {/* Revert confirmation dialog */}
      <AlertDialog open={!!revertTarget} onOpenChange={() => setRevertTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-red-500" />
              Revert this import?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will permanently delete <strong>{revertTarget?.record_count} {revertTarget?.entity_type}</strong> records that were created when <strong>{revertTarget?.file_name || 'this file'}</strong> was imported.</p>
              <p className="text-amber-600 font-medium">⚠ This cannot be undone. Any enrichment data added to these records after import will also be lost.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevert}
              disabled={isReverting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isReverting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Delete {revertTarget?.record_count} records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}