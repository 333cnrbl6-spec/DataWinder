import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Settings, 
  User, 
  Calendar, 
  Building2,
  ClipboardCheck,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Award,
  Quote
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner";

export default function NaturalEnglandExportModule({ selectedSpecies = [], onClose }) {
  const [format, setFormat] = useState('pdf');
  const [projectName, setProjectName] = useState('Species Survey Report');
  const [surveyMetadata, setSurveyMetadata] = useState({
    survey_date: new Date().toISOString().split('T')[0],
    surveyor: '',
    organization: '',
    methodology: 'Standard Species Distribution Survey',
    notes: ''
  });
  const [options, setOptions] = useState({
    include_metadata: true,
    include_citations: true,
    include_confidence_scores: true
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (selectedSpecies.length === 0) {
      toast.error('No species selected for export');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const speciesIds = selectedSpecies.map(sp => sp.id);
      
      const response = await base44.functions.invoke('generateNaturalEnglandReport', {
        species_ids: speciesIds,
        format,
        project_name: projectName,
        survey_metadata: {
          ...surveyMetadata,
          surveyor: surveyMetadata.surveyor || 'DataWinder User'
        },
        ...options
      });

      // Download file
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      a.download = `${projectName.replace(/\s+/g, '_')}_NE_Survey_Report.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Report generated: ${selectedSpecies.length} species`);
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Failed to generate report');
      toast.error('Report generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const updateMetadata = (field, value) => {
    setSurveyMetadata(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <ClipboardCheck className="w-5 h-5" />
                Natural England Survey Export
              </CardTitle>
              <CardDescription className="mt-1">
                Generate compliant survey documentation with metadata, confidence scores, and citations
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              {selectedSpecies.length} species selected
            </Badge>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-800">
              NE Survey Standard
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* Format Selection */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Export Format</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={format === 'pdf' ? 'default' : 'outline'}
                onClick={() => setFormat('pdf')}
                className={`h-20 flex flex-col gap-2 ${format === 'pdf' ? 'bg-blue-600' : ''}`}
              >
                <FileText className="w-6 h-6" />
                <span>PDF Report</span>
                <span className="text-xs opacity-70">Formatted documentation</span>
              </Button>
              <Button
                variant={format === 'excel' ? 'default' : 'outline'}
                onClick={() => setFormat('excel')}
                className={`h-20 flex flex-col gap-2 ${format === 'excel' ? 'bg-green-600' : ''}`}
              >
                <FileSpreadsheet className="w-6 h-6" />
                <span>Excel/CSV</span>
                <span className="text-xs opacity-70">Spreadsheet data</span>
              </Button>
            </div>
          </div>

          {/* Project Information */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Project Information</Label>
            
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Project Name</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Primate Conservation Survey 2026"
                className="font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Survey Date
                </Label>
                <Input
                  type="date"
                  value={surveyMetadata.survey_date}
                  onChange={(e) => updateMetadata('survey_date', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block flex items-center gap-1">
                  <User className="w-3 h-3" /> Surveyor Name
                </Label>
                <Input
                  value={surveyMetadata.surveyor}
                  onChange={(e) => updateMetadata('surveyor', e.target.value)}
                  placeholder="Your name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Organization
                </Label>
                <Input
                  value={surveyMetadata.organization}
                  onChange={(e) => updateMetadata('organization', e.target.value)}
                  placeholder="e.g., Bangor University"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block flex items-center gap-1">
                  <ClipboardCheck className="w-3 h-3" /> Methodology
                </Label>
                <Input
                  value={surveyMetadata.methodology}
                  onChange={(e) => updateMetadata('methodology', e.target.value)}
                  placeholder="Survey methodology"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Additional Notes</Label>
              <textarea
                value={surveyMetadata.notes}
                onChange={(e) => updateMetadata('notes', e.target.value)}
                placeholder="Additional survey notes or context..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none h-20"
              />
            </div>
          </div>

          {/* Report Options */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Report Options</Label>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <Checkbox
                  checked={options.include_metadata}
                  onCheckedChange={(v) => setOptions(prev => ({ ...prev, include_metadata: v }))}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium">Include Survey Metadata</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Project information, surveyor details, date, and methodology
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <Checkbox
                  checked={options.include_confidence_scores}
                  onCheckedChange={(v) => setOptions(prev => ({ ...prev, include_confidence_scores: v }))}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium">Include Confidence Scores</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Data quality ratings and confidence percentages for each species
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <Checkbox
                  checked={options.include_citations}
                  onCheckedChange={(v) => setOptions(prev => ({ ...prev, include_citations: v }))}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Quote className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium">Include Citation Blocks</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Proper attribution for IUCN, iNaturalist, GBIF, and speciesLink data
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generating || selectedSpecies.length === 0}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Generate {format.toUpperCase()} Report ({selectedSpecies.length} species)
              </>
            )}
          </Button>

          {/* Compliance Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-900 mb-2">Natural England Survey Standards Compliance:</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Survey metadata and methodology documentation</li>
              <li>Data quality indicators and confidence scoring</li>
              <li>Proper citations for all data sources</li>
              <li>Validation flags and quality notes</li>
              <li>IUCN conservation status with color coding</li>
              <li>Threat assessment integration</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}