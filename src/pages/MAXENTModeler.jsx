import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronRight, ChevronLeft, Rocket, CheckCircle, History, Info, Loader2, Download, HardDrive, Wifi, ExternalLink, ChevronDown, ThumbsUp, ThumbsDown, Search, AlertCircle, PackageOpen } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import AsyncJobPoller from '@/lib/asyncJobPoller';

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
  const [selectedSpecies, setSelectedSpecies] = useState([]);
  const [selectedLayers, setSelectedLayers] = useState([]);
  const [parameters, setParameters] = useState(DEFAULT_PARAMS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showMaxentSetup, setShowMaxentSetup] = useState(false);
  const [maxentStatus, setMaxentStatus] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const { data: runs = [], refetch: refetchRuns } = useQuery({
    queryKey: ['maxentRuns'],
    queryFn: () => base44.entities.MaxentRun.list('-created_date', 50),
  });

  // Note: MAXENT detection runs server-side (Deno Deploy) and cannot scan the user's local machine.
  // The app generates a ready-to-run package (occurrence CSV + batch script) for local execution.
  useEffect(() => {
    setMaxentStatus('not_found');
    setIsDetecting(false);
  }, []);

  const canProceedFromStep = () => {
    if (currentStep === 1) return selectedSpecies.length > 0;
    if (currentStep === 2) return selectedLayers.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const speciesNames = selectedSpecies.map(s => s.scientific_name).join(', ');
    const name = runName.trim() ||
      `${speciesNames} — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    const occurrenceCount = selectedSpecies.reduce(
      (sum, sp) => sum + (sp.observations?.length || 0) + (sp.gbif_occurrences?.length || 0), 0
    );

    // Save the run record to the database
    const run = await base44.entities.MaxentRun.create({
      name,
      species_id: selectedSpecies[0]?.id,
      species_name: speciesNames,
      climate_dataset_ids: selectedLayers.map(l => l.id),
      climate_dataset_names: selectedLayers.map(l => l.name),
      occurrence_count: occurrenceCount,
      parameters,
      status: 'submitted',
    });

    // Generate occurrence CSV for local MAXENT execution
    const allOccurrences = selectedSpecies.flatMap(sp => [
      ...(sp.observations || []).map(obs => ({
        species: sp.scientific_name,
        longitude: obs.longitude,
        latitude: obs.latitude,
      })),
      ...(sp.gbif_occurrences || []).map(occ => ({
        species: sp.scientific_name,
        longitude: occ.longitude,
        latitude: occ.latitude,
      })),
    ]).filter(o => o.latitude && o.longitude);

    const csvContent = [
      'species,longitude,latitude',
      ...allOccurrences.map(o => `"${o.species}",${o.longitude},${o.latitude}`)
    ].join('\n');

    // Generate a batch script for running MAXENT
    const batchScript = `@echo off
REM DataWinder MAXENT Run Package — ${name}
REM Run ID: ${run.id}
REM Species: ${speciesNames}
REM Generated: ${new Date().toISOString()}
REM
REM INSTRUCTIONS:
REM 1. Place this script in the same folder as maxent.jar
REM 2. Place occurrence.csv in the same folder
REM 3. Place environmental layers (.asc files) in a subfolder called "layers"
REM 4. Run this script — or paste the java command below into your terminal
REM
java -jar maxent.jar environmentallayers=layers samplesfile=occurrence.csv outputdirectory=results autorun betamultiplier=${parameters.regularization_multiplier} maximumiterations=${parameters.max_iterations} replicates=${parameters.replicates} outputformat=${parameters.output_type}
echo Done! Check the "results" folder for model outputs.
pause`;

    // Package as ZIP for download
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      zip.file('occurrence.csv', csvContent);
      zip.file('run_maxent.bat', batchScript);
      zip.file('run_maxent.sh', batchScript.replace(/@echo off\r?\n/, '#!/bin/bash\n').replace(/REM /g, '# '));
      zip.file('README.txt', `DataWinder MAXENT Run Package\n==============================\nRun ID: ${run.id}\nSpecies: ${speciesNames}\nOccurrences: ${allOccurrences.length}\n\nTo run:\n1. Install Java 8+ and download maxent.jar from https://biodiversityinformatics.amnh.org/open_source/maxent/\n2. Place maxent.jar in this folder\n3. Add your climate layers (.asc format) to a subfolder called "layers/"\n4. Run run_maxent.bat (Windows) or run_maxent.sh (Mac/Linux)\n5. Results will appear in the "results/" folder`);
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maxent_run_${run.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Could not generate ZIP package:', err);
    }

    setLastRun({ ...run, name });
    
    // If external job ID provided, start polling with timeout protection
    if (run.external_job_id) {
      const poller = new AsyncJobPoller({
        maxAttempts: 120,
        pollIntervalMs: 60000,
        timeoutMs: 7200000
      });

      poller.poll(
        run.external_job_id,
        async (jobId) => {
          // Fetch job status from backend
          const result = await base44.functions.invoke('pollMaxentJobs', { job_id: jobId });
          return result.data;
        },
        (status) => ['completed', 'failed', 'cancelled'].includes(status?.state?.toLowerCase())
      )
      .then((finalStatus) => {
        toast.success(`MAXENT job ${run.external_job_id} completed!`);
        base44.entities.MaxentRun.update(run.id, { status: 'completed', results: finalStatus });
      })
      .catch((error) => {
        toast.error(`Job polling error: ${error.message}`);
        base44.entities.MaxentRun.update(run.id, { status: 'failed', notes: error.message });
      });
    }
    
    setIsSubmitting(false);
    setCurrentStep(5);
    refetchRuns();
    queryClient.invalidateQueries({ queryKey: ['maxentRuns'] });
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedSpecies([]);
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

        {/* ── MAXENT Setup Banner ── */}
         <div className="mb-6 rounded-xl border overflow-hidden border-blue-200 bg-blue-50">
           <button
             onClick={() => setShowMaxentSetup(v => !v)}
             className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-blue-100"
           >
             <PackageOpen className="w-5 h-5 text-blue-600 shrink-0" />
             <div className="flex-1">
               <p className="text-sm font-semibold text-blue-900">How DataWinder runs MAXENT</p>
               <p className="text-xs text-blue-700 mt-0.5">DataWinder prepares and downloads a ready-to-run package — you run it locally with your MAXENT installation. Click to learn more.</p>
             </div>
             <ChevronDown className={`w-4 h-4 text-blue-600 transition-transform ${showMaxentSetup ? 'rotate-180' : ''}`} />
           </button>

          {showMaxentSetup && (
            <div className="px-5 pb-5 pt-4 space-y-4 border-t border-blue-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-blue-900"><span className="text-lg">1️⃣</span> Build in DataWinder</div>
                  <p className="text-xs text-slate-600">Select species, climate layers and parameters using this wizard. DataWinder packages your occurrence data automatically.</p>
                </div>
                <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-blue-900"><span className="text-lg">2️⃣</span> Download ZIP Package</div>
                  <p className="text-xs text-slate-600">On submit, a ZIP is downloaded containing your occurrence CSV and a pre-configured run script (Windows + Mac/Linux).</p>
                </div>
                <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-blue-900"><span className="text-lg">3️⃣</span> Run Locally</div>
                  <p className="text-xs text-slate-600">Add your climate layers (.asc) to the <code className="bg-slate-100 px-1 rounded">layers/</code> folder alongside <code className="bg-slate-100 px-1 rounded">maxent.jar</code>, then run the script.</p>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3">
                <HardDrive className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Need MAXENT?</p>
                  <p className="text-xs text-slate-600 mt-0.5">Download <strong>maxent.jar</strong> (requires Java 8+) from AMNH — free for academic use.</p>
                  <a href="https://biodiversityinformatics.amnh.org/open_source/maxent/" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-bangor-red font-semibold underline">
                    <Download className="w-3 h-3" /> Download MAXENT from AMNH <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
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
                     placeholder={`e.g. ${selectedSpecies[0]?.scientific_name ?? 'species'} baseline run`}
                      value={runName}
                      onChange={e => setRunName(e.target.value)}
                      className="max-w-md border-slate-200"
                    />
                  </div>

                  {/* Summary tiles */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Species ({selectedSpecies.length})</div>
                      <div className="space-y-0.5">
                        {selectedSpecies.map(sp => (
                          <div key={sp.id} className="font-semibold text-slate-900 italic text-xs truncate">{sp.scientific_name}</div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs font-bold text-green-700">
                        {selectedSpecies.reduce((s, sp) => s + (sp.observations?.length || 0) + (sp.gbif_occurrences?.length || 0), 0)} total occurrence records
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
                         DataWinder will generate a <strong>ready-to-run ZIP package</strong> containing your occurrence CSV and a batch script pre-configured with your parameters.
                         Download it, place your climate layers in a <code className="bg-blue-100 px-1 rounded text-xs">layers/</code> subfolder alongside <code className="bg-blue-100 px-1 rounded text-xs">maxent.jar</code>, then run the included script.
                         The run record is also saved to your history.
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
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Run Package Downloaded!</h2>
                  <p className="text-slate-600 mb-1 max-w-md mx-auto">
                    Your MAXENT run package for{' '}
                    <em className="font-semibold italic">{lastRun?.species_name}</em>{' '}
                    has been downloaded. Unzip it, add your climate layers to the <code className="bg-slate-100 px-1 rounded text-xs">layers/</code> folder, then run the included script.
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
                className={`${canProceedFromStep() ? 'bg-bangor-red border-bangor-red text-white' : 'bg-slate-200 text-slate-600 cursor-not-allowed opacity-100'}`}
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