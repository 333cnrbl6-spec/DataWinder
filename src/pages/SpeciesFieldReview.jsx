import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Sparkles, RefreshCw, ChevronDown, ChevronUp, Loader2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const FIELD_LABELS = {
  common_name: 'Common Name',
  iucn_status: 'IUCN Status',
  population_trend: 'Population Trend',
  population_details: 'Population Details',
  family: 'Family',
  genus: 'Genus',
  kingdom: 'Kingdom',
  phylum: 'Phylum',
  class_name: 'Class',
  order_name: 'Order',
  habitat: 'Habitat',
  range_description: 'Range Description',
  threats: 'Threats',
  conservation_actions: 'Conservation Actions',
};

function PendingUpdateCard({ update, onApprove, onReject, isApproving, isRejecting }) {
  const [expanded, setExpanded] = useState(true);
  const [approved, setApproved] = useState({});   // fieldKey -> true/false
  const isBusy = isApproving || isRejecting;
  const fields = Object.entries(update.new_data || {});

  const toggleField = (key) => {
    setApproved(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const approveSelected = () => {
    const selectedFields = Object.fromEntries(
      fields.filter(([key]) => approved[key]).map(([key, val]) => [key, val])
    );
    if (Object.keys(selectedFields).length === 0) {
      toast.error('Select at least one field to approve');
      return;
    }
    onApprove(update.id, selectedFields);
  };

  const approveAll = () => {
    const allFields = Object.fromEntries(fields);
    // Mark all checkboxes as selected before approving
    const allApproved = Object.fromEntries(fields.map(([key]) => [key, true]));
    setApproved(allApproved);
    onApprove(update.id, allFields);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`border-amber-200 shadow-sm relative overflow-hidden transition-opacity ${isBusy ? 'opacity-70' : ''}`}>
        {/* Processing overlay */}
        {isBusy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm gap-3 rounded-xl">
            <Loader2 className="w-9 h-9 animate-spin text-bangor-red" />
            <p className="text-sm font-semibold text-slate-700">
              {isApproving ? 'Saving to species record…' : 'Rejecting suggestion…'}
            </p>
            {/* Indeterminate progress bar */}
            <div className="w-44 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-bangor-red rounded-full"
                style={{ animation: 'indeterminate-slide 1.4s ease-in-out infinite' }}
              />
            </div>
            <style>{`
              @keyframes indeterminate-slide {
                0%   { transform: translateX(-100%) scaleX(0.4); }
                50%  { transform: translateX(60%)  scaleX(0.6); }
                100% { transform: translateX(200%) scaleX(0.4); }
              }
            `}</style>
          </div>
        )}
        <CardHeader className="pb-3 cursor-pointer" onClick={() => !isBusy && setExpanded(v => !v)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base italic text-bangor-red">{update.scientific_name}</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">{fields.length} field{fields.length !== 1 ? 's' : ''} suggested</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-100 text-amber-700 text-xs">Pending Review</Badge>
              {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <CardContent className="pt-0 space-y-3">
                {fields.map(([key, newVal]) => {
                  const currentVal = update.current_data?.[key];
                  const isApproved = !!approved[key];
                  return (
                    <div
                      key={key}
                      onClick={() => toggleField(key)}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isApproved ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                        isApproved ? 'border-green-500 bg-green-500' : 'border-slate-300'
                      }`}>
                        {isApproved && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-600">{FIELD_LABELS[key] || key}</p>
                        {currentVal && <p className="text-xs text-slate-400 line-through mb-1">Was: {currentVal}</p>}
                        <p className="text-sm text-slate-800">{newVal}</p>
                      </div>
                    </div>
                  );
                })}

                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={approveSelected} disabled={isBusy} className="bg-green-600 hover:bg-green-700 text-white flex-1">
                    {isApproving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                    {isApproving ? 'Saving…' : 'Approve Selected'}
                  </Button>
                  <Button size="sm" onClick={approveAll} disabled={isBusy} className="bg-bangor-red hover:bg-bangor-red/90 text-white flex-1">
                    {isApproving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                    {isApproving ? 'Saving…' : 'Approve All'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onReject(update.id)} disabled={isBusy} className="text-red-600 border-red-200">
                    {isRejecting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                    {isRejecting ? 'Rejecting…' : 'Reject'}
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export default function SpeciesFieldReview() {
  const queryClient = useQueryClient();
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ total: 0, done: 0, label: '' });
  const [busyId, setBusyId] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const progressIntervalRef = useRef(null);

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['pendingSpeciesUpdates'],
    queryFn: () => base44.entities.PendingSpeciesUpdate.filter({ status: 'pending', data_source: 'AI Auto-Complete' }, '-created_date'),
    refetchInterval: 10000,
  });

  const { data: allSpecies = [] } = useQuery({
    queryKey: ['allSpeciesIds'],
    queryFn: () => base44.entities.Species.list('-created_date', 500),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ updateId, fields, speciesId }) => {
      await base44.entities.Species.update(speciesId, fields);
      await base44.entities.PendingSpeciesUpdate.update(updateId, { status: 'accepted' });
    },
    onMutate: ({ updateId }) => { setBusyId(updateId); setBusyAction('approve'); },
    onSuccess: () => {
      toast.success('Species updated successfully');
      setBusyId(null); setBusyAction(null);
      queryClient.invalidateQueries({ queryKey: ['pendingSpeciesUpdates'] });
    },
    onError: (e) => { toast.error(`Failed: ${e.message}`); setBusyId(null); setBusyAction(null); },
  });

  const rejectMutation = useMutation({
    mutationFn: async (updateId) => {
      await base44.entities.PendingSpeciesUpdate.update(updateId, { status: 'rejected' });
    },
    onMutate: (updateId) => { setBusyId(updateId); setBusyAction('reject'); },
    onSuccess: () => {
      toast.success('Suggestion rejected');
      setBusyId(null); setBusyAction(null);
      queryClient.invalidateQueries({ queryKey: ['pendingSpeciesUpdates'] });
    },
    onError: (e) => { toast.error(`Failed: ${e.message}`); setBusyId(null); setBusyAction(null); },
  });

  const runBatch = async () => {
    setIsBatchRunning(true);
    try {
      const pendingIds = new Set(pending.map(p => p.species_id));
      const targets = allSpecies.filter(s => !pendingIds.has(s.id));
      if (targets.length === 0) {
        toast.info('All species already have pending suggestions or are complete');
        setIsBatchRunning(false);
        return;
      }
      const species_ids = targets.map(s => s.id);
      const total = species_ids.length;

      setBatchProgress({ total, done: 0, label: `Starting AI analysis for ${total} species…` });

      // Simulate incremental progress while the backend works
      let elapsed = 0;
      const estimatedMs = total * 1500; // ~1.5s per species estimate
      progressIntervalRef.current = setInterval(() => {
        elapsed += 500;
        const ratio = Math.min(elapsed / estimatedMs, 0.92); // cap at 92% until done
        const done = Math.floor(ratio * total);
        setBatchProgress({
          total,
          done,
          label: done < total
            ? `Analysing species ${done + 1} of ${total}…`
            : `Finalising suggestions…`,
        });
      }, 500);

      await base44.functions.invoke('suggestSpeciesFields', { species_ids });

      clearInterval(progressIntervalRef.current);
      setBatchProgress({ total, done: total, label: `Done! ${total} species processed.` });

      toast.success(`AI suggestions queued for ${total} species`);
      queryClient.invalidateQueries({ queryKey: ['pendingSpeciesUpdates'] });

      // Hide bar after a moment
      setTimeout(() => {
        setIsBatchRunning(false);
        setBatchProgress({ total: 0, done: 0, label: '' });
      }, 2000);
    } catch (e) {
      clearInterval(progressIntervalRef.current);
      toast.error(`Batch failed: ${e.message}`);
      setIsBatchRunning(false);
      setBatchProgress({ total: 0, done: 0, label: '' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b-4 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">AI Field Suggestions</h1>
                <p className="text-sm text-slate-500">Review and approve AI-suggested species data</p>
              </div>
            </div>
            <Button
              onClick={runBatch}
              disabled={isBatchRunning}
              className="bg-bangor-red hover:bg-bangor-red/90 text-white"
            >
              {isBatchRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {isBatchRunning ? 'Running...' : 'Run on All Species'}
            </Button>
          </div>
        </div>
      </header>

      {/* Batch Progress Bar */}
      <AnimatePresence>
        {isBatchRunning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-amber-50 border-b border-amber-200 px-4 py-3"
          >
            <div className="max-w-4xl mx-auto space-y-2">
              <div className="flex items-center justify-between text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 animate-pulse" />
                  <span className="font-medium">{batchProgress.label}</span>
                </div>
                <span className="font-semibold tabular-nums">
                  {batchProgress.done} / {batchProgress.total}
                </span>
              </div>
              <Progress
                value={batchProgress.total > 0 ? (batchProgress.done / batchProgress.total) * 100 : 0}
                className="h-2 bg-amber-200 [&>div]:bg-amber-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}

        {!isLoading && pending.length === 0 && (
          <Card className="border-dashed border-slate-300">
            <CardContent className="py-16 text-center text-slate-400">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No pending suggestions</p>
              <p className="text-sm mt-1">New species added will be auto-suggested, or click "Run on All Species" above.</p>
            </CardContent>
          </Card>
        )}

        {pending.map(update => (
          <PendingUpdateCard
            key={update.id}
            update={update}
            onApprove={(id, fields) => approveMutation.mutate({ updateId: id, fields, speciesId: update.species_id })}
            onReject={(id) => rejectMutation.mutate(id)}
            isApproving={busyId === update.id && busyAction === 'approve'}
            isRejecting={busyId === update.id && busyAction === 'reject'}
          />
        ))}
      </main>
    </div>
  );
}