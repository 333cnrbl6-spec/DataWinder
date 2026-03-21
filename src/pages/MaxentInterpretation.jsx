import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import FeatureImportanceChart from '@/components/maxent/FeatureImportanceChart';
import ResponseCurveViewer from '@/components/maxent/ResponseCurveViewer';
import ThresholdSelector from '@/components/maxent/ThresholdSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MaxentInterpretation() {
  const [selectedRunId, setSelectedRunId] = useState('');
  const [importanceData, setImportanceData] = useState(null);

  // Fetch completed MAXENT runs
  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ['maxentRuns'],
    queryFn: async () => {
      const result = await base44.entities.MaxentRun.filter(
        { status: 'completed' },
        '-updated_date',
        50
      );
      return result || [];
    }
  });

  // Fetch feature importance when run is selected
  useEffect(() => {
    if (selectedRunId) {
      fetchImportance();
    }
  }, [selectedRunId]);

  const fetchImportance = async () => {
    if (!selectedRunId) return;
    try {
      const response = await base44.functions.invoke('calculateFeatureImportance', {
        maxentRunId: selectedRunId
      });
      setImportanceData(response.data);
    } catch (error) {
      console.error('Error fetching feature importance:', error);
    }
  };

  const selectedRun = runs?.find(r => r.id === selectedRunId);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">MAXENT Model Interpretation</h1>
          <p className="text-slate-600 mt-2">
            Analyze feature importance, response curves, and optimize thresholds for your species distribution models.
          </p>
        </div>

        {/* Run selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Model Run</CardTitle>
            <CardDescription>
              Choose a completed MAXENT run to analyze
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full max-w-md">
              {runsLoading ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading runs...
                </div>
              ) : (
                <Select value={selectedRunId} onValueChange={setSelectedRunId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a completed run..." />
                  </SelectTrigger>
                  <SelectContent>
                    {runs?.map(run => (
                      <SelectItem key={run.id} value={run.id}>
                        {run.name} ({run.species_name}) - {run.occurrence_count} occurrences
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedRun && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="text-xs text-slate-600">Species</div>
                  <div className="font-semibold text-slate-900">{selectedRun.species_name}</div>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="text-xs text-slate-600">Occurrences</div>
                  <div className="font-semibold text-slate-900">{selectedRun.occurrence_count}</div>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="text-xs text-slate-600">Climate Datasets</div>
                  <div className="font-semibold text-slate-900">{selectedRun.climate_dataset_names?.length || 0}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature importance section */}
        {selectedRunId && importanceData && (
          <div className="space-y-6">
            {/* Importance chart */}
            <FeatureImportanceChart
              importance={importanceData.feature_importance}
              title="Environmental Variable Importance"
            />

            {/* Response curves */}
            <ResponseCurveViewer
              features={importanceData.feature_importance}
              speciesName={importanceData.species_name}
            />

            {/* Threshold selector */}
            <ThresholdSelector
              auc={importanceData.auc}
              testAuc={importanceData.test_auc}
            />

            {/* Model diagnostics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Diagnostics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-xs text-slate-600">Training AUC</div>
                    <div className="text-xl font-bold text-green-900">
                      {importanceData.auc?.toFixed(3) || 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-xs text-slate-600">Test AUC</div>
                    <div className="text-xl font-bold text-blue-900">
                      {importanceData.test_auc?.toFixed(3) || 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-xs text-slate-600">Top Variable</div>
                    <div className="text-sm font-bold text-purple-900">
                      {importanceData.top_3_variables?.[0]?.replace(/_/g, ' ') || 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600">Total Variables</div>
                    <div className="text-xl font-bold text-slate-900">
                      {importanceData.total_variables}
                    </div>
                  </div>
                </div>

                {/* Interpretation guide */}
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 text-sm">
                    <strong>How to interpret:</strong> AUC &gt; 0.9 = excellent model discrimination. 
                    Feature importance shows which climate variables drive the species' niche. 
                    Response curves reveal preferred environmental ranges.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedRunId && !importanceData && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
}