import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Map, Save, Download, Eye, MessageSquare, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import AnnotatedPredictionMap from '@/components/maps/AnnotatedPredictionMap';

export default function MapAnnotationEditor() {
  const { sdmRunId } = useParams();
  const [activeTab, setActiveTab] = useState('map');
  const queryClient = useQueryClient();

  // Fetch SDM run
  const { data: sdmRun, isLoading } = useQuery({
    queryKey: ['sdm-run', sdmRunId],
    queryFn: () => base44.entities.SDMRun.filter({ id: sdmRunId }).then(r => r[0]),
    enabled: !!sdmRunId
  });

  // Fetch annotations
  const { data: annotations = [] } = useQuery({
    queryKey: ['sdm-annotations', sdmRunId],
    queryFn: () =>
      base44.entities.SDMAnnotation.filter(
        { sdm_run_id: sdmRunId },
        '-created_date',
        100
      ),
    enabled: !!sdmRunId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!sdmRun) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="text-center text-slate-600">SDM run not found</div>
      </div>
    );
  }

  const unresolvedCount = annotations.filter(a => !a.resolved).length;
  const flagCount = annotations.filter(a => a.annotation_type === 'flag').length;
  const overrideCount = annotations.filter(a => a.annotation_type === 'override').length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-bangor-red shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-bangor-red/10 rounded-xl">
              <Map className="w-6 h-6 text-bangor-red" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-bangor-red">Map Annotation Editor</h1>
              <p className="text-sm text-slate-500">Draw regions, add notes, and override suitability scores</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Model:</span>
              <Badge variant="secondary">{sdmRun.name}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Status:</span>
              <Badge className={sdmRun.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                {sdmRun.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Annotations:</span>
              <Badge variant="outline">{unresolvedCount} unresolved</Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Interactive Map
            </TabsTrigger>
            <TabsTrigger value="annotations" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Annotations
              <Badge variant="secondary" className="ml-2">{unresolvedCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Summary
            </TabsTrigger>
          </TabsList>

          {/* Map Tab */}
          <TabsContent value="map" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <AnnotatedPredictionMap
                  sdmRunId={sdmRunId}
                  predictionGrid={sdmRun.prediction_grid || []}
                  bounds={sdmRun.bounds}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Annotations Tab */}
          <TabsContent value="annotations" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Unresolved Annotations */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Unresolved Annotations ({unresolvedCount})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {unresolvedCount === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
                        <p className="text-slate-600">All annotations have been resolved</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {annotations.filter(a => !a.resolved).map(annotation => (
                          <AnnotationCard key={annotation.id} annotation={annotation} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600">Total Annotations</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{annotations.length}</p>
                  </div>

                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600 font-medium">Region Flags</p>
                    <p className="text-2xl font-bold text-red-700 mt-1">{flagCount}</p>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600 font-medium">Score Overrides</p>
                    <p className="text-2xl font-bold text-purple-700 mt-1">{overrideCount}</p>
                  </div>

                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-medium">Resolved</p>
                    <p className="text-2xl font-bold text-green-700 mt-1">
                      {annotations.filter(a => a.resolved).length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Annotation Summary Report</CardTitle>
                <CardDescription>Overview of all feedback and modifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Model Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600">Model Name</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{sdmRun.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Species</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {sdmRun.species_names?.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Performance (AUC)</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {sdmRun.metrics?.auc?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Total Annotations</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{annotations.length}</p>
                  </div>
                </div>

                {/* Annotation Types Breakdown */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Annotation Breakdown</h3>
                  <div className="space-y-2">
                    {[
                      { type: 'flag', label: 'Region Flags', color: 'bg-red-50 border-red-200' },
                      { type: 'comment', label: 'Comments', color: 'bg-blue-50 border-blue-200' },
                      { type: 'override', label: 'Score Overrides', color: 'bg-purple-50 border-purple-200' },
                      { type: 'critical', label: 'Critical Issues', color: 'bg-orange-50 border-orange-200' }
                    ].map(({ type, label, color }) => {
                      const count = annotations.filter(a => a.annotation_type === type).length;
                      return (
                        <div key={type} className={`p-3 border rounded-lg ${color}`}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-700">{label}</p>
                            <p className="text-lg font-bold text-slate-900">{count}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Annotators */}
                {annotations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Annotations</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {annotations.slice(0, 10).map(annotation => (
                        <div key={annotation.id} className="p-2 bg-slate-50 rounded text-xs">
                          <p className="font-medium text-slate-900">{annotation.content}</p>
                          <p className="text-slate-600 mt-1">
                            {annotation.created_by_name} • {format(new Date(annotation.created_date), 'PPp')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Export Button */}
                <Button className="w-full gap-2 bg-bangor-red hover:bg-bangor-red/90 text-white">
                  <Download className="w-4 h-4" />
                  Export Annotations Report
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function AnnotationCard({ annotation }) {
  const typeConfig = {
    flag: { icon: '🚩', color: 'bg-red-50 border-red-200' },
    comment: { icon: '💬', color: 'bg-blue-50 border-blue-200' },
    override: { icon: '⚙️', color: 'bg-purple-50 border-purple-200' },
    critical: { icon: '⚠️', color: 'bg-orange-50 border-orange-200' }
  };

  const config = typeConfig[annotation.annotation_type] || typeConfig.flag;

  return (
    <div className={`p-4 border rounded-lg ${config.color}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <div>
            <p className="font-medium text-slate-900 text-sm">{annotation.title}</p>
            <p className="text-xs text-slate-600">{annotation.created_by_name}</p>
          </div>
        </div>
        {annotation.resolved && (
          <Badge className="bg-green-100 text-green-700">Resolved</Badge>
        )}
      </div>

      <p className="text-sm text-slate-700 mb-2">{annotation.content}</p>

      {annotation.rerun_parameters?.suitability_override !== undefined && (
        <p className="text-xs text-purple-600 font-medium">
          Override Score: {(annotation.rerun_parameters.suitability_override * 100).toFixed(0)}%
        </p>
      )}

      <p className="text-xs text-slate-500 mt-2">
        {format(new Date(annotation.created_date), 'PPp')}
      </p>
    </div>
  );
}