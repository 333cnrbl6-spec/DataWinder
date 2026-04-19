import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  CheckCircle2, AlertTriangle, AlertCircle, Loader2, ChevronRight, 
  FileCheck, TrendingUp, Bug, Shield, Zap, Download 
} from 'lucide-react';
import { format } from 'date-fns';

const CHECK_TYPES = [
  {
    id: 'duplicate_detection',
    label: 'Duplicate Detection',
    description: 'Identify identical or near-identical records based on coordinates and dates',
    icon: AlertCircle
  },
  {
    id: 'taxonomic_validation',
    label: 'Taxonomic Validation',
    description: 'Cross-reference species names and detect naming inconsistencies',
    icon: Shield
  },
  {
    id: 'coordinate_outlier',
    label: 'Coordinate Analysis',
    description: 'Flag geographically anomalous occurrence locations',
    icon: TrendingUp
  },
  {
    id: 'temporal_validation',
    label: 'Temporal Validation',
    description: 'Check dates for impossibilities or extreme age',
    icon: Zap
  },
  {
    id: 'comprehensive',
    label: 'Comprehensive Check',
    description: 'Run all checks simultaneously for complete data quality assessment',
    icon: FileCheck
  }
];

export default function DataQualityWizard() {
  const { projectId } = useParams();
  const [step, setStep] = useState('select'); // select | species | checks | running | results
  const [selectedSpecies, setSelectedSpecies] = useState([]);
  const [selectedChecks, setSelectedChecks] = useState([]);
  const [runningChecks, setRunningChecks] = useState({});
  const [completedChecks, setCompletedChecks] = useState({});
  const queryClient = useQueryClient();

  // Fetch project
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () =>
      base44.entities.Project.filter({ id: projectId }).then(p => p[0]),
    enabled: !!projectId
  });

  // Fetch species for project
  const { data: allSpecies = [] } = useQuery({
    queryKey: ['species-project', projectId],
    queryFn: () => {
      if (!project?.species_ids || project.species_ids.length === 0) return [];
      return base44.entities.Species.filter(
        { id: { $in: project.species_ids } },
        'scientific_name',
        100
      );
    },
    enabled: !!project?.species_ids
  });

  // Fetch recent quality checks
  const { data: recentChecks = [] } = useQuery({
    queryKey: ['quality-checks', projectId],
    queryFn: () =>
      base44.entities.DataQualityCheck.filter(
        { project_id: projectId },
        '-run_date',
        20
      ),
    enabled: !!projectId
  });

  // Run quality check mutation
  const runCheckMutation = useMutation({
    mutationFn: async ({ speciesId, checkType }) => {
      const key = `${speciesId}-${checkType}`;
      setRunningChecks(prev => ({ ...prev, [key]: true }));

      try {
        const result = await base44.functions.invoke('runDataQualityCheck', {
          project_id: projectId,
          species_id: speciesId,
          check_type: checkType
        });

        setCompletedChecks(prev => ({
          ...prev,
          [key]: result.data
        }));

        return result.data;
      } finally {
        setRunningChecks(prev => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-checks', projectId] });
    }
  });

  const handleSelectSpecies = (speciesId) => {
    setSelectedSpecies(prev =>
      prev.includes(speciesId)
        ? prev.filter(id => id !== speciesId)
        : [...prev, speciesId]
    );
  };

  const handleSelectCheck = (checkId) => {
    setSelectedChecks(prev =>
      prev.includes(checkId)
        ? prev.filter(id => id !== checkId)
        : [...prev, checkId]
    );
  };

  const handleRunChecks = async () => {
    setStep('running');
    for (const speciesId of selectedSpecies) {
      for (const checkType of selectedChecks) {
        await runCheckMutation.mutateAsync({ speciesId, checkType });
      }
    }
    setStep('results');
  };

  const resetWizard = () => {
    setStep('select');
    setSelectedSpecies([]);
    setSelectedChecks([]);
    setCompletedChecks({});
  };

  const isLoading = Object.keys(runningChecks).length > 0;
  const totalChecksToRun = selectedSpecies.length * selectedChecks.length;
  const completedCount = Object.keys(completedChecks).length;
  const progress = totalChecksToRun > 0 ? (completedCount / totalChecksToRun) * 100 : 0;

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <FileCheck className="w-8 h-8" />
            Data Quality Wizard
          </h1>
          <p className="text-slate-600">{project.title} • Comprehensive data validation against public databases</p>
        </div>

        {/* Step 1: Select Checks */}
        {step === 'select' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Quality Checks</CardTitle>
                <CardDescription>Choose which validations to run on your occurrence data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {CHECK_TYPES.map(check => {
                  const Icon = check.icon;
                  const isSelected = selectedChecks.includes(check.id);
                  return (
                    <label
                      key={check.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectCheck(check.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{check.label}</span>
                        </div>
                        <p className="text-sm text-slate-600">{check.description}</p>
                      </div>
                    </label>
                  );
                })}
              </CardContent>
            </Card>

            <Button
              onClick={() => {
                if (selectedChecks.length > 0) {
                  setStep('species');
                }
              }}
              disabled={selectedChecks.length === 0}
              className="w-full"
              size="lg"
            >
              Continue <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Select Species */}
        {step === 'species' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Species</CardTitle>
                <CardDescription>
                  Choose species to check ({selectedSpecies.length} selected)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {allSpecies.length === 0 ? (
                  <p className="text-sm text-slate-600 text-center py-8">No species in project</p>
                ) : (
                  allSpecies.map(species => (
                    <label
                      key={species.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedSpecies.includes(species.id)
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Checkbox
                        checked={selectedSpecies.includes(species.id)}
                        onCheckedChange={() => handleSelectSpecies(species.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{species.scientific_name}</div>
                        {species.common_name && (
                          <div className="text-xs text-slate-600">{species.common_name}</div>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('select')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleRunChecks}
                disabled={selectedSpecies.length === 0 || isLoading}
                className="flex-1"
                size="lg"
              >
                Run {selectedSpecies.length * selectedChecks.length} Check{selectedSpecies.length * selectedChecks.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Running Checks */}
        {step === 'running' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Quality Checks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {completedCount} of {totalChecksToRun} completed
                  </span>
                  <span className="text-sm text-slate-600">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedSpecies.map(speciesId => {
                  const species = allSpecies.find(s => s.id === speciesId);
                  return (
                    <div key={speciesId} className="p-3 bg-slate-50 rounded-lg">
                      <div className="font-medium text-sm mb-2">{species?.scientific_name}</div>
                      <div className="space-y-1">
                        {selectedChecks.map(checkType => {
                          const key = `${speciesId}-${checkType}`;
                          const isRunning = runningChecks[key];
                          const isDone = completedChecks[key];
                          const checkLabel = CHECK_TYPES.find(c => c.id === checkType)?.label;

                          return (
                            <div key={key} className="flex items-center gap-2 text-xs">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                              ) : isRunning ? (
                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                              )}
                              <span className="text-slate-600">{checkLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Results */}
        {step === 'results' && (
          <div className="space-y-6">
            {Object.entries(completedChecks).map(([key, result]) => {
              const [speciesId, checkType] = key.split('-');
              const species = allSpecies.find(s => s.id === speciesId);

              return (
                <Card key={key}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span>{species?.scientific_name}</span>
                          <Badge variant="outline">
                            {CHECK_TYPES.find(c => c.id === checkType)?.label}
                          </Badge>
                        </CardTitle>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">
                          {result.quality_score}
                        </div>
                        <div className="text-xs text-slate-600">Quality Score</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-xs text-slate-600">Records Checked</div>
                        <div className="text-lg font-bold text-blue-900">{result.summary?.duplicates_count ?? 0}</div>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <div className="text-xs text-slate-600">Issues Found</div>
                        <div className="text-lg font-bold text-red-900">{result.issues_found}</div>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="text-xs text-slate-600">Duplicates</div>
                        <div className="text-lg font-bold text-yellow-900">{result.summary?.duplicates_count ?? 0}</div>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <div className="text-xs text-slate-600">Outliers</div>
                        <div className="text-lg font-bold text-orange-900">{result.summary?.outliers_count ?? 0}</div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <div className="text-xs text-slate-600">Completeness</div>
                        <div className="text-lg font-bold text-purple-900">{result.summary?.data_completeness ?? 0}%</div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    {result.recommendations && result.recommendations.length > 0 && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-medium text-sm text-blue-900">Recommendations</div>
                            <ul className="mt-2 space-y-1 text-sm text-blue-800">
                              {result.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex gap-2">
                                  <span>•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <Button
              onClick={resetWizard}
              className="w-full"
              size="lg"
            >
              Run Another Check
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}