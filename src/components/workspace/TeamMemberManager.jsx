import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Trash2, Plus, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function TeamMemberManager({ projectId, projectTitle, isOwner }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteMessage, setInviteMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      await base44.functions.invoke('sendTeamInvite', {
        project_id: projectId,
        project_name: projectTitle,
        invitee_email: inviteEmail.trim(),
        invited_role: inviteRole,
        message: inviteMessage,
      });

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteMessage('');
      setInviteRole('viewer');
    } catch (error) {
      console.error('Invite error:', error);
      toast.error('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {isOwner && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Invite Team Member
              </label>
              <Input
                type="email"
                placeholder="researcher@university.edu"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mb-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Role
              </label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor — Can edit observations & reports</SelectItem>
                  <SelectItem value="viewer">Viewer — Read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Optional Message
              </label>
              <textarea
                placeholder="Tell them why you're inviting them..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none h-20"
              />
            </div>

            <Button
              onClick={handleSendInvite}
              disabled={loading || !inviteEmail.trim()}
              className="w-full bg-bangor-red hover:bg-bangor-red/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        )}

        {/* Team Members List */}
        <div>
          <h3 className="font-medium text-slate-900 mb-3">Active Members</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* Members will be populated by parent component */}
            <p className="text-sm text-slate-500 py-4 text-center">
              Team members display here
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}