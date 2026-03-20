import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2, Trash2, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DataIntegrityChecker({ open, onClose, onComplete }) {
  const [step, setStep] = useState('checking'); // checking, results, processing, complete
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);

  useEffect(() => {
    if (open && step === 'checking') {
      checkDuplicates();
    }
  }, [open, step]);

  const checkDuplicates = async () => {
    setLoading(true);
    try {
      const allSpecies = await base44.entities.Species.list('-created_date', 10000);
      
      // Group by scientific name (case-insensitive)
      const groupedByScientific = {};
      allSpecies.forEach(sp => {
        const key = sp.scientific_name?.toLowerCase()?.trim() || 'unknown';
        if (!groupedByScientific[key]) {
          groupedByScientific[key] = [];
        }
        groupedByScientific[key].push(sp);
      });

      // Group by common name (case-insensitive, skip empty)
      const groupedByCommon = {};
      allSpecies.forEach(sp => {
        const key = sp.common_name?.toLowerCase()?.trim();
        if (key && key !== 'no common name' && key !== '') {
          if (!groupedByCommon[key]) {
            groupedByCommon[key] = [];
          }
          groupedByCommon[key].push(sp);
        }
      });

      // Find duplicates from both groupings
      const dupsByScientific = Object.entries(groupedByScientific)
        .filter(([_, species]) => species.length > 1)
        .map(([name, species]) => ({
          matchType: 'Scientific Name',
          matchValue: species[0].scientific_name,
          records: species.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
          count: species.length,
          willMergeInto: species[0].id
        }));

      const dupsByCommon = Object.entries(groupedByCommon)
        .filter(([_, species]) => species.length > 1)
        .map(([name, species]) => ({
          matchType: 'Common Name',
          matchValue: species[0].common_name,
          records: species.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
          count: species.length,
          willMergeInto: species[0].id
        }));

      // Combine and deduplicate (prefer scientific name matches)
      const allDups = [...dupsByScientific, ...dupsByCommon];
      const uniqueDups = [];
      const processedIds = new Set();

      allDups.forEach(dup => {
        const allIds = dup.records.map(r => r.id).join(',');
        if (!processedIds.has(allIds)) {
          processedIds.add(allIds);
          uniqueDups.push(dup);
        }
      });

      setDuplicates(uniqueDups);
      setStep(uniqueDups.length > 0 ? 'results' : 'complete');
    } catch (err) {
      console.error('Error checking duplicates:', err);
      setStep('complete');
    }
    setLoading(false);
  };

  const mergeRecords = async () => {
    setStep('processing');
    setTotalToProcess(duplicates.length);
    setProcessed(0);

    // Track which IDs have already been deleted to avoid double-delete errors
    const deletedIds = new Set();
    const SKIP_KEYS = new Set(['id', 'created_date', 'updated_date', 'created_by', 'created_by_id', 'is_sample']);

    try {
      for (const dupGroup of duplicates) {
        // Skip groups whose primary record was already deleted by an earlier group
        const mainRecord = dupGroup.records.find(r => !deletedIds.has(r.id));
        if (!mainRecord) {
          setProcessed(prev => prev + 1);
          continue;
        }

        const duplicateRecords = dupGroup.records.filter(r => r.id !== mainRecord.id && !deletedIds.has(r.id));

        if (duplicateRecords.length === 0) {
          setProcessed(prev => prev + 1);
          continue;
        }

        // Build clean merged payload (no internal fields)
        const mergedData = {};
        Object.keys(mainRecord).forEach(key => {
          if (!SKIP_KEYS.has(key)) mergedData[key] = mainRecord[key];
        });

        duplicateRecords.forEach(dup => {
          Object.keys(dup).forEach(key => {
            if (SKIP_KEYS.has(key)) return;
            if (Array.isArray(mergedData[key]) && Array.isArray(dup[key])) {
              mergedData[key] = [...mergedData[key], ...dup[key].filter(item => !mergedData[key].includes(item))];
            } else if (mergedData[key] && typeof mergedData[key] === 'object' && !Array.isArray(mergedData[key]) &&
                       dup[key] && typeof dup[key] === 'object' && !Array.isArray(dup[key])) {
              mergedData[key] = { ...mergedData[key], ...dup[key] };
            } else if (!mergedData[key] && dup[key]) {
              mergedData[key] = dup[key];
            }
          });
        });

        await base44.entities.Species.update(mainRecord.id, mergedData);

        for (const dup of duplicateRecords) {
          await base44.entities.Species.delete(dup.id);
          deletedIds.add(dup.id);
        }

        setProcessed(prev => prev + 1);
      }

      setStep('complete');
    } catch (err) {
      console.error('Error during merge:', err);
      setStep('complete');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-bangor-red">Data Integrity Check</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Checking */}
            {step === 'checking' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 space-y-4"
              >
                <Loader2 className="w-8 h-8 text-bangor-red animate-spin" />
                <p className="text-slate-600 font-medium">Scanning dataset for duplicates...</p>
                <p className="text-xs text-slate-500">Analyzing species records</p>
              </motion.div>
            )}

            {/* Results */}
            {step === 'results' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900">Found {duplicates.length} duplicate species</h3>
                    <p className="text-sm text-amber-800 mt-1">
                      {duplicates.reduce((sum, d) => sum + d.count - 1, 0)} total duplicate records will be merged
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {duplicates.map((dup, idx) => (
                    <Card key={idx} className="border-slate-200">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-bangor-sun/20 text-bangor-sun px-2 py-0.5 rounded font-semibold">
                                {dup.matchType}
                              </span>
                              <p className="font-medium text-slate-900">{dup.matchValue}</p>
                            </div>
                            <div className="mt-2 text-xs text-slate-600 space-y-1">
                              {dup.records.map((rec, i) => (
                                <div key={rec.id} className="flex items-center gap-2">
                                  {i === 0 && <CheckCircle className="w-3 h-3 text-green-600" />}
                                  {i !== 0 && <Trash2 className="w-3 h-3 text-red-500" />}
                                  <span>
                                    {rec.common_name || 'No common name'} · <i>{rec.scientific_name}</i>
                                    {rec.iucn_status && ` (${rec.iucn_status})`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <Layers className="w-4 h-4 text-bangor-sun flex-shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Processing */}
            {step === 'processing' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900">Merging records...</h3>
                    <p className="text-sm text-blue-800 mt-1">
                      {processed} of {totalToProcess} duplicate groups processed
                    </p>
                  </div>
                </div>
                <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-bangor-red to-bangor-sun"
                    initial={{ width: 0 }}
                    animate={{ width: `${(processed / totalToProcess) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}

            {/* Complete */}
            {step === 'complete' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 space-y-4"
              >
                {duplicates.length > 0 ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <p className="text-slate-900 font-semibold">Successfully merged {duplicates.length} duplicate groups</p>
                    <p className="text-sm text-slate-600">
                      {duplicates.reduce((sum, d) => sum + d.count - 1, 0)} duplicate records removed
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <p className="text-slate-900 font-semibold">Dataset is clean - no duplicates found</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {step === 'results' && (
            <>
              <Button onClick={onClose} className="flex-1 bg-slate-200 text-slate-700 font-medium">
                Cancel
              </Button>
              <Button
                onClick={mergeRecords}
                className="flex-1 bg-bangor-red text-white font-semibold"
              >
                <Layers className="w-4 h-4 mr-2" />
                Execute Merge
              </Button>
            </>
          )}
          {(step === 'checking' || step === 'processing') && (
            <Button disabled className="flex-1 bg-slate-200 text-slate-600">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </Button>
          )}
          {step === 'complete' && (
            <Button
              onClick={() => {
                onClose();
                onComplete?.();
              }}
              className="flex-1 bg-bangor-red text-white font-semibold"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}