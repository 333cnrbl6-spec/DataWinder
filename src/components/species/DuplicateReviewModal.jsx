import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, GitMerge, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DuplicateReviewModal({ review, onClose, onMerge, onDismiss }) {
  const [selectedCanonical, setSelectedCanonical] = useState(review.ai_analysis?.suggested_canonical_id);
  const [expandedSpecs, setExpandedSpecs] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const speciesInGroup = review.duplicate_species_data || [];

  const handleMerge = async () => {
    setIsProcessing(true);
    try {
      const recordsToDelete = speciesInGroup
        .filter(sp => sp.id !== selectedCanonical)
        .map(sp => sp.id);

      // Create merge record
      const mergeData = {
        review_group_id: review.review_group_id,
        canonical_id: selectedCanonical,
        records_to_delete: recordsToDelete,
        status: 'merged'
      };

      // Update review record
      await base44.entities.PendingSpeciesReview.update(review.id, mergeData);
      
      // Notify parent
      onMerge(review.id, recordsToDelete);
    } catch (error) {
      console.error('Merge error:', error);
      alert('Failed to merge records');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = async () => {
    setIsProcessing(true);
    try {
      await base44.entities.PendingSpeciesReview.update(review.id, { 
        status: 'dismissed' 
      });
      onDismiss(review.id);
    } catch (error) {
      console.error('Dismiss error:', error);
      alert('Failed to dismiss review');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader className="p-6 border-b border-slate-200 bg-gradient-to-r from-bangor-red/5 to-bangor-sun/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-bangor-red" />
              <DialogTitle>Review Potential Duplicates</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* AI Analysis Summary */}
          <Card className="border-bangor-sun/20 bg-bangor-sun/5">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700"><strong>Reason:</strong> {review.ai_analysis.reason}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Confidence:</span>
                <Badge className="bg-bangor-red/20 text-bangor-red">
                  {review.ai_analysis.confidence}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Species Comparison */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Suspected Duplicates</h3>
            <div className="grid grid-cols-1 gap-4">
              {speciesInGroup.map((species) => {
                const isCanonical = species.id === selectedCanonical;
                const isAISuggested = species.id === review.ai_analysis?.suggested_canonical_id;
                
                return (
                  <motion.div
                    key={species.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className={`border-2 cursor-pointer transition-all ${
                      isCanonical 
                        ? 'border-bangor-red/50 bg-bangor-red/5' 
                        : 'border-slate-200 hover:border-bangor-sun/50'
                    }`}
                    onClick={() => setSelectedCanonical(species.id)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{species.scientific_name}</CardTitle>
                              {isCanonical && (
                                <Badge className="bg-bangor-red text-white">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Master
                                </Badge>
                              )}
                              {isAISuggested && !isCanonical && (
                                <Badge variant="outline" className="border-bangor-sun">
                                  AI Suggested
                                </Badge>
                              )}
                            </div>
                            {species.common_name && (
                              <p className="text-sm text-slate-500 mt-1">{species.common_name}</p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedSpecs(prev => ({
                                ...prev,
                                [species.id]: !prev[species.id]
                              }));
                            }}
                          >
                            {expandedSpecs[species.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </CardHeader>

                      <AnimatePresence>
                        {expandedSpecs[species.id] && (
                          <CardContent className="space-y-2 text-sm border-t border-slate-200 pt-4">
                            {[
                              { label: 'Kingdom', value: species.kingdom },
                              { label: 'Phylum', value: species.phylum },
                              { label: 'Class', value: species.class_name },
                              { label: 'Order', value: species.order_name },
                              { label: 'Family', value: species.family },
                              { label: 'Genus', value: species.genus },
                              { label: 'IUCN Status', value: species.iucn_status }
                            ].map(({ label, value }) => (
                              value && (
                                <div key={label} className="flex justify-between">
                                  <span className="text-slate-600">{label}:</span>
                                  <span className="font-medium">{value}</span>
                                </div>
                              )
                            ))}
                          </CardContent>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              onClick={handleMerge}
              disabled={isProcessing}
              className="flex-1 bg-bangor-red hover:bg-bangor-red/90"
            >
              <GitMerge className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Merge Selected'}
            </Button>
            <Button
              onClick={handleDismiss}
              disabled={isProcessing}
              variant="outline"
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Not a Duplicate
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}