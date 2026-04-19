import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapContainer, TileLayer, HeatmapLayer } from 'react-leaflet';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Eye, EyeOff, Download, Share2, Maximize2, Settings, Brain, TrendingUp, CheckCircle2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

export default function SDMComparisonViewer() {
  const { projectId, speciesId } = useParams();
  const [selectedRuns, setSelectedRuns] = useState([]);
  const [visibleLayers, setVisibleLayers] = useState({});
  const [metricsView, setMetricsView] = useState('comparison');

  // Fetch project
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () =>
      base44.entities.Project.filter({ id: projectId }).then(p => p[0]),
    enabled: !!projectId
  });

  // Fetch all SDM runs for project
  const { data: allRuns = [] } = useQuery({
    queryKey: ['sdm-runs-project', projectId],
    queryFn: () => {
      if (!project?.sdm_run_ids || project.sdm_run_ids.length === 0) {
        return [];
      }
      return base44.entities.SDMRun.filter(
        { id: { $in: project.sdm_run_ids } },
        '-created_date',
        100
      );
    },
    enabled: !!project?.sdm_run_ids
  });

  // Fetch species if speciesId provided
  const { data: selectedSpecies } = useQuery({
    queryKey: ['species', speciesId],
    queryFn: () =>
      base44.entities.Species.filter({ id: speciesId }).then(s => s[0]),
    enabled: !!speciesId
  });

  // Filter runs for selected species
  const relevantRuns = useMemo(() => {
    if (speciesId) {
      return allRuns.filter(run =>
        run.species_ids?.includes(speciesId)
      );
    }
    return allRuns;
  }, [allRuns, speciesId]);

  // Get selected runs data
  const comparisonRuns = useMemo(() => {
    return relevantRuns.filter(run =>
      selectedRuns.includes(run.id)
    );
  }, [relevantRuns, selectedRuns]);

  // Initialize visibility for new runs
  React.useEffect(() => {
    const newVisible = {};
    comparisonRuns.forEach(run => {
      if (visibleLayers[run.id] === undefined) {
        newVisible[run.id] = true;
      }
    });
    if (Object.keys(newVisible).length > 0) {
      setVisibleLayers(prev => ({ ...prev, ...newVisible }));
    }
  }, [comparisonRuns]);

  const toggleRunSelection = (runId) => {
    setSelectedRuns(prev =>
      prev.includes(runId)
        ? prev.filter(id => id !== runId)
        : [...prev, runId].slice(-4) // Max 4 runs
    );
  };

  const toggleLayerVisibility = (runId) => {
    setVisibleLayers(prev => ({
      ...prev,
      [runId]: !prev[runId]
    }));
  };

  // Prepare metrics comparison data
  const metricsData = useMemo(() => {
    return comparisonRuns.map(run => ({
      name: run.name.substring(0, 15),
      auc: parseFloat((run.metrics?.auc || 0).toFixed(3)),
      tss: parseFloat((run.metrics?.tss || 0).toFixed(3)),
      sensitivity: parseFloat((run.metrics?.sensitivity || 0).toFixed(3)),
      specificity: parseFloat((run.metrics?.specificity || 0).toFixed(3)),
      kappa: parseFloat((run.metrics?.kappa || 0).toFixed(3)),
      full_name: run.name
    }));
  }, [comparisonRuns]);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    if (comparisonRuns.length === 0) return [];
    
    const metrics = ['AUC', 'TSS', 'Sensitivity', 'Specificity', 'Kappa'];
    return metrics.map(metric => {
      const dataPoint = { metric };
      comparisonRuns.forEach(run => {
        const key = metric.toLowerCase();
        dataPoint[run.name.substring(0, 10)] = run.metrics?.[key] || 0;
      });
      return dataPoint;
    });
  }, [comparisonRuns]);

  // Prepare variable importance data
  const variableData = useMemo(() => {
    if (comparisonRuns.length === 0) return [];
    
    const run = comparisonRuns[0];
    if (!run.variable_importance) return [];
    
    return run.variable_importance.slice(0, 5).map(v => ({
      name: v.variable.substring(0, 12),
      importance: parseFloat((v.importance || 0).toFixed(3))
    }));
  }, [comparisonRuns]);

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Brain className="w-8 h-8" />
            SDM Comparison Viewer
          </h1>
          <p className="text-slate-600">
            {selectedSpecies
              ? `${selectedSpecies.scientific_name} • Side-by-side model comparison`
              : `${project.title} • Compare distribution model scenarios`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Run Selection */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-base">Available Runs</CardTitle>
              <CardDescription>Select up to 4 models</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {relevantRuns.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-8">
                  No SDM runs available
                </p>
              ) : (
                relevantRuns.map(run => (
                  <label
                    key={run.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedRuns.includes(run.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Checkbox
                      checked={selectedRuns.includes(run.id)}
                      onCheckedChange={() => toggleRunSelection(run.id)}
                      disabled={
                        !selectedRuns.includes(run.id) &&
                        selectedRuns.length >= 4
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate">
                        {run.name}
                      </div>
                      <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                        <div>
                          {run.status === 'completed' ? (
                            <span className="flex items-center gap-1 text-green-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Complete
                            </span>
                          ) : (
                            <span className="text-slate-500">{run.status}</span>
                          )}
                        </div>
                        {run.metrics?.auc && (
                          <div>AUC: {run.metrics.auc.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Maps Grid */}
            {comparisonRuns.length > 0 && (
              <div
                className={`grid gap-4 ${
                  comparisonRuns.length <= 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-2'
                }`}
              >
                {comparisonRuns.map(run => (
                  <Card key={run.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-sm">{run.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {run.species_names?.join(', ')}
                          </CardDescription>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleLayerVisibility(run.id)}
                        >
                          {visibleLayers[run.id] ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {visibleLayers[run.id] ? (
                        <div className="h-64 sm:h-80 bg-slate-100 relative">
                          <MapContainer
                            center={[20, 0]}
                            zoom={3}
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='&copy; OpenStreetMap'
                            />

                            {/* Heatmap of predictions */}
                            {run.prediction_grid &&
                              Array.isArray(run.prediction_grid) &&
                              run.prediction_grid.length > 0 && (
                                <HeatmapLayer
                                  points={run.prediction_grid.map(p => [
                                    p.lat,
                                    p.lon,
                                    p.suitability || 0
                                  ])}
                                  max={1}
                                  radius={25}
                                  blur={20}
                                  gradient={{
                                    0: 'blue',
                                    0.25: 'lime',
                                    0.5: 'yellow',
                                    0.75: 'orange',
                                    1: 'red'
                                  }}
                                />
                              )}
                          </MapContainer>
                        </div>
                      ) : (
                        <div className="h-64 sm:h-80 bg-slate-50 flex items-center justify-center">
                          <p className="text-xs text-slate-500">Map hidden</p>
                        </div>
                      )}

                      {/* Quick metrics */}
                      <div className="grid grid-cols-2 gap-2 p-4 bg-white">
                        <div>
                          <span className="text-xs text-slate-600">AUC</span>
                          <div className="text-sm font-bold text-slate-900">
                            {run.metrics?.auc?.toFixed(3)}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-slate-600">TSS</span>
                          <div className="text-sm font-bold text-slate-900">
                            {run.metrics?.tss?.toFixed(3)}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-slate-600">Sensitivity</span>
                          <div className="text-sm font-bold text-slate-900">
                            {run.metrics?.sensitivity?.toFixed(3)}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-slate-600">Specificity</span>
                          <div className="text-sm font-bold text-slate-900">
                            {run.metrics?.specificity?.toFixed(3)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {comparisonRuns.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">
                    Select at least one SDM run to compare
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Metrics Comparison */}
            {comparisonRuns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Model Performance Metrics
                    </span>
                    <Tabs
                      value={metricsView}
                      onValueChange={setMetricsView}
                      className="w-auto"
                    >
                      <TabsList>
                        <TabsTrigger value="comparison">Comparison</TabsTrigger>
                        <TabsTrigger value="radar">Radar</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsView === 'comparison' ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={metricsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 1]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #ccc',
                            borderRadius: '6px'
                          }}
                          formatter={(value) => value.toFixed(3)}
                          labelFormatter={(label) => {
                            const run = metricsData.find(m => m.name === label);
                            return run?.full_name || label;
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="auc"
                          fill="#3b82f6"
                          name="AUC"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="tss"
                          fill="#10b981"
                          name="TSS"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="sensitivity"
                          fill="#f59e0b"
                          name="Sensitivity"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="specificity"
                          fill="#8b5cf6"
                          name="Specificity"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis
                          tick={{ fontSize: 11 }}
                          domain={[0, 1]}
                        />
                        <Radar
                          name={comparisonRuns[0]?.name}
                          dataKey={comparisonRuns[0]?.name?.substring(0, 10)}
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.5}
                        />
                        {comparisonRuns[1] && (
                          <Radar
                            name={comparisonRuns[1]?.name}
                            dataKey={comparisonRuns[1]?.name?.substring(0, 10)}
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.3}
                          />
                        )}
                        {comparisonRuns[2] && (
                          <Radar
                            name={comparisonRuns[2]?.name}
                            dataKey={comparisonRuns[2]?.name?.substring(0, 10)}
                            stroke="#f59e0b"
                            fill="#f59e0b"
                            fillOpacity={0.2}
                          />
                        )}
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Variable Importance */}
            {variableData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Top Variables - {comparisonRuns[0]?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={variableData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #ccc',
                          borderRadius: '6px'
                        }}
                        formatter={(value) => value.toFixed(3)}
                      />
                      <Bar
                        dataKey="importance"
                        fill="#3b82f6"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}