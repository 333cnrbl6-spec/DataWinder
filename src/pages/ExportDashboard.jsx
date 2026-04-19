import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, Database, Brain, Flag, Loader2, CheckCircle2, AlertCircle, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';

export default function ExportDashboard() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedComponents, setSelectedComponents] = useState(['species_metadata', 'occurrence_records']);
  const [exportFormat, setExportFormat] = useState('csv');
  const queryClient = useQueryClient();

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-export'],
    queryFn: () => base44.entities.Project.list('-created_date', 50)
  });

  // Fetch export history
  const { data: exportJobs = [] } = useQuery({
    queryKey: ['export-jobs'],
    queryFn: () => base44.entities.ExportJob.list('-created_date', 100)
  });

  // Create export mutation
  const createExportMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('generateDataExport', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-jobs'] });
      setSelectedComponents(['species_metadata', 'occurrence_records']);
      setSelectedProject(null);
    }
  });

  const handleToggleComponent = (component) => {
    setSelectedComponents(prev =>
      prev.includes(component)
        ? prev.filter(c => c !== component)
        : [...prev, component]
    );
  };

  const handleExport = () => {
    if (!selectedProject) {
      alert('Please select a project');
      return;
    }

    createExportMutation.mutate({
      project_id: selectedProject.id,
      export_type: exportFormat,
      data_components: selectedComponents,
      filters: {}
    });
  };

  const componentOptions = [
    { id: 'species_metadata', label: 'Species Metadata', icon: Database, desc: 'Scientific names, IUCN status, populations' },
    { id: 'occurrence_records', label: 'Occurrence Records', icon: MapPin, desc: 'Validated occurrence points with coordinates' },
    { id: 'occurrence_notes', label: 'Occurrence Notes', icon: FileText, desc: 'Expert annotations and field notes' },
    { id: 'sdm_results', label: 'SDM Model Results', icon: Brain, desc: 'Distribution models, metrics, variable importance' },
    { id: 'validation_flags', label: 'Validation Flags', icon: Flag, desc: 'Data quality issues and inconsistencies' }
  ];

  const formatOptions = [
    { id: 'csv', label: 'CSV', desc: 'Spreadsheet format for all data' },
    { id: 'geojson', label: 'GeoJSON', desc: 'Geographic format for GIS software' }
  ];

  if (projectsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Data Export Dashboard</h1>
          <p className="text-slate-600">Batch-download project data in CSV or GeoJSON formats for external GIS analysis.</p>
        </div>

        <Tabs defaultValue="export" className="space-y-6">
          <TabsList>
            <TabsTrigger value="export">Create Export</TabsTrigger>
            <TabsTrigger value="history">Export History</TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            {/* Project Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Select Project</CardTitle>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <p className="text-slate-600">No projects available.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {projects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          selectedProject?.id === project.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium text-sm mb-1">{project.title}</div>
                        <div className="text-xs text-slate-600 space-y-1">
                          <div>📊 {project.species_ids?.length || 0} species</div>
                          <div>📍 {project.occurrence_ids?.length || 0} occurrences</div>
                          <div>🧬 {project.sdm_run_ids?.length || 0} models</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedProject && (
              <>
                {/* Format Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">2. Choose Format</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {formatOptions.map(fmt => (
                        <button
                          key={fmt.id}
                          onClick={() => setExportFormat(fmt.id)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            exportFormat === fmt.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-medium text-sm mb-1">{fmt.label}</div>
                          <div className="text-xs text-slate-600">{fmt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Component Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">3. Select Data Components</CardTitle>
                    <CardDescription>Choose which data to include in the export</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {componentOptions.map(comp => {
                      const Icon = comp.icon;
                      const isAvailable =
                        (comp.id === 'species_metadata' && selectedProject.species_ids?.length > 0) ||
                        (comp.id === 'occurrence_records' && selectedProject.occurrence_ids?.length > 0) ||
                        (comp.id === 'occurrence_notes' && selectedProject.species_ids?.length > 0) ||
                        (comp.id === 'sdm_results' && selectedProject.sdm_run_ids?.length > 0) ||
                        (comp.id === 'validation_flags' && selectedProject.species_ids?.length > 0);

                      return (
                        <label
                          key={comp.id}
                          className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedComponents.includes(comp.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Checkbox
                            checked={selectedComponents.includes(comp.id)}
                            onCheckedChange={() => handleToggleComponent(comp.id)}
                            disabled={!isAvailable}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-slate-600" />
                              <span className="font-medium text-sm">{comp.label}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{comp.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Export Button */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm text-slate-900">Ready to export?</div>
                        <div className="text-xs text-slate-600 mt-1">
                          {selectedComponents.length} components selected
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={createExportMutation.isPending || selectedComponents.length === 0}
                            className="gap-2"
                          >
                            {createExportMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Exporting...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                Start Export
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Export</AlertDialogTitle>
                            <AlertDialogDescription>
                              Export {selectedComponents.length} components from "{selectedProject.title}" as {exportFormat.toUpperCase()}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogAction onClick={handleExport}>
                            Start Export
                          </AlertDialogAction>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            {exportJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No exports yet. Create your first export above.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {exportJobs.map(job => (
                  <Card key={job.id} className={job.status === 'failed' ? 'border-red-200 bg-red-50' : ''}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {job.project_name}
                              <Badge variant="outline" className="capitalize text-xs">
                                {job.export_type}
                              </Badge>
                              {job.status === 'completed' && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Complete
                                </Badge>
                              )}
                              {job.status === 'processing' && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Processing
                                </Badge>
                              )}
                              {job.status === 'failed' && (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Failed
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              by {job.requested_by_name} • {format(new Date(job.created_date), 'PPp')}
                            </div>
                          </div>
                          {job.status === 'completed' && (
                            <a
                              href={job.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                            >
                              <ArrowDown className="w-3 h-3" />
                              Download
                            </a>
                          )}
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-slate-600">Components:</span>
                            <div className="font-medium text-slate-900 mt-1">
                              {job.data_components?.join(', ')}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-600">Records:</span>
                            <div className="font-medium text-slate-900 mt-1">
                              {job.record_count ? `${job.record_count} records` : '—'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-600">Size:</span>
                            <div className="font-medium text-slate-900 mt-1">
                              {job.file_size_mb ? `${job.file_size_mb} MB` : '—'}
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {job.status === 'processing' && (
                          <div className="bg-slate-200 rounded h-2 overflow-hidden">
                            <div
                              className="bg-blue-500 h-full transition-all"
                              style={{ width: `${job.progress_pct || 0}%` }}
                            ></div>
                          </div>
                        )}

                        {/* Error message */}
                        {job.error_message && (
                          <div className="bg-red-100 border border-red-300 rounded p-3 text-xs text-red-700">
                            {job.error_message}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}