import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, GitMerge, CheckCircle, Loader2, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TaxonomicCrossReference({ open, onClose, onComplete }) {
  const [step, setStep] = useState('idle'); // idle, analyzing, results, merging, complete
  const [analysis, setAnalysis] = useState(null);
  const [selectedMerges, setSelectedMerges] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setStep('analyzing');

    try {
      const response = await base44.functions.invoke('taxonomicCrossReference', {
        action: 'analyze'
      });

      if (response.data.status === 'success') {
        setAnalysis(response.data.analysis);
        setStep('results');
      } else {
        alert('Analysis failed. Please try again.');
        setStep('idle');
      }
    } catch (error) {
      console.error('Error analyzing species:', error);
      alert('Error analyzing species data.');
      setStep('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    setIsLoading(true);
    setStep('merging');

    try {
      const response = await base44.functions.invoke('taxonomicCrossReference', {
        action: 'merge',
        species_ids: selectedMerges
      });

      if (response.data.status === 'success') {
        setStep('complete');
        setTimeout(() => {
          onComplete();
          onClose();
        }, 2000);
      } else {
        alert('Merge failed. Please try again.');
        setStep('results');
      }
    } catch (error) {
      console.error('Error merging species:', error);
      alert('Error merging species data.');
      setStep('results');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMerge = (duplicate) => {
    const mergeId = JSON.stringify({
      primary_id: duplicate.recommended_primary,
      duplicate_ids: duplicate.record_ids.filter(id => id !== duplicate.recommended_primary)
    });

    setSelectedMerges(prev => {
      const exists = prev.some(m => JSON.stringify(m) === mergeId);
      if (exists) {
        return prev.filter(m => JSON.stringify(m) !== mergeId);
      } else {
        return [...prev, {
          primary_id: duplicate.recommended_primary,
          duplicate_ids: duplicate.record_ids.filter(id => id !== duplicate.recommended_primary)
        }];
      }
    });
  };

  const confidenceColor = (conf) => {
    switch(conf) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-orange-100 text-orange-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-bangor-sun" />
            AI-Powered Taxonomic Cross-Reference
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="text-sm text-slate-600">
                This tool uses AI to analyze your species database and:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-slate-600">
                <li>Identify duplicate entries based on scientific names and taxonomy</li>
                <li>Detect taxonomic inconsistencies across data sources</li>
                <li>Cross-reference with accepted taxonomic databases</li>
                <li>Suggest intelligent merges to consolidate your data</li>
              </ul>
              <Button
                onClick={handleAnalyze}
                className="w-full bg-bangor-red hover:bg-bangor-red/90"
                disabled={isLoading}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start AI Analysis
              </Button>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <Loader2 className="w-16 h-16 text-bangor-sun animate-spin mb-4" />
              <p className="text-lg font-semibold text-slate-700">Analyzing Species Data...</p>
              <p className="text-sm text-slate-500 mt-2">AI is cross-referencing taxonomic information</p>
            </motion.div>
          )}

          {step === 'results' && analysis && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">Total Species</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-bangor-red">{analysis.statistics?.total_species || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">Duplicates Found</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-orange-600">{analysis.statistics?.potential_duplicates || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">Family Anomalies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-orange-600">{analysis.family_anomalies?.length || 0}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Duplicates */}
              {analysis.duplicates && analysis.duplicates.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <GitMerge className="w-5 h-5 text-bangor-red" />
                    Duplicate Species ({analysis.duplicates.length})
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {analysis.duplicates.map((dup, idx) => (
                      <Card key={idx} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 italic">{dup.scientific_name}</p>
                              <p className="text-sm text-slate-600 mt-1">{dup.reason}</p>
                              <p className="text-xs text-slate-500 mt-2">
                                {dup.record_ids.length} records found
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={confidenceColor(dup.confidence)}>
                                {dup.confidence} confidence
                              </Badge>
                              <Button
                                size="sm"
                                variant={selectedMerges.some(m => m.primary_id === dup.recommended_primary) ? "default" : "outline"}
                                onClick={() => toggleMerge(dup)}
                              >
                                {selectedMerges.some(m => m.primary_id === dup.recommended_primary) ? 'Selected' : 'Select to Merge'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Family Anomalies */}
              {analysis.family_anomalies && analysis.family_anomalies.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Database className="w-5 h-5 text-orange-600" />
                    Family Count Anomalies ({analysis.family_anomalies.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {analysis.family_anomalies.map((anomaly, idx) => (
                      <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900 text-sm">{anomaly.family}</p>
                            <p className="text-xs text-slate-600 mt-1">
                              <span className="font-medium">Database:</span> {anomaly.species_in_database} species | 
                              <span className="font-medium ml-2">Expected:</span> {anomaly.expected_global_count}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">{anomaly.deviation}</p>
                            <p className="text-xs text-orange-700 font-medium mt-1">Likely: {anomaly.likely_cause}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inconsistencies */}
              {analysis.inconsistencies && analysis.inconsistencies.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    Taxonomic Inconsistencies ({analysis.inconsistencies.length})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {analysis.inconsistencies.map((inc, idx) => (
                      <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="font-semibold text-slate-900 italic text-sm">{inc.scientific_name}</p>
                        <p className="text-xs text-slate-600 mt-1">{inc.issue}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMerge}
                  disabled={selectedMerges.length === 0 || isLoading}
                  className="flex-1 bg-bangor-red hover:bg-bangor-red/90"
                >
                  <GitMerge className="w-4 h-4 mr-2" />
                  Merge {selectedMerges.length} Selected
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'merging' && (
            <motion.div
              key="merging"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <Loader2 className="w-16 h-16 text-bangor-sun animate-spin mb-4" />
              <p className="text-lg font-semibold text-slate-700">Merging Species Records...</p>
              <p className="text-sm text-slate-500 mt-2">AI is intelligently combining data from all sources</p>
            </motion.div>
          )}

          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
              <p className="text-lg font-semibold text-slate-700">Cross-Reference Complete!</p>
              <p className="text-sm text-slate-500 mt-2">Your database has been optimized</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}