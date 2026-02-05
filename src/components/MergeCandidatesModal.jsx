import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function MergeCandidatesModal({ isOpen, onClose, mergeCandidates, onMergeComplete }) {
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [merging, setMerging] = useState(false);
  const [selectedFields, setSelectedFields] = useState({});

  const handleMerge = async (candidate) => {
    setMerging(true);
    try {
      // Smart merge: combine data from all records
      const mergedData = { ...candidate.masterRecord };

      // Merge data from duplicates
      candidate.duplicateRecords.forEach(dup => {
        // Use duplicate data to fill gaps in master
        if (!mergedData.common_name && dup.common_name) {
          mergedData.common_name = dup.common_name;
        }
        if (!mergedData.iucn_status && dup.iucn_status) {
          mergedData.iucn_status = dup.iucn_status;
        }
        if (!mergedData.inat_taxon_id && dup.inat_taxon_id) {
          mergedData.inat_taxon_id = dup.inat_taxon_id;
          mergedData.inat_wikipedia_url = dup.inat_wikipedia_url;
          mergedData.observation_count = dup.observation_count;
        }
        if (!mergedData.gbif_id && dup.gbif_id) {
          mergedData.gbif_id = dup.gbif_id;
          mergedData.gbif_occurrence_count = dup.gbif_occurrence_count;
        }
        if (!mergedData.habitat && dup.habitat) {
          mergedData.habitat = dup.habitat;
        }
        if (!mergedData.image_url && dup.image_url) {
          mergedData.image_url = dup.image_url;
        }
        if (!mergedData.iucn_id && dup.iucn_id) {
          mergedData.iucn_id = dup.iucn_id;
        }
      });

      // Call merge function
      await base44.functions.invoke('mergeSpeciesRecords', {
        masterId: candidate.masterRecordId,
        duplicateIds: candidate.duplicateIds,
        mergedData
      });

      onMergeComplete();
    } catch (error) {
      console.error('Merge error:', error);
      alert('Error merging records: ' + error.message);
    } finally {
      setMerging(false);
    }
  };

  if (!mergeCandidates || mergeCandidates.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-bangor-red">Merge Candidates</DialogTitle>
          </DialogHeader>
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>No duplicate records found. Your database is clean!</AlertDescription>
          </Alert>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-bangor-red">
            Merge Candidates ({mergeCandidates.length} groups found)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-4">
          {mergeCandidates.map((candidate, idx) => (
            <div
              key={idx}
              className="border border-slate-200 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => setExpandedGroup(expandedGroup === idx ? null : idx)}
                className="w-full bg-gradient-to-r from-slate-50 to-slate-100 p-4 hover:bg-slate-100 transition-colors flex justify-between items-center"
              >
                <div className="text-left">
                  <p className="font-semibold text-slate-900">{candidate.scientificName}</p>
                  <p className="text-sm text-slate-600">{candidate.recordCount} records found</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 mb-1">Data gaps:</div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {candidate.dataGaps.map((gap, gIdx) => (
                      <span
                        key={gIdx}
                        className="bg-bangor-sun/20 text-bangor-sun text-xs px-2 py-1 rounded"
                      >
                        {gap.field} ({gap.missing} missing)
                      </span>
                    ))}
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {expandedGroup === idx && (
                <div className="bg-white p-4 border-t space-y-4">
                  {/* Master Record */}
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" /> Master Record
                    </h4>
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <p className="text-sm"><span className="font-semibold">ID:</span> {candidate.masterRecordId}</p>
                      <p className="text-sm"><span className="font-semibold">Common Name:</span> {candidate.masterRecord.common_name || '—'}</p>
                      <p className="text-sm"><span className="font-semibold">IUCN Status:</span> {candidate.masterRecord.iucn_status || '—'}</p>
                      <p className="text-sm"><span className="font-semibold">Data Score:</span> Highest completeness</p>
                    </div>
                  </div>

                  {/* Duplicate Records */}
                  {candidate.duplicateRecords.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <X className="w-4 h-4 text-red-600" /> Duplicates to Merge ({candidate.duplicateRecords.length})
                      </h4>
                      <div className="space-y-2">
                        {candidate.duplicateRecords.map((dup, dIdx) => (
                          <div key={dIdx} className="bg-red-50 border border-red-200 rounded p-3">
                            <p className="text-sm"><span className="font-semibold">ID:</span> {dup.id}</p>
                            <p className="text-sm"><span className="font-semibold">Common Name:</span> {dup.common_name || '—'}</p>
                            <p className="text-sm"><span className="font-semibold">IUCN Status:</span> {dup.iucn_status || '—'}</p>
                            <p className="text-sm"><span className="font-semibold">Created:</span> {new Date(dup.created_date).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Merge Button */}
                  <Button
                    onClick={() => handleMerge(candidate)}
                    disabled={merging}
                    className="w-full bg-bangor-red hover:bg-bangor-red/90"
                  >
                    {merging ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Merging...
                      </>
                    ) : (
                      `Merge ${candidate.recordCount} Records`
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 flex justify-end gap-2">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}