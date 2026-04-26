import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Database, Layers, Map, Plus, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectAssets({ project }) {
  const [activeTab, setActiveTab] = useState('species');

  // Fetch project species
  const { data: projectSpecies = [] } = useQuery({
    queryKey: ['project-species', project?.id],
    queryFn: async () => {
      if (!project?.species_ids?.length) return [];
      return base44.entities.Species.filter({
        id: { $in: project.species_ids }
      });
    },
    enabled: !!project?.id && project.species_ids?.length > 0
  });

  // Fetch project SDM runs
  const { data: projectSDMs = [] } = useQuery({
    queryKey: ['project-sdms', project?.id],
    queryFn: async () => {
      if (!project?.sdm_run_ids?.length) return [];
      return base44.entities.SDMRun.filter({
        id: { $in: project.sdm_run_ids }
      });
    },
    enabled: !!project?.id && project.sdm_run_ids?.length > 0
  });

  // Fetch GeoJSON boundaries
  const { data: boundaries = [] } = useQuery({
    queryKey: ['geojson-boundaries', project?.id],
    queryFn: () =>
      base44.entities.GeoJSONBoundary.filter({ project_id: project?.id }, '-created_date', 50),
    enabled: !!project?.id
  });

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="species" className="flex items-center gap-1">
          <Database className="w-4 h-4" />
          <span className="hidden sm:inline">Species</span>
          <Badge variant="secondary" className="ml-1 h-5">{projectSpecies.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="sdm" className="flex items-center gap-1">
          <Layers className="w-4 h-4" />
          <span className="hidden sm:inline">SDM</span>
          <Badge variant="secondary" className="ml-1 h-5">{projectSDMs.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="boundaries" className="flex items-center gap-1">
          <Map className="w-4 h-4" />
          <span className="hidden sm:inline">Boundaries</span>
          <Badge variant="secondary" className="ml-1 h-5">{boundaries.length}</Badge>
        </TabsTrigger>
      </TabsList>

      {/* Species Tab */}
      <TabsContent value="species" className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Project Species</CardTitle>
                <CardDescription>Species records grouped in this project</CardDescription>
              </div>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Add Species
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projectSpecies.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No species in this project yet</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {projectSpecies.map(species => (
                  <div key={species.id} className="p-3 bg-slate-50 rounded-lg flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900">{species.scientific_name}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {species.common_name && `${species.common_name} • `}
                        IUCN: {species.iucn_status || 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* SDM Tab */}
      <TabsContent value="sdm" className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">SDM Models</CardTitle>
                <CardDescription>Species distribution models in this project</CardDescription>
              </div>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Run Model
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projectSDMs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No SDM runs in this project yet</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {projectSDMs.map(sdm => (
                  <div key={sdm.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm text-slate-900">{sdm.name}</p>
                      <Badge className={sdm.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {sdm.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">
                      {sdm.species_names?.join(', ')}
                    </p>
                    {sdm.metrics?.auc && (
                      <p className="text-xs text-slate-600 mt-1">
                        AUC: {sdm.metrics.auc.toFixed(3)} • TSS: {sdm.metrics.tss?.toFixed(3) || 'N/A'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Boundaries Tab */}
      <TabsContent value="boundaries" className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">GeoJSON Boundaries</CardTitle>
                <CardDescription>Geographic layers for this project</CardDescription>
              </div>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Upload Boundary
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {boundaries.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No boundaries in this project yet</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {boundaries.map(boundary => (
                  <div key={boundary.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900">{boundary.name}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {boundary.feature_count} features • {boundary.uploaded_by_name || boundary.uploaded_by}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(boundary.created_date), 'PPP')}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}