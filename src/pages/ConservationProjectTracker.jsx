import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Plus, Target, TrendingUp, Users, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function ConservationProjectTracker() {
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.ConservationProject?.list?.() || []
  });

  const generateReportMutation = React.useMemo(() => ({
    mutate: async (project) => {
      try {
        const response = await base44.functions.invoke('generateConservationReport', {
          project_id: project.id,
          project_name: project.name,
          impact_metrics: project.impact_metrics || {},
          species_list: project.species_targeted || [],
          survey_count: project.surveys?.length || 0
        });

        toast.success('Report generated! Download ready.');
      } catch (error) {
        toast.error('Report generation failed');
      }
    }
  }), []);

  const impactData = projects.map(p => ({
    name: p.name.slice(0, 15),
    protected: p.impact_metrics?.species_protected || 0,
    habitat: p.impact_metrics?.habitat_restored_hectares || 0
  }));

  const statusData = [
    { name: 'Planning', value: projects.filter(p => p.status === 'planning').length },
    { name: 'Active', value: projects.filter(p => p.status === 'active').length },
    { name: 'Monitoring', value: projects.filter(p => p.status === 'monitoring').length },
    { name: 'Completed', value: projects.filter(p => p.status === 'completed').length }
  ];

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Conservation Projects</h1>
          <p className="text-slate-600 mt-1">Track impact metrics and generate research publications</p>
        </div>
        <Button
          onClick={() => setShowNewProject(true)}
          className="gap-2 bg-bangor-red hover:bg-bangor-red/90"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-2">Active Projects</p>
            <p className="text-3xl font-bold text-slate-900">
              {projects.filter(p => p.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-2">Species Protected</p>
            <p className="text-3xl font-bold text-green-600">
              {projects.reduce((sum, p) => sum + (p.impact_metrics?.species_protected || 0), 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-2">Habitat Restored</p>
            <p className="text-3xl font-bold text-blue-600">
              {projects.reduce((sum, p) => sum + (p.impact_metrics?.habitat_restored_hectares || 0), 0)} ha
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-2">Funding Raised</p>
            <p className="text-3xl font-bold text-purple-600">
              £{(projects.reduce((sum, p) => sum + (p.impact_metrics?.funding_raised || 0), 0) / 1000).toFixed(0)}k
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Impact Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-bangor-red" />
              Impact Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={impactData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="protected" fill="#ef4444" name="Species Protected" />
                <Bar dataKey="habitat" fill="#3b82f6" name="Habitat (ha)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Status */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Active Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(project => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-lg transition"
              onClick={() => setSelectedProject(project)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge className={`${
                    project.status === 'active' ? 'bg-green-100 text-green-700' :
                    project.status === 'planning' ? 'bg-blue-100 text-blue-700' :
                    project.status === 'monitoring' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">{project.description}</p>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-slate-600">Species</p>
                    <p className="font-bold text-slate-900">{project.species_targeted?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Habitat (ha)</p>
                    <p className="font-bold text-slate-900">
                      {project.impact_metrics?.habitat_restored_hectares || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Team</p>
                    <p className="font-bold text-slate-900">{project.team_members?.length || 0}</p>
                  </div>
                </div>

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    generateReportMutation.mutate(project);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                >
                  <Download className="w-4 h-4" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}