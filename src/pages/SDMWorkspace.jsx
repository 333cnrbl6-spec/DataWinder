import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProFeatureGate from '@/components/ProFeatureGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ParameterConfigurator from '@/components/sdm/ParameterConfigurator';
import EnvironmentalVariableSelector from '@/components/sdm/EnvironmentalVariableSelector';
import OutputVisualization from '@/components/sdm/OutputVisualization';
import { Zap, Play, Settings, BarChart3, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';

function SDMWorkspaceContent() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [parameters, setParameters] = useState({});
  const [selectedVariables, setSelectedVariables] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState([]);

  // Fetch project
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () =>
      base44.entities.Project.filter({ id: projectId }).then(p => p[0]),
    enabled: !!projectId
  });

  // Fetch project species
  const { data: projectSpecies = [] } = useQuery({
    queryKey: ['project-species', projectId],
    queryFn: async () => {
      if (!project?.species_ids) return [];
      const species = await Promise.all(
        project.species_ids.map(id => base44.entities.Species.filter({ id }).then(s => s[0]))
      );
      return species.filter(Boolean);
    },
    enabled: !!project?.species_ids
  });

  // Fetch SDM runs for this project
  const { data: sdmRuns = [] } = useQuery({
    queryKey: ['project-sdm-runs', projectId],
    queryFn: () =>
      base44.entities.SDMRun.filter(
        { project_id: projectId || undefined },
        '-created_date',
        10
      ),
    enabled: !!projectId
  });

  // Run SDM mutation
  const runSDMMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke('runSDMPipeline', {
        project_id: projectId,
        species_ids: selectedSpecies,
        parameters,
        bioclim_vars: selectedVariables,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sdm-runs', projectId] });
      toast.success('SDM run submitted successfully');
    },
    onError: (error) => {
      toast.error('Failed to run SDM pipeline');
      console.error(error);
    }
  });

  const canRun = selectedSpecies.length > 0 && selectedVariables.length > 0;
  const latestRun = sdmRuns[0];

  const statusColor = {
    queued: 'bg-slate-100 text-slate-800',
    cleaning: 'bg-blue-100 text-blue-800',
    thinning: 'bg-blue-100 text-blue-800',
    fetching_climate: 'bg-blue-100 text-blue-800',
    modeling: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">SDM Pipeline Workspace</h1>
          <p className="text-slate-600 mt-2">{project?.title}</p>
        </div>

        {/* Status Alert */}
        {latestRun?.status === 'failed' && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold">Last run failed</p>
              <p className="text-xs mt-1">{latestRun.error_message}</p>
            </div>
          </div>
        )}

        <Tabs defaultValue="configuration" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Select Species
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {projectSpecies.length === 0 ? (
                  <p className="text-sm text-slate-600">No species available in this project</p>
                ) : (
                  <div className="space-y-2">
                    {projectSpecies.map(species => (
                      <label key={species.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-slate-200">
                        <input
                          type="checkbox"
                          checked={selectedSpecies.includes(species.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSpecies([...selectedSpecies, species.id]);
                            } else {
                              setSelectedSpecies(selectedSpecies.filter(id => id !== species.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{species.scientific_name}</p>
                          <p className="text-xs text-slate-600">{species.common_name}</p>
                        </div>
                        {species.iucn_status && (
                          <Badge variant="outline" className="text-xs">
                            {species.iucn_status}
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <ParameterConfigurator onParametersChange={setParameters} />
          </TabsContent>

          {/* Variables Tab */}
          <TabsContent value="variables">
            <EnvironmentalVariableSelector
              onVariablesChange={setSelectedVariables}
              initialVariables={selectedVariables}
            />
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {latestRun ? (
              <>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-semibold text-slate-900">{latestRun.name}</p>
                        <p className="text-sm text-slate-600">{latestRun.species_names?.join(', ')}</p>
                      </div>
                      <Badge className={statusColor[latestRun.status] || ''}>
                        {latestRun.status?.charAt(0).toUpperCase() + latestRun.status?.slice(1)}
                      </Badge>
                    </div>
                    {latestRun.progress_pct !== undefined && (
                      <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-bangor-red h-full transition-all"
                          style={{ width: `${latestRun.progress_pct}%` }}
                        />
                      </div>
                    )}
                    {latestRun.progress_message && (
                      <p className="text-xs text-slate-600 mt-2">{latestRun.progress_message}</p>
                    )}
                  </CardContent>
                </Card>

                {latestRun.status === 'completed' && (
                  <OutputVisualization sdmRun={latestRun} />
                )}
              </>
            ) : (
              <Card className="bg-slate-50">
                <CardContent className="p-8 text-center">
                  <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No results yet. Run the SDM pipeline to see outputs.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Runs</CardTitle>
              </CardHeader>
              <CardContent>
                {sdmRuns.length === 0 ? (
                  <p className="text-sm text-slate-600">No runs yet</p>
                ) : (
                  <div className="space-y-3">
                    {sdmRuns.map(run => (
                      <div key={run.id} className="p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{run.name}</p>
                            <p className="text-xs text-slate-600">{run.species_names?.join(', ')}</p>
                          </div>
                          <Badge className={statusColor[run.status] || ''}>
                            {run.status}
                          </Badge>
                        </div>
                        {run.metrics && (
                          <div className="text-xs text-slate-600">
                            AUC: {run.metrics.auc?.toFixed(3)} | TSS: {run.metrics.tss?.toFixed(3)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Run Button */}
        <div className="sticky bottom-6 flex justify-end gap-3">
          <Button
            onClick={() => runSDMMutation.mutate()}
            disabled={!canRun || runSDMMutation.isPending}
            className="bg-bangor-red hover:bg-bangor-red/90 gap-2"
            size="lg"
          >
            {runSDMMutation.isPending ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run SDM Pipeline
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}

export default function SDMWorkspace() {
  return (
    <ProFeatureGate featureName="Advanced SDM Workspace">
      <SDMWorkspaceContent />
    </ProFeatureGate>
  );
}