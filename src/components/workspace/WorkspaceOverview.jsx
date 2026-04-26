import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, Layers, Users, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function WorkspaceOverview({ project }) {
  if (!project) return null;

  const speciesCount = project.species_ids?.length || 0;
  const sdmCount = project.sdm_run_ids?.length || 0;
  const teamCount = (project.team_members?.length || 0) + 1;

  // Calculate project progress (0-100%)
  const targetSpecies = 10; // Configurable target
  const speciesProgress = Math.min((speciesCount / targetSpecies) * 100, 100);
  const sdmProgress = sdmCount > 0 ? Math.min((sdmCount / 5) * 100, 100) : 0;
  const overallProgress = Math.round((speciesProgress + sdmProgress) / 2);

  const daysActive = project.start_date 
    ? Math.floor((Date.now() - new Date(project.start_date)) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Project Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Overall Progress</span>
              <span className="text-sm font-bold text-slate-900">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Species Collected</span>
              <span className="font-medium">{speciesCount}/{targetSpecies}</span>
            </div>
            <Progress value={speciesProgress} className="h-1.5" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">SDM Models</span>
              <span className="font-medium">{sdmCount}/5</span>
            </div>
            <Progress value={sdmProgress} className="h-1.5" />
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-slate-700">Species</span>
            </div>
            <span className="text-lg font-bold text-slate-900">{speciesCount}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-green-600" />
              <span className="text-sm text-slate-700">SDM Runs</span>
            </div>
            <span className="text-lg font-bold text-slate-900">{sdmCount}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-slate-700">Team Members</span>
            </div>
            <span className="text-lg font-bold text-slate-900">{teamCount}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-slate-700">Days Active</span>
            </div>
            <span className="text-lg font-bold text-slate-900">{daysActive}</span>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Project Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-600">Created</p>
              <p className="font-medium text-slate-900">
                {project.created_date ? format(new Date(project.created_date), 'PPP') : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-600">Last Updated</p>
              <p className="font-medium text-slate-900">
                {project.updated_date ? format(new Date(project.updated_date), 'PPP') : 'N/A'}
              </p>
            </div>
            {project.start_date && (
              <div>
                <p className="text-slate-600">Start Date</p>
                <p className="font-medium text-slate-900">{format(new Date(project.start_date), 'PPP')}</p>
              </div>
            )}
            {project.end_date && (
              <div>
                <p className="text-slate-600">Target End</p>
                <p className="font-medium text-slate-900">{format(new Date(project.end_date), 'PPP')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}