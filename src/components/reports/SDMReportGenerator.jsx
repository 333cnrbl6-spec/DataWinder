import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, Check, AlertCircle } from 'lucide-react';

export default function SDMReportGenerator({ sdmRunId, species = [] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [options, setOptions] = useState({
    include_maps: true,
    include_charts: true,
    include_bibliography: true,
    custom_title: ''
  });

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setSuccess(false);

      const response = await base44.functions.invoke('generateSDMReportPDF', {
        sdm_run_id: sdmRunId,
        include_maps: options.include_maps,
        include_charts: options.include_charts,
        include_bibliography: options.include_bibliography,
        custom_title: options.custom_title
      });

      // The response data is the PDF blob
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SDMReport_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to generate report');
      console.error('Report generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const speciesNames = species.length > 0
    ? species.map(s => s.scientific_name || s.common_name).join(', ')
    : 'Multiple species';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Generate PDF Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Report Title (Optional)</label>
          <input
            type="text"
            placeholder="e.g., Species Distribution Analysis for Conservation Planning"
            value={options.custom_title}
            onChange={(e) => setOptions({ ...options, custom_title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-bangor-red focus:border-transparent"
          />
        </div>

        {/* Options Checkboxes */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.include_maps}
              onChange={(e) => setOptions({ ...options, include_maps: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm">Include Suitability Maps</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.include_charts}
              onChange={(e) => setOptions({ ...options, include_charts: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm">Include Variable Importance Charts</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.include_bibliography}
              onChange={(e) => setOptions({ ...options, include_bibliography: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm">Include Bibliography & Citations</span>
          </label>
        </div>

        {/* Info Message */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
          <p><strong>Report includes:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Dynamic title page with metadata</li>
            <li>Model performance metrics (AUC, TSS, etc.)</li>
            <li>Occurrence data summary</li>
            <li>Professional PDF format, ready to share</li>
          </ul>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success State */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2 text-sm text-green-700">
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Report generated and downloaded successfully!</span>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="w-full bg-bangor-red hover:bg-bangor-red/90 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Generate & Download PDF Report
            </>
          )}
        </Button>

        {/* Species Info */}
        <div className="text-xs text-slate-500 pt-2 border-t">
          <p><strong>Species:</strong> {speciesNames}</p>
        </div>
      </CardContent>
    </Card>
  );
}