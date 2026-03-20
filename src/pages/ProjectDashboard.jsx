import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderPlus, Folder, Calendar, Tag, Beaker, Database, Filter, Search, Archive, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import ProjectCreateModal from '@/components/projects/ProjectCreateModal';
import ProjectDetailView from '@/components/projects/ProjectDetailView';

export default function ProjectDashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 200)
  });

  const { data: speciesLists = [] } = useQuery({
    queryKey: ['speciesLists'],
    queryFn: () => base44.entities.SpeciesList.list()
  });

  const { data: climateDatasets = [] } = useQuery({
    queryKey: ['climateDatasets'],
    queryFn: () => base44.entities.ClimateDataset.list()
  });

  const { data: maxentRuns = [] } = useQuery({
    queryKey: ['maxentRuns'],
    queryFn: () => base44.entities.MaxentRun.list()
  });

  const filtered = projects.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.research_area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProjectStats = (project) => {
    const lists = speciesLists.filter(sl => project.species_lists_ids?.includes(sl.id)).length;
    const datasets = climateDatasets.filter(cd => project.climate_dataset_ids?.includes(cd.id)).length;
    const runs = maxentRuns.filter(mr => project.maxent_run_ids?.includes(mr.id)).length;
    return { lists, datasets, runs };
  };

  const handleDelete = async (projectId) => {
    if (window.confirm('Delete this project?')) {
      await base44.entities.Project.delete(projectId);
      refetch();
      setSelectedProject(null);
    }
  };

  const statusColors = {
    active: 'bg-green-100 text-green-700 border-green-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    archived: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-bangor-red/5 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-bangor-red flex items-center gap-2">
              <Folder className="w-8 h-8" /> Research Projects
            </h1>
            <p className="text-slate-600 mt-1">Organize species lists, datasets, and model outputs into projects</p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-bangor-red hover:bg-bangor-red/90"
          >
            <FolderPlus className="w-4 h-4 mr-2" /> New Project
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search projects…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'completed', 'archived'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                  statusFilter === status
                    ? 'bg-bangor-red text-white border-bangor-red'
                    : 'border-slate-200 text-slate-600 hover:border-bangor-red/40'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Loading projects…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
            <p className="text-slate-500 mb-4">No projects found{searchTerm ? ' matching your search' : ''}.</p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-bangor-red hover:bg-bangor-red/90"
            >
              Create Your First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map(project => {
                const stats = getProjectStats(project);
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card 
                      className="hover:shadow-md transition-all cursor-pointer h-full border-slate-200"
                      onClick={() => setSelectedProject(project)}
                    >
                      <CardHeader className="border-b border-slate-100 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg text-slate-900 truncate">{project.name}</CardTitle>
                            {project.research_area && (
                              <p className="text-xs text-slate-500 mt-1">{project.research_area}</p>
                            )}
                          </div>
                          <Badge className={`text-xs border shrink-0 ${statusColors[project.status] || statusColors.active}`}>
                            {project.status}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4 space-y-4">
                        {project.description && (
                          <p className="text-sm text-slate-600 line-clamp-2">{project.description}</p>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-slate-50 p-2 rounded">
                            <div className="text-lg font-bold text-bangor-red">{stats.lists}</div>
                            <div className="text-slate-500 truncate">Species Lists</div>
                          </div>
                          <div className="bg-slate-50 p-2 rounded">
                            <div className="text-lg font-bold text-blue-600">{stats.datasets}</div>
                            <div className="text-slate-500 truncate">Datasets</div>
                          </div>
                          <div className="bg-slate-50 p-2 rounded">
                            <div className="text-lg font-bold text-green-600">{stats.runs}</div>
                            <div className="text-slate-500 truncate">Model Runs</div>
                          </div>
                        </div>

                        {/* Tags */}
                        {project.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {project.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" /> {tag}
                              </Badge>
                            ))}
                            {project.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{project.tags.length - 3}</Badge>
                            )}
                          </div>
                        )}

                        {/* Dates */}
                        {project.start_date && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            Started {new Date(project.start_date).toLocaleDateString()}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(project);
                            }}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(project.id);
                            }}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <ProjectCreateModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch();
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Detail View */}
      {selectedProject && (
        <ProjectDetailView
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={() => refetch()}
        />
      )}
    </div>
  );
}