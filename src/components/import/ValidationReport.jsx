import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, FileCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ValidationReport({ validation, onApplyCorrections, onDismiss, onImport }) {
  const [expandedRecords, setExpandedRecords] = useState(new Set());
  const [appliedCorrections, setAppliedCorrections] = useState({});

  const toggleRecord = (idx) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedRecords(newExpanded);
  };

  const toggleCorrection = (recordIdx, correctionIdx) => {
    const key = `${recordIdx}-${correctionIdx}`;
    setAppliedCorrections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const applyAllCorrections = () => {
    const corrections = {};
    validation.validations.forEach((rec, recIdx) => {
      rec.corrections?.forEach((corr, corrIdx) => {
        corrections[`${recIdx}-${corrIdx}`] = true;
      });
    });
    setAppliedCorrections(corrections);
  };

  const handleImport = () => {
    const correctedRecords = [];
    
    validation.validations.forEach((rec, recIdx) => {
      let record = { ...rec };
      
      rec.corrections?.forEach((corr, corrIdx) => {
        if (appliedCorrections[`${recIdx}-${corrIdx}`]) {
          record[corr.field] = corr.corrected;
        }
      });
      
      correctedRecords.push(record);
    });

    onImport?.(correctedRecords);
  };

  const { summary } = validation;
  const hasErrors = summary.invalid_records > 0;
  const hasCorrections = summary.total_corrections_available > 0;
  const hasWarnings = summary.total_warnings > 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-600 font-medium">Total Records</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total_records}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-600 font-medium">Valid</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{summary.valid_records}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-600 font-medium">Issues</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{summary.invalid_records}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-600 font-medium">Pass Rate</p>
            <p className="text-2xl font-bold text-bangor-red mt-1">{summary.pass_rate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {summary.invalid_records} record(s) have validation errors that must be resolved before import.
          </AlertDescription>
        </Alert>
      )}

      {hasCorrections && !hasErrors && (
        <Alert className="bg-blue-50 border-blue-200">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            {summary.total_corrections_available} automatic correction(s) available. Review and apply below.
          </AlertDescription>
        </Alert>
      )}

      {!hasErrors && !hasCorrections && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            All records are valid and ready to import.
          </AlertDescription>
        </Alert>
      )}

      {hasCorrections && (
        <div className="flex gap-2">
          <Button
            onClick={applyAllCorrections}
            variant="outline"
            className="text-xs"
          >
            Apply All Corrections
          </Button>
        </div>
      )}

      {/* Record Details */}
      <div className="space-y-2">
        {validation.validations.map((recordVal, idx) => (
          <motion.div key={idx} layout>
            <Card className={`${recordVal.is_valid ? '' : 'border-red-200 bg-red-50'}`}>
              <button
                onClick={() => toggleRecord(idx)}
                className="w-full text-left"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {recordVal.is_valid ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-slate-900">
                          {recordVal.record_summary.scientific_name || `Record ${idx + 1}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {recordVal.record_summary.id_field && `ID: ${recordVal.record_summary.id_field}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {recordVal.error_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {recordVal.error_count} error{recordVal.error_count > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {recordVal.warning_count > 0 && (
                        <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50">
                          {recordVal.warning_count} warning{recordVal.warning_count > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {recordVal.correction_count > 0 && (
                        <Badge variant="outline" className="text-xs text-blue-700 border-blue-200 bg-blue-50">
                          {recordVal.correction_count} fix
                        </Badge>
                      )}
                      {(recordVal.error_count > 0 || recordVal.warning_count > 0 || recordVal.correction_count > 0) && (
                        expandedRecords.has(idx) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </button>

              <AnimatePresence>
                {expandedRecords.has(idx) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <CardContent className="pt-0 space-y-4 border-t border-slate-200">
                      {/* Errors */}
                      {recordVal.errors.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-red-700">Errors</p>
                          {recordVal.errors.map((error, errIdx) => (
                            <div key={errIdx} className="p-3 bg-red-100 border border-red-300 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-red-900">{error.field}</p>
                                  <p className="text-xs text-red-800 mt-1">{error.message}</p>
                                  {error.suggestions && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {error.suggestions.map((sugg, i) => (
                                        <span key={i} className="text-xs bg-red-200 text-red-900 px-2 py-1 rounded">
                                          {sugg}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Warnings */}
                      {recordVal.warnings.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-amber-700">Warnings</p>
                          {recordVal.warnings.map((warn, warnIdx) => (
                            <div key={warnIdx} className="p-3 bg-amber-100 border border-amber-300 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-amber-900">{warn.field}</p>
                                  <p className="text-xs text-amber-800 mt-1">{warn.message}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Corrections */}
                      {recordVal.corrections.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-blue-700">Available Corrections</p>
                          {recordVal.corrections.map((corr, corrIdx) => {
                            const isApplied = appliedCorrections[`${idx}-${corrIdx}`];
                            return (
                              <div
                                key={corrIdx}
                                onClick={() => toggleCorrection(idx, corrIdx)}
                                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                  isApplied
                                    ? 'bg-blue-100 border-blue-300'
                                    : 'bg-blue-50 border-blue-200'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isApplied}
                                    onChange={() => {}}
                                    className="mt-0.5 w-4 h-4"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-900">{corr.field}</p>
                                    <p className="text-xs text-blue-800 mt-1">{corr.reason}</p>
                                    <div className="mt-2 flex items-center gap-2 text-xs">
                                      <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded font-mono">
                                        {JSON.stringify(corr.original)}
                                      </span>
                                      <span>→</span>
                                      <span className="bg-green-200 text-green-900 px-2 py-1 rounded font-mono">
                                        {JSON.stringify(corr.corrected)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={onDismiss} variant="outline" className="flex-1">
          Back
        </Button>
        {!hasErrors && (
          <Button
            onClick={handleImport}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <FileCheck className="w-4 h-4 mr-2" />
            Import {summary.valid_records} Record{summary.valid_records > 1 ? 's' : ''}
          </Button>
        )}
      </div>
    </div>
  );
}