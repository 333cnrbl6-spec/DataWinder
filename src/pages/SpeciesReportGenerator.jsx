import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProcessingFeedback from '@/components/ui/ProcessingFeedback';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, Loader2, CheckCircle2, XCircle, Filter, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Report generator dashboard for exporting species data
 */
export default function SpeciesReportGenerator() {
  const queryClient = useQueryClient();
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState([]);
  const [reportTitle, setReportTitle] = useState('Species Assessment Report');
  const [searchTerm, setSearchTerm] = useState('');
  const [generating, setGenerating] = useState(false);
  const [format, setFormat] = useState('single');
  const [includeMap, setIncludeMap] = useState(true);
  const [includeVariables, setIncludeVariables] = useState(true);
  const [includeConservation, setIncludeConservation] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: allSpecies = [] } = useQuery({
    queryKey: ['allSpecies'],
    queryFn: () => base44.entities.Species.list('-updated_date', 200),
  });

  const { data: sdmRuns = [] } = useQuery({
    queryKey: ['sdmRuns'],
    queryFn: () => base44.entities.SDMRun.list('-created_date', 100),
  });

  const { data: threatAssessments = [] } = useQuery({
    queryKey: ['threatAssessments'],
    queryFn: () => base44.entities.ThreatAssessment.list('-created_date', 100),
  });

  const filteredSpecies = allSpecies.filter(s =>
    s.scientific_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.common_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSpecies = (id) => {
    setSelectedSpeciesIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAllSpecies = () => {
    if (selectedSpeciesIds.length === filteredSpecies.length) {
      setSelectedSpeciesIds([]);
    } else {
      setSelectedSpeciesIds(filteredSpecies.map(s => s.id));
    }
  };

  const handleGenerateReport = async () => {
    if (selectedSpeciesIds.length === 0) {
      toast.error('Select at least one species');
      return;
    }

    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateSpeciesReport', {
        speciesIds: selectedSpeciesIds,
        reportTitle: reportTitle.trim() || 'Species Assessment Report',
        includeMap,
        includeVariables,
        includeConservation,
        format: selectedSpeciesIds.length > 1 ? 'multispecies' : 'single'
      });

      if (response.data) {
        // Handle blob response
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast.success('Report generated and downloaded');
        setSelectedSpeciesIds([]);
        setReportTitle('Species Assessment Report');
      }
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error(`Report generation failed: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const getSpeciesInfo = (speciesId) => {
    const hasSdm = sdmRuns.some(r => r.species_ids?.includes(speciesId) && r.status === 'completed');
    const hasThreat = threatAssessments.some(t => t.species_id === speciesId);
    return { hasSdm, hasThreat };
  };

  const selectedCount = selectedSpeciesIds.length;
  const completedSdmCount = sdmRuns.filter(r => r.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/10 to-blue-50/10">
      {/* Header */}
      <header className="bg-white border-b-2 border-bangor-red shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bangor-red/10 rounded-xl">
              <FileText className="w-6 h-6 text-bangor-red" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-bangor-red">Report Generator</h1>
              <p className="text-sm text-slate-500">Create professional PDF reports with SDM maps & conservation data</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-700">{selectedCount} selected</p>
            <p className="text-xs text-slate-500">{completedSdmCount} SDM models available</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Configuration */}
          <div className="lg:col-span-1 space-y-4">
            {/* Report settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Report Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Report Title</label>
                  <Input
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="e.g. Callithrix Conservation Assessment 2026"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block">Include Sections</label>
                  
                  <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                    <Checkbox
                      checked={includeMap}
                      onCheckedChange={setIncludeMap}
                    />
                    <span className="text-xs text-slate-700">SDM Maps</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                    <Checkbox
                      checked={includeVariables}
                      onCheckedChange={setIncludeVariables}
                    />
                    <span className="text-xs text-slate-700">Variable Importance</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                    <Checkbox
                      checked={includeConservation}
                      onCheckedChange={setIncludeConservation}
                    />
                    <span className="text-xs text-slate-700">Conservation Status</span>
                  </label>
                </div>

                {generating ? (
                  <ProcessingFeedback
                    label="Generating PDF report…"
                    detail={`Composing professional report with data from ${selectedCount} species.`}
                    tips={[
                      'Report generation includes SDM maps, variable importance, and conservation assessments.',
                      'Larger reports may take 1-2 minutes. Grab a cup of tea!',
                      'Once complete, your PDF will download automatically.',
                    ]}
                  />
                ) : (
                  <Button
                    onClick={handleGenerateReport}
                    disabled={selectedCount === 0}
                    className="w-full bg-bangor-red hover:bg-bangor-red/90 text-white h-10 gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Generate PDF
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Species:</span>
                  <span className="font-semibold text-slate-800">{allSpecies.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Selected:</span>
                  <span className="font-semibold text-bangor-red">{selectedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">With SDM:</span>
                  <span className="font-semibold text-green-600">
                    {selectedSpeciesIds.filter(id => getSpeciesInfo(id).hasSdm).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">With Threat Data:</span>
                  <span className="font-semibold text-blue-600">
                    {selectedSpeciesIds.filter(id => getSpeciesInfo(id).hasThreat).length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Species selection */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Select Species</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={toggleAllSpecies}
                      className="h-8 text-xs"
                    >
                      {selectedCount === filteredSpecies.length && filteredSpecies.length > 0 ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Input
                    placeholder="Search species by name…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-white">
                  {filteredSpecies.length === 0 ? (
                    <div className="col-span-2 text-center py-8">
                      <p className="text-sm text-slate-400">No species found</p>
                    </div>
                  ) : (
                    filteredSpecies.map(species => {
                      const info = getSpeciesInfo(species.id);
                      const isSelected = selectedSpeciesIds.includes(species.id);

                      return (
                        <label
                          key={species.id}
                          className={`flex items-start gap-2 p-3 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-bangor-red/5 border-bangor-red/30'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSpecies(species.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold italic text-slate-800 truncate">
                              {species.scientific_name}
                            </p>
                            {species.common_name && (
                              <p className="text-xs text-slate-600 truncate">{species.common_name}</p>
                            )}
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {species.iucn_status && (
                                <Badge variant="outline" className="text-xs h-5">
                                  {species.iucn_status}
                                </Badge>
                              )}
                              {info.hasSdm && (
                                <Badge className="bg-green-100 text-green-700 text-xs h-5 border-0">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  SDM
                                </Badge>
                              )}
                              {info.hasThreat && (
                                <Badge className="bg-blue-100 text-blue-700 text-xs h-5 border-0">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Threat
                                </Badge>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview info */}
            {selectedCount > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <p className="text-blue-900 font-semibold">
                      📄 Report will include:
                    </p>
                    <ul className="text-blue-800 text-xs space-y-1 ml-4">
                      {includeMap && <li>✓ Species distribution maps (SDM)</li>}
                      {includeVariables && <li>✓ Environmental variable importance charts</li>}
                      {includeConservation && <li>✓ Conservation status & threat assessments</li>}
                      <li>✓ Occurrence statistics</li>
                      <li>✓ IUCN conservation status</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}