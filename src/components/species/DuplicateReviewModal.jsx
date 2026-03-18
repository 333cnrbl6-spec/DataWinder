import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, GitMerge, X, Crown, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const COMPARE_FIELDS = [
  { key: 'common_name', label: 'Common Name' },
  { key: 'kingdom', label: 'Kingdom' },
  { key: 'phylum', label: 'Phylum' },
  { key: 'class_name', label: 'Class' },
  { key: 'order_name', label: 'Order' },
  { key: 'family', label: 'Family' },
  { key: 'genus', label: 'Genus' },
  { key: 'iucn_status', label: 'IUCN Status' },
  { key: 'habitat', label: 'Habitat' },
  { key: 'inat_taxon_id', label: 'iNaturalist ID' },
  { key: 'gbif_id', label: 'GBIF ID' },
];

export default function DuplicateReviewModal({ review, onClose, onMerge, onDismiss }) {
  const [selectedCanonical, setSelectedCanonical] = useState(review.ai_analysis?.suggested_canonical_id);
  const [isProcessing, setIsProcessing] = useState(false);

  const speciesInGroup = review.duplicate_species_data || [];

  const relevantFields = COMPARE_FIELDS.filter(f =>
    speciesInGroup.some(sp => sp[f.key])
  );

  const handleMerge = async () => {
    setIsProcessing(true);
    try {
      const masterSpeciesData = speciesInGroup.find(s => s.id === selectedCanonical);
      const recordsToDelete = speciesInGroup
        .filter(sp => sp.id !== selectedCanonical)
        .map(sp => sp.id);

      // Build merged data: start from master, fill in any missing fields from duplicates
      const mergedData = { ...masterSpeciesData };
      for (const dup of speciesInGroup.filter(sp => sp.id !== selectedCanonical)) {
        for (const [key, val] of Object.entries(dup)) {
          if (!mergedData[key] && val) mergedData[key] = val;
        }
      }
      // Strip internal fields before sending
      const { id, created_date, updated_date, created_by, ...cleanMergedData } = mergedData;

      // Call backend to update master + delete duplicates
      const res = await base44.functions.invoke('mergeSpeciesRecords', {
        masterId: selectedCanonical,
        duplicateIds: recordsToDelete,
        mergedData: cleanMergedData
      });

      if (res.data?.status !== 'success') {
        throw new Error(res.data?.error || 'Merge failed');
      }

      // Mark the review as merged
      await base44.entities.PendingSpeciesReview.update(review.id, { status: 'merged' });

      toast.success(`Merged into "${masterSpeciesData?.scientific_name}"`);
      onMerge(review.id, recordsToDelete);
    } catch (error) {
      console.error('Merge error:', error);
      toast.error('Failed to merge records: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = async () => {
    setIsProcessing(true);
    try {
      await base44.entities.PendingSpeciesReview.update(review.id, { status: 'dismissed' });
      onDismiss(review.id);
    } catch (error) {
      toast.error('Failed to dismiss review');
    } finally {
      setIsProcessing(false);
    }
  };

  const masterSpecies = speciesInGroup.find(s => s.id === selectedCanonical);

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
        className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-bangor-red/5 to-bangor-sun/5 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-bangor-red" />
            <div>
              <h2 className="font-semibold text-slate-900">Review Potential Duplicates</h2>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">{review.ai_analysis.reason}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-bangor-red/20 text-bangor-red">{review.ai_analysis.confidence}% confidence</Badge>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Step 1: Pick master */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-bangor-red text-white text-xs flex items-center justify-center font-bold">1</div>
              <h3 className="font-semibold text-slate-800">Select the Master Record to Keep</h3>
            </div>
            <div className={`grid gap-3 ${speciesInGroup.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {speciesInGroup.map((species) => {
                const isCanonical = species.id === selectedCanonical;
                const isAISuggested = species.id === review.ai_analysis?.suggested_canonical_id;
                return (
                  <button
                    key={species.id}
                    onClick={() => setSelectedCanonical(species.id)}
                    className={`text-left rounded-xl border-2 p-4 transition-all w-full ${
                      isCanonical
                        ? 'border-bangor-red bg-bangor-red/5 shadow-md'
                        : 'border-slate-200 hover:border-bangor-sun/50 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isCanonical ? 'border-bangor-red bg-bangor-red' : 'border-slate-300'
                      }`}>
                        {isCanonical && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {isCanonical && (
                          <Badge className="bg-bangor-red text-white text-xs">
                            <Crown className="w-3 h-3 mr-1" />Master
                          </Badge>
                        )}
                        {isAISuggested && (
                          <Badge variant="outline" className="border-bangor-sun text-bangor-sun text-xs">AI Pick</Badge>
                        )}
                        {!isCanonical && (
                          <Badge variant="outline" className="border-red-300 text-red-400 text-xs">
                            <Trash2 className="w-3 h-3 mr-1" />Delete
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm italic">{species.scientific_name}</p>
                    {species.common_name && <p className="text-xs text-slate-500 mt-0.5">{species.common_name}</p>}
                    <div className="mt-2 space-y-1">
                      {species.iucn_status && (
                        <p className="text-xs text-slate-500">IUCN: <span className="font-medium text-slate-700">{species.iucn_status}</span></p>
                      )}
                      {species.family && (
                        <p className="text-xs text-slate-500">Family: <span className="font-medium text-slate-700">{species.family}</span></p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Field comparison */}
          {relevantFields.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-slate-400 text-white text-xs flex items-center justify-center font-bold">2</div>
                <h3 className="font-semibold text-slate-800">Field Comparison</h3>
                <span className="text-xs text-slate-400">⚠ = conflicting values between records</span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-3 font-semibold text-slate-600 w-32 text-xs">Field</th>
                      {speciesInGroup.map(sp => (
                        <th
                          key={sp.id}
                          className={`text-left p-3 font-semibold text-xs ${
                            sp.id === selectedCanonical
                              ? 'text-bangor-red bg-bangor-red/5'
                              : 'text-slate-400'
                          }`}
                        >
                          <span className="italic">{sp.scientific_name}</span>
                          {sp.id === selectedCanonical && (
                            <span className="ml-1 not-italic font-normal">(Master)</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {relevantFields.map((field, i) => {
                      const values = speciesInGroup.map(sp => sp[field.key]);
                      const hasConflict = new Set(values.filter(Boolean)).size > 1;
                      return (
                        <tr
                          key={field.key}
                          className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${hasConflict ? 'bg-amber-50/60' : ''}`}
                        >
                          <td className="p-3 font-medium text-slate-500 text-xs">
                            {field.label}
                            {hasConflict && <span className="ml-1 text-amber-500">⚠</span>}
                          </td>
                          {speciesInGroup.map(sp => (
                            <td
                              key={sp.id}
                              className={`p-3 text-xs ${
                                sp.id === selectedCanonical
                                  ? 'text-slate-900 font-medium'
                                  : 'text-slate-400'
                              }`}
                            >
                              {String(sp[field.key] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              onClick={handleMerge}
              disabled={isProcessing || !selectedCanonical}
              className="flex-1 bg-bangor-red hover:bg-bangor-red/90"
            >
              <GitMerge className="w-4 h-4 mr-2" />
              {isProcessing
                ? 'Processing...'
                : `Merge — Keep "${masterSpecies?.scientific_name || ''}"`}
            </Button>
            <Button onClick={handleDismiss} disabled={isProcessing} variant="outline" className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Not a Duplicate
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}