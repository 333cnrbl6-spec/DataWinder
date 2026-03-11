import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronRight, ChevronLeft, Rocket, CheckCircle, History, Info, Loader2 } from 'lucide-react';

import StepIndicator from '@/components/maxent/StepIndicator';
import SpeciesSelector from '@/components/maxent/SpeciesSelector';
import LayerSelector from '@/components/maxent/LayerSelector';
import ParametersPanel from '@/components/maxent/ParametersPanel';
import RunHistoryTable from '@/components/maxent/RunHistoryTable';

// ─── Step definitions ────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Select Species',      description: 'Choose which species' },
  { id: 2, label: 'Environmental Layers', description: 'Choose climate variables' },
  { id: 3, label: 'Model Parameters',    description: 'Configure settings' },
  { id: 4, label: 'Review & Submit',     description: 'Check and run' },
];

const DEFAULT_PARAMS = {
  regularization_multiplier: 1.0,
  max_iterations: 500,
  convergence_threshold: 0.00001,
  replicates: 1,
  output_type: 'logistic',
  feature_types: ['linear', 'quadratic', 'hinge'],
};

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MAXENTModeler() {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [runName, setRunName] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [selectedLayers, setSelectedLayers] = useState([]);
  const [parameters, setParameters] = useState(DEFAULT_PARAMS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: runs = [], refetch: refetchRuns } = useQuery({
    queryKey: ['maxentRuns'],
    queryFn: () => base44.entities.MaxentRun.list('-created_date', 50),
  });

  const canProceedFromStep = () => {
    if (currentStep === 1) return !!selectedSpecies;
    if (currentStep === 2) return selectedLayers.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const name = runName.trim() ||
      `${selectedSpecies.scientific_name} — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    const occurrenceCount =
      (selectedSpecies.observations?.length || 0) +
      (selectedSpecies.gbif_occurrences?.length || 0);

    // Save the run record to the database
    const run = await base44.entities.MaxentRun.create({
      name,
      species_id: selectedSpecies.id,
      species_name: selectedSpecies.scientific_name,
      climate_dataset_ids: selectedLayers.map(l => l.id),
      climate_dataset_names: selectedLayers.map(l => l.name),
      occurrence_count: occurrenceCount,
      parameters,
      status: 'submitted',
    });

    // Notify backend function (placeholder hook for external MAXENT service)
    try {
      await base44.functions.invoke('runMaxentModel', {
        run_id: run.id,
        species_name: selectedSpecies.scientific_name,
        parameters,
        layer_names: selectedLayers.map(l => l.name),
        occurrence_count: occurrenceCount,
      });
    } catch {
      // Non-critical — run is already saved regardless
    }

    setLastRun({ ...run, name });
    setIsSubmitting(false);
    setCurrentStep(5);
    refetchRuns();
    queryClient.invalidateQueries({ queryKey: ['maxentRuns'] });
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedSpecies(null);
    setSelectedLayers([]);
    setParameters(DEFAULT_PARAMS);
    setRunName('');
    setLastRun(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Page Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-bangor-red tracking-tight">
            MAXENT Species Distribution Modeller
          </h1>
          <p className="mt-2 text-slate-600 max-w-2xl leading-relaxed">
            Predict where a species is likely to survive based on its known locations and environmental conditions.
            Follow the steps below — we'll guide you through each one.
          </p>

          {/* Run history toggle */}
          <button
            onClick={() => setShowHistory(v => !v)}
            className="mt-3 flex items-center gap-2 text-sm font-semibold text-bangor-red hover:underline transition-colors"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide' : 'View'} run history ({runs.length})
          </button>
        </div>

        {/* ── Run History (collapsible) ── */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              key="history"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <RunHistoryTable runs={runs} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Step Indicator ── */}
        {currentStep < 5 && (
          <StepIndicator steps={STEPS} currentStep={currentStep} />
        )}

        {/* ── Step Content ── */}
        <AnimatePresence mode="wait">

          {/* Step 1: Species */}
          {currentStep === 1 && (
            <motion.div key="s1"
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
            >
              <SpeciesSelector selectedSpecies={selectedSpecies} onSelect={setSelectedSpecies} />
            </motion.div>
          )}

          {/* Step 2: Layers */}
          {currentStep === 2 && (
            <motion.div key="s2"
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
            >
              <LayerSelector selectedLayers={selectedLayers} onSelectionChange={setSelectedLayers} />
            </motion.div>
          )}

          {/* Step 3: Parameters */}
          {currentStep === 3 && (
            <motion.div key="s3"
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
            >
              <ParametersPanel parameters={parameters} onChange={setParameters} />
            </motion.div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <motion.div key="s4"
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="shadow-lg border-slate-200">
                <CardHeader className="bg-gradient-to-r from-bangor-red/8 to-bangor-sun/8 border-b border-slate-200">
                  <CardTitle className="text-bangor-red text-lg">Review Your Model Run</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Check everything looks right before submitting. You can go back to change anything.
                  </p>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                  {/* Optional run name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Give this run a name{' '}
                      <span className="text-slate-400 font-normal">(optional — helps you find it later)</span>
                    </label>
                    <Input
                      placeholder={`e.g. ${selectedSpecies?.scientific_name} baseline run`}
                      value={runName}
                      onChange={e => setRunName(e.target.value)}
                      className="max-w-md border-slate-200"
                    />
                  </div>

                  {/* Summary tiles */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Species</div>
                      <div className="font-semibold text-slate-900 italic text-sm">{selectedSpecies?.scientific_name}</div>
                      {selectedSpecies?.common_name && (
                        <div className="text-xs text-slate-500 mt-0.5">{selectedSpecies.common_name}</div>
                      )}
                      <div className="mt-2 text-xs font-bold text-green-700">
                        {(selectedSpecies?.observations?.length || 0) + (selectedSpecies?.gbif_occurrences?.length || 0)} occurrence records
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Environmental Layers</div>
                      <div className="font-bold text-slate-900 text-lg">{selectedLayers.length}</div>
                      <div className="mt-1.5 space-y-0.5">
                        {selectedLayers.slice(0, 3).map(l => (
                          <div key={l.id} className="text-xs text-slate-600 truncate">• {l.name}</div>
                        ))}
                        {selectedLayers.length > 3 && (
                          <div className="text-xs text-slate-400">+{selectedLayers.length - 3} more…</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Parameters</div>
                      <div className="space-y-1.5 text-xs">
                        {[
                          ['Regularisation', parameters.regularization_multiplier],
                          ['Max iterations', parameters.max_iterations],
                          ['Output type', parameters.output_type],
                          ['Replicates', parameters.replicates],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="text-slate-600">{k}:</span>
                            <span className="font-semibold text-slate-900 capitalize">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* How it works notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">What happens when you click Submit?</p>
                      <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                        Your model configuration and occurrence data will be packaged and saved.
                        The run will be sent to the external MAXENT processing service (once connected).
                        You can track the status of this run in the Run History at the top of this page.
                      </p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 5: Success */}
          {currentStep === 5 && (
            <motion.div key="s5"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-lg border-slate-200 text-center">
                <CardContent className="py-16 px-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle className="w-9 h-9 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Model Run Submitted!</h2>
                  <p className="text-slate-600 mb-1 max-w-md mx-auto">
                    Your MAXENT configuration for{' '}
                    <em className="font-semibold italic">{lastRun?.species_name}</em>{' '}
                    has been saved and queued.
                  </p>
                  <p className="text-xs text-slate-400 mb-8">
                    Run ID: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono">{lastRun?.id}</code>
                  </p>
                  <div className="flex justify-center gap-3 flex-wrap">
                    <Button onClick={resetWizard} className="bg-bangor-red text-white border-bangor-red">
                      <Rocket className="w-4 h-4 mr-2" />
                      Start Another Run
                    </Button>
                    <Button
                      onClick={() => { setShowHistory(true); setCurrentStep(1); resetWizard(); }}
                      variant="outline"
                    >
                      <History className="w-4 h-4 mr-2" />
                      View Run History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Navigation Buttons ── */}
        {currentStep < 5 && (
          <div className="flex justify-between mt-6">
            <Button
              onClick={() => setCurrentStep(s => s - 1)}
              disabled={currentStep === 1}
              variant="outline"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep(s => s + 1)}
                disabled={!canProceedFromStep()}
                className={`${canProceedFromStep() ? 'bg-bangor-red border-bangor-red text-white' : ''}`}
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-bangor-red border-bangor-red text-white px-8 font-bold"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                ) : (
                  <><Rocket className="w-4 h-4 mr-2" /> Submit Model Run</>
                )}
              </Button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}