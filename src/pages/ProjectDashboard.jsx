import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Users, Lock, Globe, Loader2, Archive, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Project Management Dashboard
 */

function ProjectCard({ project, onEdit, onDelete, currentUserEmail }) {
  const isOwner = project.owner_email === currentUserEmail;
  const teamCount = project.team_members?.length || 0;
  const speciesCount = project.species_ids?.length || 0;
  const sdmCount = project.sdm_run_ids?.length || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-800">{project.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{project.description}</p>
          </div>
          <Badge
            className={
              project.status === 'active'
                ? 'bg-green-100 text-green-700'
                : project.status === 'completed'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-700'
            }
          >
            {project.status}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {project.is_public && (
            <Badge variant="outline" className="gap-1">
              <Globe className="w-3 h-3" />
              Public
            </Badge>
          )}
          {!project.is_public && (
            <Badge variant="outline" className="gap-1">
              <Lock className="w-3 h-3" />
              Private
            </Badge>
          )}
          {project.tags?.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center py-2 bg-slate-50 rounded-lg">
          <div>
            <p className="text-lg font-bold text-slate-700">{speciesCount}</p>
            <p className="text-xs text-slate-500">Species</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-700">{sdmCount}</p>
            <p className="text-xs text-slate-500">SDM Runs</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-700">{teamCount}</p>
            <p className="text-xs text-slate-500">Team</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-slate-500">
            {isOwner ? 'Owner' : `Shared by ${project.owner_name}`}
          </span>
          {isOwner && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(project.id)}
                className="h-8 text-xs gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(project.id)}
                className="h-8 text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectModal({ project, onSave, onClose, allSpecies, allSDMRuns }) {
  const [formData, setFormData] = useState(project || {
    title: '',
    description: '',
    status: 'active',
    is_public: false,
    tags: [],
    species_ids: [],
    sdm_run_ids: [],
    team_members: []
  });

  const [newTeamEmail, setNewTeamEmail] = useState('');
  const [newTeamRole, setNewTeamRole] = useState('viewer');

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Project title required');
      return;
    }

    await onSave(formData);
  };

  const addTeamMember = () => {
    if (!newTeamEmail.trim()) {
      toast.error('Enter email address');
      return;
    }

    const newMember = {
      email: newTeamEmail,
      name: newTeamEmail.split('@')[0],
      role: newTeamRole,
      added_date: new Date().toISOString()
    };

    setFormData({
      ...formData,
      team_members: [...(formData.team_members || []), newMember]
    });

    setNewTeamEmail('');
    toast.success('Team member added');
  };

  const removeTeamMember = (email) => {
    setFormData({
      ...formData,
      team_members: formData.team_members.filter(m => m.email !== email)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-96 overflow-y-auto">
        <CardHeader>
          <CardTitle>{project ? 'Edit Project' : 'New Project'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic info */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">Project Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Callithrix Conservation 2026"
              className="h-9"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Project goals and description"
              className="w-full p-2 border rounded-lg text-sm h-20"
            />
          </div>

          {/* Status & visibility */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Visibility</label>
              <select
                value={formData.is_public ? 'public' : 'private'}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.value === 'public' })}
                className="w-full border rounded-lg p-2 text-sm"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>

          {/* Team members */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2 flex items-center gap-1">
              <Users className="w-4 h-4" />
              Team Members
            </label>

            <div className="flex gap-2 mb-3">
              <Input
                value={newTeamEmail}
                onChange={(e) => setNewTeamEmail(e.target.value)}
                placeholder="Email"
                className="h-8 text-sm flex-1"
              />
              <select
                value={newTeamRole}
                onChange={(e) => setNewTeamRole(e.target.value)}
                className="border rounded text-sm px-2"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <Button
                size="sm"
                onClick={addTeamMember}
                className="h-8"
              >
                Add
              </Button>
            </div>

            <div className="space-y-2 max-h-32 overflow-y-auto">
              {formData.team_members?.map(member => (
                <div key={member.email} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <div>
                    <p className="font-medium">{member.email}</p>
                    <p className="text-xs text-slate-500">{member.role}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeTeamMember(member.email)}
                    className="h-6 text-red-600"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-bangor-red hover:bg-bangor-red/90 text-white"
            >
              {project ? 'Update' : 'Create'} Project
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProjectDashboard() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch user
  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 100),
  });

  const { data: allSpecies = [] } = useQuery({
    queryKey: ['allSpecies'],
    queryFn: () => base44.entities.Species.list('-updated_date', 100),
  });

  const { data: allSDMRuns = [] } = useQuery({
    queryKey: ['sdmRuns'],
    queryFn: () => base44.entities.SDMRun.list('-created_date', 100),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingProject) {
        return base44.entities.Project.update(editingProject, data);
      } else {
        return base44.entities.Project.create({
          ...data,
          owner_email: currentUser.email,
          owner_name: currentUser.full_name || currentUser.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(editingProject ? 'Project updated' : 'Project created');
      setShowModal(false);
      setEditingProject(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
    }
  });

  const filteredProjects = projects.filter(p =>
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const userProjects = filteredProjects.filter(p =>
    p.owner_email === currentUser?.email ||
    p.team_members?.some(m => m.email === currentUser?.email)
  );

  const sharedWithMe = userProjects.filter(p => p.owner_email !== currentUser?.email);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/10 to-purple-50/10">
      {/* Header */}
      <header className="bg-white border-b-2 border-bangor-red shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bangor-red/10 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-bangor-red" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-bangor-red">Projects</h1>
              <p className="text-sm text-slate-500">Collaborate on species analyses with your team</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingProject(null);
              setShowModal(true);
            }}
            className="bg-bangor-red hover:bg-bangor-red/90 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Search */}
        <div>
          <Input
            placeholder="Search projects…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md h-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">
              All Projects ({userProjects.length})
            </TabsTrigger>
            <TabsTrigger value="owned">
              My Projects ({userProjects.filter(p => p.owner_email === currentUser?.email).length})
            </TabsTrigger>
            {sharedWithMe.length > 0 && (
              <TabsTrigger value="shared">
                Shared with Me ({sharedWithMe.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {userProjects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No projects yet</p>
                  <p className="text-sm text-slate-400">Create a project to group species and analyses</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    currentUserEmail={currentUser?.email}
                    onEdit={(id) => {
                      setEditingProject(id);
                      setShowModal(true);
                    }}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="owned" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userProjects.filter(p => p.owner_email === currentUser?.email).map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  currentUserEmail={currentUser?.email}
                  onEdit={(id) => {
                    setEditingProject(id);
                    setShowModal(true);
                  }}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          </TabsContent>

          {sharedWithMe.length > 0 && (
            <TabsContent value="shared" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sharedWithMe.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    currentUserEmail={currentUser?.email}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Modal */}
      {showModal && (
        <ProjectModal
          project={editingProject ? projects.find(p => p.id === editingProject) : null}
          onSave={(data) => saveMutation.mutate(data)}
          onClose={() => {
            setShowModal(false);
            setEditingProject(null);
          }}
          allSpecies={allSpecies}
          allSDMRuns={allSDMRuns}
        />
      )}
    </div>
  );
}