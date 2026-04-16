import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, CheckCircle, Clock, X } from 'lucide-react';

export default function BoardInvitations() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    app_name: '',
    recipient_email: '',
    role: 'Representative',
    expertise: ''
  });

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      const data = await base44.entities.BoardInvite.list('-invited_date', 100);
      setInvites(data);
    } catch (error) {
      console.error('Error loading invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      await base44.functions.invoke('sendBoardInvite', {
        app_name: form.app_name,
        recipient_email: form.recipient_email,
        role: form.role,
        expertise: form.expertise.split(',').map(e => e.trim()).filter(Boolean)
      });

      setForm({ app_name: '', recipient_email: '', role: 'Representative', expertise: '' });
      setFormOpen(false);
      await loadInvites();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'declined':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-slate-500">Loading invitations...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="border-b-2 border-bangor-red/20 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-bangor-red">Board Invitations</h1>
            <p className="text-sm text-slate-600 mt-1">Manage Synergy Flow board membership</p>
          </div>
          <Button
            onClick={() => setFormOpen(!formOpen)}
            className="bg-bangor-red hover:bg-bangor-red/90"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Invite
          </Button>
        </div>
      </div>

      {/* Send Invite Form */}
      {formOpen && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Send Board Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">App Name</label>
                  <Input
                    placeholder="e.g., CaseNarrative, Commercial AI"
                    value={form.app_name}
                    onChange={(e) => setForm({ ...form, app_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Recipient Email</label>
                  <Input
                    type="email"
                    placeholder="representative@company.com"
                    value={form.recipient_email}
                    onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Board Role</label>
                <Input
                  placeholder="e.g., Product Lead, CTO"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Expertise (comma-separated)</label>
                <Textarea
                  placeholder="e.g., Legal Analysis, Commercial Strategy, Tech Leadership"
                  value={form.expertise}
                  onChange={(e) => setForm({ ...form, expertise: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={sending} className="bg-bangor-red">
                  {sending ? 'Sending...' : 'Send Invite'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Invitations List */}
      <div className="space-y-3">
        {invites.length === 0 ? (
          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <p className="text-center text-slate-500">No invitations sent yet.</p>
            </CardContent>
          </Card>
        ) : (
          invites.map((invite) => (
            <Card key={invite.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{invite.app_name}</h3>
                      <Badge className={getStatusColor(invite.status)}>
                        {invite.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{invite.recipient_email}</p>
                    {invite.role && (
                      <p className="text-xs text-slate-500 mb-1">Role: {invite.role}</p>
                    )}
                    {invite.expertise?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {invite.expertise.map((exp, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {exp}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusIcon(invite.status)}
                    <p className="text-xs text-slate-400">
                      {new Date(invite.invited_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Invitation Stats */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-bangor-red">
                {invites.filter(i => i.status === 'pending').length}
              </p>
              <p className="text-xs text-slate-600">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {invites.filter(i => i.status === 'accepted').length}
              </p>
              <p className="text-xs text-slate-600">Accepted</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-600">
                {invites.length}
              </p>
              <p className="text-xs text-slate-600">Total Sent</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}