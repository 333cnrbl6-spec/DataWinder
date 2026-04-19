import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, UserPlus, Shield, Eye, Trash2, Loader2, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteMessage, setInviteMessage] = useState('');
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch current user
  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  // Fetch project
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () =>
      base44.entities.Project.filter({ id: projectId }).then(p => p[0]),
    enabled: !!projectId
  });

  // Fetch pending invitations
  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['pending-invites', projectId],
    queryFn: () =>
      base44.entities.TeamInvitation.filter(
        { project_id: projectId, status: 'pending' },
        '-created_date',
        50
      ),
    enabled: !!projectId
  });

  // Fetch user's pending invitations
  const { data: userPendingInvites = [] } = useQuery({
    queryKey: ['user-pending-invites', currentUser?.email],
    queryFn: () =>
      base44.entities.TeamInvitation.filter(
        { invitee_email: currentUser.email, status: 'pending' },
        '-created_date',
        50
      ),
    enabled: !!currentUser?.email
  });

  // Send invite mutation
  const sendInviteMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke('sendTeamInvite', {
        project_id: projectId,
        invitee_email: inviteeEmail,
        invited_role: inviteRole,
        message: inviteMessage
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites', projectId] });
      setInviteeEmail('');
      setInviteRole('viewer');
      setInviteMessage('');
    }
  });

  // Respond to invite mutation
  const respondInviteMutation = useMutation({
    mutationFn: ({ invitationId, response }) =>
      base44.functions.invoke('respondToTeamInvite', {
        invitation_id: invitationId,
        response
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    }
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: ({ memberEmail, newRole }) =>
      base44.functions.invoke('updateMemberPermission', {
        project_id: projectId,
        member_email: memberEmail,
        new_role: newRole
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (memberEmail) =>
      base44.functions.invoke('removeMember', {
        project_id: projectId,
        member_email: memberEmail
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    }
  });

  const isProjectOwner = currentUser && project && project.owner_email === currentUser.email;
  const isEditor = currentUser && project?.team_members?.some(m => m.email === currentUser.email && m.role === 'editor');
  const canManage = isProjectOwner || isEditor;

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="text-center text-slate-600">Project not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">{project.title}</h1>
          <p className="text-slate-600 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Workspace Collaboration
          </p>
        </div>

        {/* Pending Invitations for Current User */}
        {userPendingInvites.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base">Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {userPendingInvites.map(invite => (
                <div key={invite.id} className="flex items-start justify-between p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{invite.project_name}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      Invited by {invite.inviter_name} • {invite.invited_role}
                    </div>
                    {invite.message && (
                      <div className="text-xs text-slate-600 italic mt-2">"{invite.message}"</div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() =>
                        respondInviteMutation.mutate({
                          invitationId: invite.id,
                          response: 'accepted'
                        })
                      }
                      disabled={respondInviteMutation.isPending}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        respondInviteMutation.mutate({
                          invitationId: invite.id,
                          response: 'declined'
                        })
                      }
                      disabled={respondInviteMutation.isPending}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList>
            <TabsTrigger value="members">Team Members</TabsTrigger>
            <TabsTrigger value="invites">Pending Invites</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Project Team ({(project.team_members || []).length + 1})
                </CardTitle>
                <CardDescription>Manage team members and their access levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Project Owner */}
                <div className="p-4 rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {project.owner_name}
                        <Badge className="bg-slate-900">Owner</Badge>
                        {currentUser?.email === project.owner_email && (
                          <Badge variant="outline" className="bg-blue-50">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">{project.owner_email}</div>
                    </div>
                    <Shield className="w-5 h-5 text-slate-400" />
                  </div>
                </div>

                {/* Team Members */}
                {project.team_members && project.team_members.length > 0 ? (
                  <div className="space-y-2">
                    {project.team_members.map(member => (
                      <div key={member.email} className="p-4 rounded-lg border border-slate-200 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {member.name}
                            <Badge variant="outline" className="text-xs">
                              {member.role === 'editor' ? (
                                <>
                                  <Shield className="w-3 h-3 mr-1" />
                                  Editor
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3 mr-1" />
                                  Viewer
                                </>
                              )}
                            </Badge>
                            {currentUser?.email === member.email && (
                              <Badge variant="outline" className="bg-blue-50">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            {member.email} • Added {format(new Date(member.added_date), 'PP')}
                          </div>
                        </div>
                        {isProjectOwner && currentUser?.email !== member.email && (
                          <div className="flex gap-2 ml-4">
                            <Select
                              value={member.role}
                              onValueChange={(value) =>
                                updatePermissionMutation.mutate({
                                  memberEmail: member.email,
                                  newRole: value
                                })
                              }
                              disabled={updatePermissionMutation.isPending}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={removeMemberMutation.isPending}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Remove {member.name} from this project? They will lose access.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogAction
                                  onClick={() =>
                                    removeMemberMutation.mutate(member.email)
                                  }
                                >
                                  Remove
                                </AlertDialogAction>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 italic">No team members yet</p>
                )}
              </CardContent>
            </Card>

            {/* Invite Section */}
            {canManage && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Invite Team Member
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-900">Email Address</label>
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteeEmail}
                      onChange={(e) => setInviteeEmail(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-900">Role</label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor (can modify data)</SelectItem>
                        <SelectItem value="viewer">Viewer (read-only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-900">Message (optional)</label>
                    <Input
                      placeholder="Add a personal message..."
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <Button
                    onClick={() => sendInviteMutation.mutate()}
                    disabled={sendInviteMutation.isPending || !inviteeEmail}
                    className="w-full"
                  >
                    {sendInviteMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites" className="space-y-6">
            {canManage ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pending Invitations</CardTitle>
                  <CardDescription>Manage outstanding team invitations</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingInvites.length === 0 ? (
                    <p className="text-sm text-slate-600 italic">No pending invitations</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingInvites.map(invite => (
                        <div key={invite.id} className="p-4 rounded-lg border border-slate-200 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{invite.invitee_email}</div>
                            <div className="text-xs text-slate-600 mt-1 space-y-1">
                              <div>Invited by {invite.inviter_name}</div>
                              <div>Role: {invite.invited_role}</div>
                              <div>Sent {format(new Date(invite.invited_at), 'PP')}</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                            Pending
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Only editors and project owners can view pending invitations</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Project Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-600">Species</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {project.species_ids?.length || 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-600">Occurrences</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {project.occurrence_ids?.length || 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-600">SDM Runs</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {project.sdm_run_ids?.length || 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-600">Team Members</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {(project.team_members?.length || 0) + 1}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}