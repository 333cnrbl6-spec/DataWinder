import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkspaceTeamManager({ projectId }) {
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const project = await base44.entities.Project.get(projectId);
      setMembers(project.team_members || []);
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;

    setLoading(true);
    try {
      const project = await base44.entities.Project.get(projectId);
      const newMember = {
        email: inviteEmail.toLowerCase(),
        name: inviteEmail.split('@')[0],
        role: inviteRole,
        added_date: new Date().toISOString()
      };

      // Add to project team members
      const updatedMembers = [
        ...project.team_members || [],
        newMember
      ];

      await base44.entities.Project.update(projectId, {
        team_members: updatedMembers
      });

      // Create team invitation record
      await base44.entities.TeamInvitation.create({
        project_id: projectId,
        project_name: project.title,
        inviter_email: (await base44.auth.me()).email,
        inviter_name: (await base44.auth.me()).full_name,
        invitee_email: inviteEmail.toLowerCase(),
        invited_role: inviteRole,
        status: 'pending',
        invited_at: new Date().toISOString()
      });

      setMembers(updatedMembers);
      setInviteEmail('');
      toast.success(`Invitation sent to ${inviteEmail}`);
    } catch (error) {
      console.error('Failed to invite member:', error);
      toast.error('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (email) => {
    try {
      const updatedMembers = members.filter(m => m.email !== email);
      await base44.entities.Project.update(projectId, {
        team_members: updatedMembers
      });
      setMembers(updatedMembers);
      toast.success('Member removed');
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };

  const roleColors = {
    editor: 'bg-blue-100 text-blue-800',
    viewer: 'bg-slate-100 text-slate-800'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invite Form */}
        <div className="flex gap-2 pb-4 border-b">
          <Input
            placeholder="colleague@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            type="email"
            disabled={loading}
            className="text-sm"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-md text-sm"
            disabled={loading}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <Button
            onClick={handleInviteMember}
            disabled={loading || !inviteEmail.trim()}
            className="bg-bangor-red hover:bg-bangor-red/90 gap-1"
          >
            <UserPlus className="w-4 h-4" />
            Invite
          </Button>
        </div>

        {/* Members List */}
        <div className="space-y-2">
          {members.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No team members yet</p>
          ) : (
            members.map(member => (
              <div
                key={member.email}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
              >
                <div>
                  <p className="font-medium text-sm text-slate-900">
                    {member.name}
                  </p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={roleColors[member.role]}>
                    {member.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveMember(member.email)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}