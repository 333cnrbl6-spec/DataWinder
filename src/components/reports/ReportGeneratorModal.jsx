import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SECTION_OPTIONS = {
  species: [
    { id: 'overview', label: 'Overview & Status' },
    { id: 'taxonomy', label: 'Taxonomic Info' },
    { id: 'distribution', label: 'Geographic Distribution' },
    { id: 'observations', label: 'Observation Maps' },
    { id: 'conservation', label: 'Conservation Status' },
    { id: 'threats', label: 'Threats & Trends' },
    { id: 'notes', label: 'Research Notes' },
  ],
  project: [
    { id: 'overview', label: 'Project Overview' },
    { id: 'species', label: 'Species List' },
    { id: 'maps', label: 'Distribution Maps' },
    { id: 'climate', label: 'Climate Data' },
    { id: 'models', label: 'MAXENT Results' },
    { id: 'notes', label: 'Project Notes' },
  ],
};

export default function ReportGeneratorModal({ isOpen, onClose, type = 'species', itemId, itemName }) {
  const [format, setFormat] = useState('summary');
  const [sections, setSections] = useState(
    SECTION_OPTIONS[type].map(s => s.id)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleSection = (sectionId) => {
    setSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);

      const functionName = type === 'species' ? 'generateSpeciesReport' : 'generateProjectReport';
      const response = await base44.functions.invoke(functionName, {
        itemId,
        itemName,
        format,
        sections,
      });

      // Trigger download
      const link = document.createElement('a');
      link.href = response.data.fileUrl;
      link.download = `${itemName.replace(/\s+/g, '_')}_report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate {type === 'species' ? 'Species' : 'Project'} Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Report Format</Label>
            <RadioGroup value={format} onValueChange={setFormat}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="summary" id="summary" />
                <Label htmlFor="summary" className="font-normal cursor-pointer">
                  Simple Summary (overview + key stats)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="academic" id="academic" />
                <Label htmlFor="academic" className="font-normal cursor-pointer">
                  Academic Report (formal sections & analysis)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Section Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Include Sections</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {SECTION_OPTIONS[type].map(section => (
                <div key={section.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={section.id}
                    checked={sections.includes(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <Label htmlFor={section.id} className="font-normal cursor-pointer">
                    {section.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || sections.length === 0}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}