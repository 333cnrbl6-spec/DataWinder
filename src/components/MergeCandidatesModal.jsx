import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Loader2, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const COMPARE_FIELDS = [
  { key: 'common_name', label: 'Common Name' },
  { key: 'iucn_status', label: 'IUCN Status' },
  { key: 'habitat', label: 'Habitat' },
  { key: 'inat_taxon_id', label: 'iNaturalist ID' },
  { key: 'observation_count', label: 'Observations' },
  { key: 'gbif_id', label: 'GBIF ID' },
  { key: 'gbif_occurrence_count', label: 'GBIF Occurrences' },
  { key: 'image_url', label: 'Image URL' },
  { key: 'iucn_id', label: 'IUCN ID' },
];

export default function MergeCandidatesModal({ isOpen, onClose, mergeCandidates, onMergeComplete }) {
  const [expandedGroup, setExpandedGroup] = useState(null);
  // selectedFields[`${groupIdx}-${fieldKey}`] = 'master' | '0' | '1' ... (dup index as string)
  const [selectedFields, setSelectedFields] = useState({});
  const [merging, setMerging] = useState(null);

  const getFieldSource = (groupIdx, fieldKey) =>
    selectedFields[`${groupIdx}-${fieldKey}`] ?? 'master';

  const handleFieldSelect = (groupIdx, fieldKey, source) => {
    setSelectedFields(prev => ({ ...prev, [`${groupIdx}-${fieldKey}`]: source }));
  };

  const buildMergedData = (candidate, groupIdx) => {
    const mergedData = { ...candidate.masterRecord };
    COMPARE_FIELDS.forEach(f => {
      const source = getFieldSource(groupIdx, f.key);
      if (source !== 'master') {
        const dupIdx = parseInt(source);
        const dup = candidate.duplicateRecords[dupIdx];
        if (dup && dup[f.key] !== undefined) {
          mergedData[f.key] = dup[f.key];
        }
      }
    });
    return mergedData;
  };

  const handleMerge = async (candidate, idx) => {
    setMerging(idx);
    try {
      const mergedData = buildMergedData(candidate, idx);
      await base44.functions.invoke('mergeSpeciesRecords', {
        masterId: candidate.masterRecordId,
        duplicateIds: candidate.duplicateIds,
        mergedData
      });
      onMergeComplete();
    } catch (error) {
      alert('Error merging records: ' + error.message);
    } finally {
      setMerging(null);
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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-bangor-red">
            Merge Candidates — {mergeCandidates.length} group{mergeCandidates.length !== 1 ? 's' : ''} found
          </DialogTitle>
          <p className="text-xs text-slate-500">Expand each group to review fields and choose which values to keep before merging.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {mergeCandidates.map((candidate, idx) => {
            const allRecords = [candidate.masterRecord, ...candidate.duplicateRecords];
            const relevantFields = COMPARE_FIELDS.filter(f => allRecords.some(r => r?.[f.key] != null));
            const isExpanded = expandedGroup === idx;

            return (
              <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Collapsible Header */}
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : idx)}
                  className="w-full bg-gradient-to-r from-slate-50 to-slate-100 p-4 hover:bg-slate-100 transition-colors flex justify-between items-center text-left"
                >
                  <div>
                    <p className="font-semibold text-slate-900 italic">{candidate.scientificName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{candidate.recordCount} records · click to review</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 flex-wrap justify-end">
                      {candidate.dataGaps.slice(0, 3).map((gap, gIdx) => (
                        <span key={gIdx} className="bg-bangor-sun/20 text-bangor-sun text-xs px-2 py-0.5 rounded">
                          {gap.field}
                        </span>
                      ))}
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    }
                  </div>
                </button>

                {/* Expanded: field-level comparison */}
                {isExpanded && (
                  <div className="bg-white p-4 border-t space-y-4">
                    {relevantFields.length > 0 ? (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">
                          Click a cell to select which value to use in the merged record.
                          <span className="ml-1 text-amber-500">⚠</span> = conflicting values.
                        </p>
                        <div className="border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
                          <table className="w-full text-xs min-w-[500px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="text-left p-2.5 font-semibold text-slate-500 w-28">Field</th>
                                <th className="text-left p-2.5 font-semibold text-bangor-red bg-bangor-red/5">
                                  <Crown className="w-3 h-3 inline mr-1" />Master
                                </th>
                                {candidate.duplicateRecords.map((_, dIdx) => (
                                  <th key={dIdx} className="text-left p-2.5 font-semibold text-slate-400">
                                    Duplicate {dIdx + 1}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {relevantFields.map((field, fIdx) => {
                                const masterVal = candidate.masterRecord?.[field.key];
                                const dupVals = candidate.duplicateRecords.map(d => d?.[field.key]);
                                const hasConflict = dupVals.some(v => v != null && String(v) !== String(masterVal));
                                const currentSource = getFieldSource(idx, field.key);

                                return (
                                  <tr key={field.key} className={`border-t border-slate-100 ${fIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                    <td className="p-2.5 font-medium text-slate-500">
                                      {field.label}
                                      {hasConflict && <span className="ml-1 text-amber-500">⚠</span>}
                                    </td>

                                    {/* Master cell */}
                                    <td
                                      onClick={() => handleFieldSelect(idx, field.key, 'master')}
                                      className={`p-2.5 cursor-pointer transition-colors select-none ${
                                        currentSource === 'master'
                                          ? 'bg-bangor-red/10 text-slate-900 font-semibold'
                                          : 'text-slate-500 hover:bg-slate-100'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                                          currentSource === 'master' ? 'border-bangor-red bg-bangor-red' : 'border-slate-300 bg-white'
                                        }`} />
                                        <span className="truncate max-w-[120px]" title={String(masterVal ?? '')}>
                                          {String(masterVal ?? '—')}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Duplicate cells */}
                                    {candidate.duplicateRecords.map((dup, dIdx) => {
                                      const dupVal = dup?.[field.key];
                                      const isSelected = currentSource === String(dIdx);
                                      const hasValue = dupVal != null;
                                      return (
                                        <td
                                          key={dIdx}
                                          onClick={() => hasValue && handleFieldSelect(idx, field.key, String(dIdx))}
                                          className={`p-2.5 transition-colors select-none ${
                                            hasValue ? 'cursor-pointer' : 'cursor-not-allowed opacity-30'
                                          } ${
                                            isSelected
                                              ? 'bg-bangor-sun/20 text-slate-900 font-semibold'
                                              : 'text-slate-400 hover:bg-slate-50'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                                              isSelected ? 'border-bangor-sun bg-bangor-sun' : 'border-slate-300 bg-white'
                                            }`} />
                                            <span className="truncate max-w-[120px]" title={String(dupVal ?? '')}>
                                              {String(dupVal ?? '—')}
                                            </span>
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No differing fields to compare.</p>
                    )}

                    <Button
                      onClick={() => handleMerge(candidate, idx)}
                      disabled={merging === idx}
                      className="w-full bg-bangor-red hover:bg-bangor-red/90"
                    >
                      {merging === idx ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Merging...</>
                      ) : (
                        `Merge ${candidate.recordCount} Records into Master`
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t pt-4 flex justify-end">
          <Button onClick={onClose} variant="outline">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}