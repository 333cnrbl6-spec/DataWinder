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
      const grouped = {};
      allSpecies.forEach(sp => {
        const key = sp.scientific_name?.toLowerCase() || 'unknown';
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(sp);
      });

      // Find duplicates
      const dups = Object.entries(grouped)
        .filter(([_, species]) => species.length > 1)
        .map(([name, species]) => ({
          scientificName: name,
          records: species.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
          count: species.length,
          willMergeInto: species[0].id // Most recent
        }));

      setDuplicates(dups);
      setStep(dups.length > 0 ? 'results' : 'complete');
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

    try {
      for (const dupGroup of duplicates) {
        const mainRecord = dupGroup.records[0];
        const duplicateRecords = dupGroup.records.slice(1);

        // Merge data: take non-empty values from all records
        const mergedData = { ...mainRecord };
        duplicateRecords.forEach(dup => {
          Object.keys(dup).forEach(key => {
            if (key === 'id' || key === 'created_date' || key === 'created_by') return;
            
            // For arrays and objects, merge intelligently
            if (Array.isArray(mergedData[key]) && Array.isArray(dup[key])) {
              mergedData[key] = [
                ...mergedData[key],
                ...dup[key].filter(item => !mergedData[key].includes(item))
              ];
            } else if (typeof mergedData[key] === 'object' && typeof dup[key] === 'object') {
              mergedData[key] = { ...mergedData[key], ...dup[key] };
            } else if (!mergedData[key] && dup[key]) {
              mergedData[key] = dup[key];
            }
          });
        });

        // Update main record with merged data
        await base44.entities.Species.update(mainRecord.id, mergedData);

        // Delete duplicates
        for (const dup of duplicateRecords) {
          await base44.entities.Species.delete(dup.id);
        }

        setProcessed(prev => prev + 1);
      }

      setStep('complete');
    } catch (err) {
      console.error('Error during merge:', err);
      alert('Error during merge process. Some duplicates may have been deleted.');
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
                            <p className="font-medium text-slate-900">{dup.records[0].common_name || dup.records[0].scientific_name}</p>
                            <p className="text-xs italic text-slate-500 mt-0.5">{dup.scientificName}</p>
                            <div className="mt-2 text-xs text-slate-600 space-y-1">
                              {dup.records.map((rec, i) => (
                                <div key={rec.id} className="flex items-center gap-2">
                                  {i === 0 && <CheckCircle className="w-3 h-3 text-green-600" />}
                                  {i !== 0 && <Trash2 className="w-3 h-3 text-red-500" />}
                                  <span>
                                    {rec.common_name || 'No common name'} 
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