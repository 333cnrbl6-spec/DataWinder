import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Loader2, Rocket, Search, X, Layers, ListChecks } from 'lucide-react';
import LayerSelector from '@/components/maxent/LayerSelector';
import ParametersPanel from '@/components/maxent/ParametersPanel';

const DEFAULT_PARAMS = {
  regularization_multiplier: 1.0,
  max_iterations: 500,
  convergence_threshold: 0.00001,
  replicates: 1,
  output_type: 'logistic',
  feature_types: ['linear', 'quadratic', 'hinge'],
};

export default function MaxentBatchSubmit() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState([]);
  const [selectedLayers, setSelectedLayers] = useState([]);
  const [parameters, setParameters] = useState(DEFAULT_PARAMS);
  const [batchName, setBatchName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  const { data: allSpecies = [] } = useQuery({
    queryKey: ['species-batch'],
    queryFn: () => base44.entities.Species.list('-scientific_name', 500),
  });

  const filtered = allSpecies.filter(sp =>
    sp.scientific_name?.toLowerCase().includes(search.toLowerCase()) ||
    sp.common_name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (sp) => {
    setSelectedSpecies(prev =>
      prev.find(s => s.id === sp.id) ? prev.filter(s => s.id !== sp.id) : [...prev, sp]
    );
  };

  const selectAll = () => setSelectedSpecies(filtered);
  const clearAll = () => setSelectedSpecies([]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setResults(null);
    const res = await base44.functions.invoke('submitMaxentBatch', {
      species_list: selectedSpecies.map(sp => ({
        id: sp.id,
        scientific_name: sp.scientific_name,
        observation_count: sp.observations?.length || sp.observation_count || 0,
        gbif_occurrence_count: sp.gbif_occurrences?.length || sp.gbif_occurrence_count || 0,
      })),
      layer_ids: selectedLayers.map(l => l.id),
      layer_names: selectedLayers.map(l => l.name),
      parameters,
      batch_name: batchName.trim() || null,
    });
    setResults(res.data);
    setIsSubmitting(false);
    queryClient.invalidateQueries({ queryKey: ['maxentRuns'] });
  };

  if (results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg border-slate-200 text-center">
            <CardContent className="py-14 px-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Batch Submitted!</h2>
              <p className="text-slate-500 mb-8">{results.total} model runs queued.</p>
              <div className="text-left max-w-md mx-auto space-y-2 mb-8">
                {results.results?.map(r => (
                  <div key={r.run_id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-4 py-2">
                    <span className="italic text-slate-700 truncate">{r.species}</span>
                    <Badge className={r.status === 'running' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}>
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-3">
                <Button onClick={() => { setResults(null); setSelectedSpecies([]); setBatchName(''); }} className="bg-bangor-red text-white">
                  <Rocket className="w-4 h-4 mr-2" /> New Batch
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-bangor-red tracking-tight">Batch MAXENT Submission</h1>
          <p className="mt-2 text-slate-600 max-w-2xl">
            Select multiple species, configure shared environmental layers and parameters, then submit all runs at once.
          </p>
        </div>

        {/* Batch Name */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-800">Batch Name <span className="font-normal text-slate-400">(optional)</span></CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g. Baseline 2026 — Welsh Upland Species"
              value={batchName}
              onChange={e => setBatchName(e.target.value)}
              className="max-w-lg border-slate-200"
            />
          </CardContent>
        </Card>

        {/* Species Selection */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-bangor-red" />
                Select Species
                {selectedSpecies.length > 0 && (
                  <Badge className="bg-bangor-red text-white ml-2">{selectedSpecies.length} selected</Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll} disabled={filtered.length === 0}>Select All ({filtered.length})</Button>
                <Button size="sm" variant="outline" onClick={clearAll} disabled={selectedSpecies.length === 0}>Clear</Button>
              </div>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9 border-slate-200"
                placeholder="Search species…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {filtered.length === 0 && (
                <p className="text-sm text-slate-400 p-6 text-center">No species found.</p>
              )}
              {filtered.map(sp => {
                const isSelected = !!selectedSpecies.find(s => s.id === sp.id);
                const occCount = (sp.observations?.length || sp.observation_count || 0) + (sp.gbif_occurrences?.length || sp.gbif_occurrence_count || 0);
                return (
                  <label key={sp.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-bangor-red/5' : ''}`}>
                    <Checkbox checked={isSelected} onCheckedChange={() => toggle(sp)} />
                    <div className="flex-1 min-w-0">
                      <span className="italic text-sm font-medium text-slate-900 truncate block">{sp.scientific_name}</span>
                      {sp.common_name && <span className="text-xs text-slate-500">{sp.common_name}</span>}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{occCount} occ.</span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Layers */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-bangor-red" />
              Environmental Layers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LayerSelector selectedLayers={selectedLayers} onSelectionChange={setSelectedLayers} />
          </CardContent>
        </Card>

        {/* Parameters */}
        <ParametersPanel parameters={parameters} onChange={setParameters} />

        {/* Submit */}
        <div className="flex justify-end pb-8">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedSpecies.length === 0 || selectedLayers.length === 0}
            className="bg-bangor-red border-bangor-red text-white px-10 font-bold text-base"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting {selectedSpecies.length} runs…</>
            ) : (
              <><Rocket className="w-4 h-4 mr-2" /> Submit {selectedSpecies.length || ''} Run{selectedSpecies.length !== 1 ? 's' : ''}</>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}