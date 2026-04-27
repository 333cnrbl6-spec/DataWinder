import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectsOverview({ projects = [] }) {
  const activeProjects = projects.filter(p => p.status === 'active');
  const displayProjects = activeProjects.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Active Projects</CardTitle>
      </CardHeader>
      <CardContent>
        {displayProjects.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">No active projects. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayProjects.map(project => (
              <Link
                key={project.id}
                to={`/ProjectWorkspace/${project.id}`}
                className="flex items-start justify-between p-3 rounded-lg border border-slate-200 hover:border-bangor-red hover:bg-bangor-red/5 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 text-sm group-hover:text-bangor-red transition-colors truncate">
                    {project.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    {project.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(project.start_date), 'MMM yyyy')}
                      </span>
                    )}
                    {project.team_members && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {project.team_members.length} members
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-bangor-red shrink-0 ml-2 transition-colors" />
              </Link>
            ))}
            {activeProjects.length > 5 && (
              <p className="text-xs text-slate-400 pt-2">
                +{activeProjects.length - 5} more projects
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}