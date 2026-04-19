import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Brain, CheckCircle2, AlertCircle, AlertTriangle, Database, Zap } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const COLORS = {
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  neutral: '#6b7280'
};

export default function AnalyticsDashboard() {
  // Fetch all data
  const { data: projects = [] } = useQuery({
    queryKey: ['analytics-projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 100)
  });

  const { data: sdmRuns = [] } = useQuery({
    queryKey: ['analytics-sdm-runs'],
    queryFn: () => base44.entities.SDMRun.list('-created_date', 200)
  });

  const { data: species = [] } = useQuery({
    queryKey: ['analytics-species'],
    queryFn: () => base44.entities.Species.list('-created_date', 500)
  });

  const { data: validationFlags = [] } = useQuery({
    queryKey: ['analytics-validation-flags'],
    queryFn: () => base44.entities.ValidationFlag.list('-created_date', 500)
  });

  // Process occurrence trends over time
  const occurrenceTrends = useMemo(() => {
    const monthData = {};

    species.forEach(s => {
      if (s.observations && Array.isArray(s.observations)) {
        s.observations.forEach(obs => {
          const date = obs.eventDate || s.last_observed;
          if (date) {
            try {
              const month = format(parseISO(date), 'yyyy-MM');
              monthData[month] = (monthData[month] || 0) + 1;
            } catch (e) {
              // Skip invalid dates
            }
          }
        });
      }

      // Add iNaturalist and GBIF observation counts
      if (s.gbif_occurrences && Array.isArray(s.gbif_occurrences)) {
        s.gbif_occurrences.forEach(occ => {
          const date = occ.eventDate || s.gbif_last_occurrence;
          if (date) {
            try {
              const month = format(parseISO(date), 'yyyy-MM');
              monthData[month] = (monthData[month] || 0) + 1;
            } catch (e) {
              // Skip invalid dates
            }
          }
        });
      }
    });

    return Object.entries(monthData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({
        month: format(parseISO(`${month}-01`), 'MMM yy'),
        occurrences: count
      }));
  }, [species]);

  // Process SDM performance metrics
  const sdmMetrics = useMemo(() => {
    const completed = sdmRuns.filter(r => r.status === 'completed');

    return completed.slice(-10).map(run => ({
      name: run.name.substring(0, 20),
      auc: parseFloat((run.metrics?.auc || 0).toFixed(2)),
      tss: parseFloat((run.metrics?.tss || 0).toFixed(2)),
      sensitivity: parseFloat((run.metrics?.sensitivity || 0).toFixed(2)),
      specificity: parseFloat((run.metrics?.specificity || 0).toFixed(2)),
      full_name: run.name
    }));
  }, [sdmRuns]);

  // Process validation flags summary
  const validationSummary = useMemo(() => {
    const summary = {
      total: validationFlags.length,
      error: validationFlags.filter(f => f.severity === 'error').length,
      warning: validationFlags.filter(f => f.severity === 'warning').length,
      info: validationFlags.filter(f => f.severity === 'info').length,
      resolved: validationFlags.filter(f => f.status === 'corrected' || f.status === 'dismissed').length
    };

    return [
      { name: 'Error', value: summary.error, color: COLORS.error },
      { name: 'Warning', value: summary.warning, color: COLORS.warning },
      { name: 'Info', value: summary.info, color: COLORS.info }
    ].filter(d => d.value > 0);
  }, [validationFlags]);

  // Data quality per project
  const projectQuality = useMemo(() => {
    return projects.map(project => {
      const projectFlags = validationFlags.filter(
        f => project.species_ids?.includes(f.species_id)
      );

      const totalRecords = project.occurrence_ids?.length || 0;
      const flaggedRecords = new Set(projectFlags.map(f => f.occurrence_id)).size;
      const qualityScore = totalRecords === 0 ? 100 : Math.max(0, 100 - (flaggedRecords / totalRecords * 100));

      return {
        id: project.id,
        name: project.title,
        quality: parseFloat(qualityScore.toFixed(1)),
        flagCount: projectFlags.length,
        recordCount: totalRecords,
        status: qualityScore >= 90 ? 'excellent' : qualityScore >= 75 ? 'good' : qualityScore >= 50 ? 'fair' : 'poor'
      };
    }).sort((a, b) => b.quality - a.quality);
  }, [projects, validationFlags]);

  // Statistics
  const stats = useMemo(() => ({
    totalSpecies: species.length,
    totalOccurrences: species.reduce((sum, s) => sum + (s.observation_count || 0) + (s.gbif_occurrence_count || 0), 0),
    completedRuns: sdmRuns.filter(r => r.status === 'completed').length,
    avgAuc: sdmRuns.length > 0
      ? parseFloat((sdmRuns
          .filter(r => r.status === 'completed' && r.metrics?.auc)
          .reduce((sum, r) => sum + r.metrics.auc, 0) / Math.max(1, sdmRuns.filter(r => r.status === 'completed' && r.metrics?.auc).length))
          .toFixed(2))
      : 0,
    dataQualityIssues: validationFlags.filter(f => f.severity !== 'info').length,
    resolvedIssues: validationFlags.filter(f => f.status === 'corrected' || f.status === 'dismissed').length
  }), [species, sdmRuns, validationFlags]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics Dashboard</h1>
          <p className="text-slate-600">Real-time insights into occurrence data, model performance, and data quality across all projects.</p>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Species</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalSpecies}</p>
                </div>
                <Database className="w-8 h-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Occurrences</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalOccurrences.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Models Complete</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stats.completedRuns}</p>
                  <p className="text-xs text-slate-500 mt-1">Avg AUC: {stats.avgAuc}</p>
                </div>
                <Brain className="w-8 h-8 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Issues Resolved</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stats.resolvedIssues}</p>
                  <p className="text-xs text-slate-500 mt-1">of {stats.dataQualityIssues} flagged</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Occurrence Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Occurrence Records Over Time
            </CardTitle>
            <CardDescription>Monthly distribution of species observations from all sources</CardDescription>
          </CardHeader>
          <CardContent>
            {occurrenceTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={occurrenceTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px' }}
                    formatter={(value) => [value.toLocaleString(), 'Occurrences']}
                  />
                  <Line
                    type="monotone"
                    dataKey="occurrences"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-500">
                No occurrence data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* SDM Model Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              SDM Model Performance (Last 10 Completed)
            </CardTitle>
            <CardDescription>Accuracy metrics: AUC, TSS, Sensitivity, Specificity</CardDescription>
          </CardHeader>
          <CardContent>
            {sdmMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={sdmMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 1]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px' }}
                    formatter={(value) => value.toFixed(3)}
                    labelFormatter={(label) => {
                      const run = sdmMetrics.find(m => m.name === label);
                      return run?.full_name || label;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="auc" fill="#3b82f6" name="AUC" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tss" fill="#10b981" name="TSS" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sensitivity" fill="#f59e0b" name="Sensitivity" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="specificity" fill="#8b5cf6" name="Specificity" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-500">
                No completed SDM runs available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Quality Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Validation Flags Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Validation Flags Summary
              </CardTitle>
              <CardDescription>Distribution of data quality issues by severity</CardDescription>
            </CardHeader>
            <CardContent>
              {validationSummary.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={validationSummary}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {validationSummary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500">
                  No validation flags
                </div>
              )}
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total Flags:</span>
                  <span className="font-medium">{validationSummary.reduce((sum, d) => sum + d.value, 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Resolved:</span>
                  <Badge variant="outline" className="bg-green-50">{stats.resolvedIssues}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Quality by Project */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Data Quality by Project
              </CardTitle>
              <CardDescription>Overall quality score per project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {projectQuality.length > 0 ? (
                  projectQuality.map(project => (
                    <div key={project.id} className="p-3 rounded-lg border border-slate-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm text-slate-900">{project.name}</p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {project.recordCount} records • {project.flagCount} issues
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            project.status === 'excellent'
                              ? 'bg-green-50 text-green-700'
                              : project.status === 'good'
                              ? 'bg-blue-50 text-blue-700'
                              : project.status === 'fair'
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-red-50 text-red-700'
                          }
                        >
                          {project.quality}%
                        </Badge>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={
                            project.status === 'excellent'
                              ? 'bg-green-500'
                              : project.status === 'good'
                              ? 'bg-blue-500'
                              : project.status === 'fair'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }
                          style={{ width: `${project.quality}%` }}
                          className="h-full rounded-full transition-all"
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">No projects available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}