import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Database, Sparkles, Info, Globe, Filter, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import JSZip from 'jszip';
import ConservationComplianceChecker from '@/components/compliance/ConservationComplianceChecker';
import ProcessingFeedback from '@/components/ui/ProcessingFeedback';

const getFileExt = (name) => name.split('.').pop().toLowerCase();

export default function UniversalFileUploader({ onImported, targetSpecies = null }) {
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('idle');
  const [fileInfo, setFileInfo] = useState(null);
  const [classification, setClassification] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [importCount, setImportCount] = useState(0);
  const [fileUrl, setFileUrl] = useState(null);
  const [showCompliance, setShowCompliance] = useState(false);
  const [complianceResult, setComplianceResult] = useState(null);
  const inputRef = useRef();

  const reset = () => {
    setStep('idle');
    setFileInfo(null);
    setClassification(null);
    setSelectedEntity(null);
    setParsedRows([]);
    setErrorMsg('');
    setImportCount(0);
    setFileUrl(null);
    setShowCompliance(false);
    setComplianceResult(null);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setOpen(true);
    setStep('uploading');
    setFileInfo({ name: file.name, size: file.size, type: file.type });

    try {
      // Upload file
      const uploadedFile = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(uploadedFile.file_url);

      // Classify with Claude Opus 4.6
      setStep('classifying');
      const response = await base44.functions.invoke('universalFileClassifier', {
        file_url: uploadedFile.file_url,
        file_name: file.name,
        file_type: file.type
      });

      const result = response.data.classification;
      setClassification(result);
      setSelectedEntity(result.recommended_entity);

      // Parse file content if supported
      if (['csv', 'json', 'txt', 'geojson'].includes(getFileExt(file.name))) {
        const parseResult = await base44.functions.invoke('parseAndImportFile', {
          file_url: uploadedFile.file_url,
          original_name: file.name,
          suggested_entity: result.recommended_entity
        });

        if (parseResult.data?.records) {
          setParsedRows(parseResult.data.records);
          setStep('compliance_check');
          setShowCompliance(true);
        } else {
          setErrorMsg(parseResult.data?.error || 'Could not parse file');
          setStep('error');
        }
      } else {
        // Binary file (PDF, XLSX) - just store classification
        setStep('review');
      }

    } catch (error) {
      setErrorMsg(error.message || 'Failed to process file');
      setStep('error');
    }
  };

  const handleImport = async () => {
    if (!selectedEntity || parsedRows.length === 0) return;
    setStep('importing');

    try {
      const entity = base44.entities[selectedEntity];
      if (!entity) throw new Error(`Unknown entity: ${selectedEntity}`);
      
      const created = await entity.bulkCreate(parsedRows);

      // Log import
      const user = await base44.auth.me();
      await base44.entities.ImportLog.create({
        user_email: user?.email || '',
        user_name: user?.full_name || '',
        entity_type: selectedEntity,
        file_name: fileInfo?.name || '',
        record_count: parsedRows.length,
        record_ids: Array.isArray(created) ? created.map(r => r.id).filter(Boolean) : [],
        status: 'completed'
      });

      setImportCount(parsedRows.length);
      setStep('done');
      onImported && onImported(selectedEntity, parsedRows.length);
    } catch (error) {
      setErrorMsg(error.message || 'Import failed');
      setStep('error');
    }
  };

  const handleComplianceComplete = (result) => {
    setComplianceResult(result);
    if (result.summary.total_errors === 0) {
      setStep('review');
      setShowCompliance(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <>
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 select-none
          ${dragging
            ? 'border-bangor-red bg-bangor-red/5 scale-[1.01]'
            : 'border-slate-300 bg-slate-50 hover:border-bangor-red/50 hover:bg-bangor-red/5'
          }`}
      >
        <input ref={inputRef} type="file" className="hidden"
           accept=".csv,.xlsx,.xls,.json,.txt,.pdf,.geojson,.zip"
           onChange={(e) => handleFile(e.target.files[0])} />
        <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors ${dragging ? 'text-bangor-red' : 'text-slate-400'}`} />
        <p className="text-sm font-semibold text-slate-600">
           {dragging ? 'Release to classify with AI' : 'Drag & drop any file for AI classification'}
         </p>
         <p className="text-xs text-slate-400 mt-1">Powered by Claude Opus 4.6 · CSV · Excel · PDF · JSON · GeoJSON</p>
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); setOpen(false); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-bangor-red" />
              Universal File Import
            </DialogTitle>
          </DialogHeader>

          {/* Uploading */}
          {step === 'uploading' && (
            <ProcessingFeedback
              label="Uploading file…"
              detail={`Processing ${fileInfo?.name} (${(fileInfo?.size / 1024 / 1024).toFixed(1)}MB)`}
              tips={[
                'Files are encrypted during transfer to our secure servers.',
                'Larger files may take a few moments to upload.',
                'No data is shared with third parties during upload.',
              ]}
            />
          )}

          {/* Classifying with AI */}
          {step === 'classifying' && (
            <ProcessingFeedback
              label="AI Classification in Progress…"
              detail="Using Claude Opus 4.6 to analyze file content and structure"
              tips={[
                'Claude Opus 4.6 is analyzing the file to identify data type, format, and optimal database destination.',
                'This step validates the content structure and detects compliance issues automatically.',
                'Classification results help ensure data integrity before import.',
              ]}
            />
          )}

          {/* Compliance Check */}
          {step === 'compliance_check' && showCompliance && (
            <ConservationComplianceChecker
              records={parsedRows}
              complianceType={selectedEntity === 'OccurrenceNote' ? 'occurrence_import' : 'species_import'}
              onComplete={handleComplianceComplete}
            />
          )}

          {/* Review Classification */}
          {step === 'review' && classification && (
            <div className="space-y-4">
              {/* AI Classification Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-purple-900">AI Classification Result (Claude Opus 4.6)</p>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <p className="text-xs text-slate-600">File Type</p>
                        <p className="text-sm font-semibold">{classification.file_type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Content Type</p>
                        <p className="text-sm font-semibold">{classification.content_type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Recommended Entity</p>
                        <Badge className="bg-bangor-red text-white">{classification.recommended_entity}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Confidence</p>
                        <p className="text-sm font-semibold">{(classification.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 italic">{classification.reasoning}</p>
                    
                    {classification.detected_fields?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-slate-600 mb-1">Detected Fields:</p>
                        <div className="flex flex-wrap gap-1">
                          {classification.detected_fields.slice(0, 10).map(f => (
                            <span key={f} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded">{f}</span>
                          ))}
                          {classification.detected_fields.length > 10 && <span className="text-[10px] text-slate-500">+{classification.detected_fields.length - 10} more</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Compliance Flags */}
              {classification.compliance_flags?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">Compliance Flags Detected</p>
                      <ul className="text-xs text-amber-700 mt-1 list-disc list-inside">
                        {classification.compliance_flags.map((flag, i) => (
                          <li key={i}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Entity Selection */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Import into which database table?</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Species', 'OccurrenceNote', 'ClimateDataset', 'Literature', 'ValidationRule', 'ThreatAssessment', 'SDMRun', 'MaxentRun'].map(entity => (
                    <button
                      key={entity}
                      onClick={() => setSelectedEntity(entity)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left transition-all
                        ${selectedEntity === entity
                          ? 'border-bangor-red bg-bangor-red/5 shadow-sm'
                          : 'border-slate-200 hover:border-bangor-red/50'
                        }`}
                    >
                      <Database className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="text-sm font-medium">{entity}</span>
                      {classification.recommended_entity === entity && (
                        <Sparkles className="w-3 h-3 text-bangor-red ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { reset(); setOpen(false); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-bangor-red hover:bg-bangor-red/90 text-white"
                  disabled={!selectedEntity}
                  onClick={handleImport}
                >
                  Import to {selectedEntity}
                </Button>
              </div>
            </div>
          )}

          {/* Importing */}
          {step === 'importing' && (
            <ProcessingFeedback
              label={`Importing ${parsedRows.length} records…`}
              detail={`Adding data to ${selectedEntity} and creating audit trail`}
              tips={[
                'Each record is validated against compliance standards before insertion.',
                'An audit log is automatically created for all imported data.',
                'You can track import history in the Import History page.',
              ]}
            />
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
              <div className="text-center">
                <p className="font-bold text-slate-700 text-lg">Import Complete!</p>
                <p className="text-sm text-slate-500 mt-1">{importCount} records added to <strong>{selectedEntity}</strong></p>
              </div>
              <Button className="bg-bangor-red hover:bg-bangor-red/90 text-white" onClick={() => { reset(); setOpen(false); }}>
                Done
              </Button>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <div className="text-center">
                <p className="font-bold text-slate-700">Something went wrong</p>
                <p className="text-sm text-red-500 mt-1">{errorMsg}</p>
              </div>
              <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}