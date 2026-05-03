import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, MessageCircle, Database, Settings, ArrowLeft, Loader2 } from 'lucide-react';
import WorkspaceComments from '@/components/workspace/WorkspaceComments';
import WorkspaceTeamManager from '@/components/workspace/WorkspaceTeamManager';
import ProcessingFeedback from '@/components/ui/ProcessingFeedback';

export default function SharedWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [sdmRuns, setSdmRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const [user, projectData] = await Promise.all([
        base44.auth.me(),
        base44.entities.Project.get(projectId)
      ]);

      setCurrentUser(user);
      setProject(projectData);

      // Load SDM runs for this project
      const runs = await base44.entities.SDMRun.filter(
        { species_ids: { $in: [projectData.species_ids] } },
        '-created_date',
        20
      );
      setSdmRuns(runs);
    } catch (error) {
      console.error('Failed to load workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <ProcessingFeedback label="Loading workspace..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600">Project not found</p>
            <Button
              onClick={() => navigate('/ProjectDashboard')}
              className="mt-4 bg-bangor-red hover:bg-bangor-red/90"
            >
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEditor = project.team_members?.some(
    m => m.email === currentUser?.email && m.role === 'editor'
  ) || project.owner_email === currentUser?.email;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/ProjectDashboard')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{project.title}</h1>
              <p className="text-sm text-slate-600 mt-1">
                {project.description}
              </p>
            </div>
          </div>
          <Badge className="bg-bangor-red text-white h-fit">
            {project.status}
          </Badge>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sdm-runs">
              <Database className="w-4 h-4 mr-2" />
              Models
            </TabsTrigger>
            <TabsTrigger value="comments">
              <MessageCircle className="w-4 h-4 mr-2" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="w-4 h-4 mr-2" />
              Team
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Species</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {project.species_ids?.length || 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Occurrences</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {project.occurrence_ids?.length || 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {project.team_members?.length || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  onClick={() => navigate(`/ProjectWorkspace/${projectId}`)}
                  className="bg-bangor-red hover:bg-bangor-red/90"
                >
                  View Data
                </Button>
                <Button
                  onClick={() => navigate(`/SDMPipeline?project=${projectId}`)}
                  className="bg-bangor-red hover:bg-bangor-red/90"
                >
                  Run SDM
                </Button>
                <Button
                  onClick={() => navigate(`/DataValidation?project=${projectId}`)}
                  variant="outline"
                >
                  Validate Data
                </Button>
                <Button
                  onClick={() => navigate(`/SpeciesReportGenerator?project=${projectId}`)}
                  variant="outline"
                >
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="sdm-runs" className="space-y-4">
            {sdmRuns.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-slate-500">
                  No models yet. <br />
                  <Button
                    onClick={() => navigate(`/SDMPipeline?project=${projectId}`)}
                    className="mt-4 bg-bangor-red hover:bg-bangor-red/90"
                  >
                    Run Your First Model
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sdmRuns.map(run => (
                  <Card
                    key={run.id}
                    className="cursor-pointer hover:border-bangor-red hover:shadow-md transition-all"
                    onClick={() => setSelectedRun(run)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{run.name}</CardTitle>
                          <p className="text-sm text-slate-600 mt-1">
                            Species: {run.species_names?.join(', ')}
                          </p>
                        </div>
                        <Badge
                          className={
                            run.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : run.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }
                        >
                          {run.status}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}

            {/* Comments on Selected Run */}
            {selectedRun && (
              <div className="mt-6">
                <h3 className="font-semibold mb-4">
                  Discussion: {selectedRun.name}
                </h3>
                <WorkspaceComments
                  projectId={projectId}
                  sdmRunId={selectedRun.id}
                />
              </div>
            )}
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments">
            <WorkspaceComments projectId={projectId} />
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team">
            {isEditor ? (
              <WorkspaceTeamManager projectId={projectId} />
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-slate-500">
                  Only project editors can manage team members
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}