import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download, FileText, Loader2, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function SDMReportGenerator({ sdmRunId, onClose }) {
  const [generating, setGenerating] = useState(false);

  // Fetch SDM run data
  const { data: sdmRun, isLoading } = useQuery({
    queryKey: ['sdm-run', sdmRunId],
    queryFn: () =>
      base44.entities.SDMRun.filter({ id: sdmRunId }).then(r => r[0]),
    enabled: !!sdmRunId
  });

  const generateReport = async () => {
    try {
      setGenerating(true);
      const response = await base44.functions.invoke('generateSDMReport', {
        sdm_run_id: sdmRunId
      });

      if (response.data && response.data instanceof ArrayBuffer) {
        // Download PDF
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sdm_report_${sdmRun.name}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success('Report generated and downloaded');
      } else {
        // Function returns a direct download
        window.location.href = response;
        toast.success('Report generated successfully');
      }
    } catch (error) {
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (!sdmRun) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <AlertCircle className="w-6 h-6 text-red-400 mr-2" />
          <span className="text-slate-600">SDM run not found</span>
        </CardContent>
      </Card>
    );
  }

  const canGenerate = sdmRun.status === 'completed' && sdmRun.metrics;
  const speciesCount = sdmRun.species_names?.length || 1;
  const variableCount = sdmRun.parameters?.bioclim_vars?.length || 0;

  return (
    <div className="space-y-6">
      {/* Report Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Professional Research Report
          </CardTitle>
          <CardDescription>
            Generate a publication-ready PDF summary of your SDM analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Report Contents */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-slate-900">Executive Summary</p>
                <p className="text-slate-600 text-xs mt-1">Overview of methodology and key findings</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-slate-900">Methodology</p>
                <p className="text-slate-600 text-xs mt-1">Complete description of modeling approach and parameters</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-slate-900">Performance Metrics</p>
                <p className="text-slate-600 text-xs mt-1">Comprehensive table with AUC, TSS, sensitivity, and more</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-slate-900">Variable Importance</p>
                <p className="text-slate-600 text-xs mt-1">Visual analysis of bioclimatic variable contributions</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-slate-900">Spatial Predictions</p>
                <p className="text-slate-600 text-xs mt-1">Suitability statistics and prediction summary</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-slate-900">Recommendations</p>
                <p className="text-slate-600 text-xs mt-1">Scientific recommendations for field validation and conservation</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{speciesCount}</p>
              <p className="text-xs text-slate-600">Species</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{variableCount}</p>
              <p className="text-xs text-slate-600">Variables</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">
                {sdmRun.metrics?.auc ? sdmRun.metrics.auc.toFixed(3) : 'N/A'}
              </p>
              <p className="text-xs text-slate-600">AUC Score</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Model Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-sm font-medium text-slate-700">Model Name</span>
            <span className="text-sm font-semibold text-slate-900">{sdmRun.name}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <Badge className={sdmRun.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
              {sdmRun.status}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-sm font-medium text-slate-700">Training Records</span>
            <span className="text-sm font-semibold text-slate-900">{sdmRun.metrics?.n_train || 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-sm font-medium text-slate-700">Test Records</span>
            <span className="text-sm font-semibold text-slate-900">{sdmRun.metrics?.n_test || 'N/A'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex gap-3">
        <Button
          onClick={generateReport}
          disabled={!canGenerate || generating}
          className={`flex-1 gap-2 ${canGenerate ? 'bg-bangor-red hover:bg-bangor-red/90 text-white' : 'bg-slate-200'}`}
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Generate & Download Report
            </>
          )}
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {!canGenerate && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-yellow-900">Model not ready</p>
            <p className="text-yellow-800 text-xs mt-1">
              {sdmRun.status !== 'completed'
                ? 'Wait for the model to complete before generating a report.'
                : 'Model metrics are not available yet.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}