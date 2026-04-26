import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Loader2, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function AIFieldReportGenerator({ 
  species_name, 
  location, 
  observation_date, 
  observer_name, 
  observations,
  isProfessional = false 
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = React.useRef(null);

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateAIFieldReport', {
        species_name,
        location,
        observation_date,
        observer_name,
        observations
      });
      return response.data;
    },
    onSuccess: (data) => {
      setReport(data.report);
      toast.success('Field report generated successfully');
    },
    onError: (error) => {
      toast.error('Failed to generate report: ' + error.message);
    }
  });

  const handleGenerateReport = () => {
    if (!isProfessional) {
      toast.error('AI reports require Professional plan');
      return;
    }
    generateReportMutation.mutate();
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const pdf = new jsPDF('a4', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      pdf.save(`${species_name}_field_report_${observation_date}.pdf`);
      toast.success('Report downloaded');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-4">
      {!isProfessional ? (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Upgrade for AI Reports</p>
                <p className="text-sm text-amber-800 mt-1">
                  AI-powered field report generation is available on Professional and Enterprise plans.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          onClick={handleGenerateReport}
          disabled={generateReportMutation.isPending}
          className="w-full gap-2 bg-bangor-red hover:bg-bangor-red/90"
        >
          {generateReportMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate AI Field Report
            </>
          )}
        </Button>
      )}

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Field Report</span>
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </CardTitle>
          </CardHeader>

          <CardContent ref={reportRef} className="space-y-6">
            {/* Header */}
            <div className="border-b pb-4">
              <p className="text-2xl font-bold text-slate-900">{species_name}</p>
              <p className="text-sm text-slate-600">
                {location} • {observation_date} • Observed by {observer_name}
              </p>
            </div>

            {/* Executive Summary */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Executive Summary</h3>
              <p className="text-slate-700">{report.executive_summary}</p>
            </div>

            {/* UK Conservation Status */}
            {report.uk_conservation_status && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Conservation Status</h3>
                <Badge className="bg-green-100 text-green-700">
                  {report.uk_conservation_status}
                </Badge>
              </div>
            )}

            {/* Detailed Observations */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Detailed Observations</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{report.detailed_observations}</p>
            </div>

            {/* Conservation Assessment */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Conservation Assessment
              </h3>
              <p className="text-slate-700 whitespace-pre-wrap">
                {report.conservation_assessment}
              </p>
            </div>

            {/* Recommended Actions */}
            {report.recommended_actions && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Recommended Actions
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {report.recommended_actions.map((action, idx) => (
                    <li key={idx} className="text-slate-700">
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div className="border-t pt-4 text-xs text-slate-500">
              <p>Generated: {report.report_generated_at || new Date().toISOString()}</p>
              <p>This report was generated using AI analysis and should be reviewed by a qualified conservation professional.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}