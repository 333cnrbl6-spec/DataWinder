import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, Download, FileText, Search, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SpeciesReportGenerator() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState([]);
  const [reportName, setReportName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: allSpecies = [] } = useQuery({
    queryKey: ['allSpeciesForReport'],
    queryFn: () => base44.entities.Species.list('-updated_date', 1000),
  });

  const filteredSpecies = allSpecies.filter(s =>
    s.scientific_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.common_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectSpecies = (speciesId) => {
    setSelectedSpecies(prev =>
      prev.includes(speciesId)
        ? prev.filter(id => id !== speciesId)
        : [...prev, speciesId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSpecies.length === filteredSpecies.length) {
      setSelectedSpecies([]);
    } else {
      setSelectedSpecies(filteredSpecies.map(s => s.id));
    }
  };

  const handleGenerateReport = async () => {
    if (selectedSpecies.length === 0) {
      toast.error('Select at least one species');
      return;
    }
    if (!reportName.trim()) {
      toast.error('Enter a report name');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateMultiSpeciesReport', {
        species_ids: selectedSpecies,
        report_name: reportName,
      });

      // Response is raw HTML — create a Blob and trigger download
      const htmlContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName.replace(/[^a-zA-Z0-9-_]/g, '_')}.html`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully');
      setSelectedSpecies([]);
      setReportName('');
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedCount = selectedSpecies.length;
  const totalObservations = allSpecies
    .filter(s => selectedSpecies.includes(s.id))
    .reduce((sum, s) => sum + (s.observation_count || 0) + (s.gbif_occurrence_count || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-bangor-red/10 rounded-xl">
              <FileText className="w-6 h-6 text-bangor-red" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Multi-Species Report Generator</h1>
          </div>
          <p className="text-slate-600 ml-12">Create comprehensive HTML reports for conservation grant applications — downloads instantly as a formatted file</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selection Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search & Select All */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Species</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search by scientific or common name…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="h-10"
                />

                {filteredSpecies.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedCount === filteredSpecies.length && filteredSpecies.length > 0}
                      indeterminate={selectedCount > 0 && selectedCount < filteredSpecies.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      Select All ({filteredSpecies.length})
                    </label>
                  </div>
                )}

                <div className="max-h-96 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3 bg-white">
                  {filteredSpecies.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No species found</p>
                    </div>
                  ) : (
                    filteredSpecies.map(species => (
                      <div
                        key={species.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => handleSelectSpecies(species.id)}
                      >
                        <Checkbox
                          checked={selectedSpecies.includes(species.id)}
                          onCheckedChange={() => handleSelectSpecies(species.id)}
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 italic text-sm">{species.scientific_name}</p>
                          {species.common_name && (
                            <p className="text-xs text-slate-500">{species.common_name}</p>
                          )}
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            {species.iucn_status && (
                              <Badge className="text-xs bg-slate-100 text-slate-700">
                                {species.iucn_status}
                              </Badge>
                            )}
                            {species.population_trend && (
                              <Badge variant="outline" className="text-xs">
                                {species.population_trend}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Configuration */}
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="bg-gradient-to-br from-bangor-red/5 to-amber-50 border-bangor-red/20">
              <CardHeader>
                <CardTitle className="text-sm">Report Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Selected Species</p>
                  <p className="text-3xl font-bold text-bangor-red">{selectedCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Total Observations</p>
                  <p className="text-2xl font-bold text-slate-800">{totalObservations.toLocaleString()}</p>
                </div>
                <div className="pt-2 border-t border-bangor-red/20 space-y-2">
                  {selectedSpecies.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedSpecies([]);
                        setReportName('');
                      }}
                      className="w-full text-xs gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Selection
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Report Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Report Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    Report Name
                  </label>
                  <Input
                    placeholder="e.g. Callithrix Conservation Assessment"
                    value={reportName}
                    onChange={e => setReportName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                    <span>Key metrics & threat assessment</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                    <span>Aggregated observation data</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                    <span>Conservation status summary</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                    <span>Grant-ready formatting</span>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateReport}
                  disabled={selectedCount === 0 || !reportName.trim() || isGenerating}
                  className="w-full gap-2 bg-bangor-red hover:bg-bangor-red/90 text-white"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}