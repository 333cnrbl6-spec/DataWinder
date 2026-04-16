import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Users, CheckCircle2, Clock } from 'lucide-react';
import BoardMemberCard from './BoardMemberCard';

export default function BoardMeetingView({ meetingId }) {
  const [meeting, setMeeting] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const meetingData = await base44.entities.BoardMeeting.list();
        const foundMeeting = meetingData.find(m => m.id === meetingId);
        if (foundMeeting) setMeeting(foundMeeting);

        const memberData = await base44.entities.BoardMember.list();
        setMembers(memberData.filter(m => m.active));
      } catch (error) {
        console.error('Error loading board data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [meetingId]);

  if (loading) {
    return <div className="p-4 text-center text-slate-500">Loading board meeting...</div>;
  }

  if (!meeting) {
    return <div className="p-4 text-center text-red-500">Meeting not found</div>;
  }

  const attendingMembers = members.filter(m => meeting.attendees?.includes(m.member_name));

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="border-b-2 border-bangor-red/20 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-bangor-red">{meeting.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              {new Date(meeting.meeting_date).toLocaleString()}
              <Badge className={meeting.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                {meeting.status}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-slate-500">Called by: {meeting.called_by}</p>
        </div>
      </div>

      <Tabs defaultValue="attendees" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="attendees" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Board Members
          </TabsTrigger>
          <TabsTrigger value="discussion" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Discussion
          </TabsTrigger>
          <TabsTrigger value="decisions" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Decisions
          </TabsTrigger>
        </TabsList>

        {/* Attendees Tab */}
        <TabsContent value="attendees" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attendingMembers.map((member) => (
              <BoardMemberCard key={member.id} member={member} />
            ))}
          </div>
        </TabsContent>

        {/* Discussion Tab */}
        <TabsContent value="discussion" className="space-y-4">
          {meeting.discussion_threads?.map((thread, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-base">{thread.agenda_item}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {thread.messages?.map((msg, midx) => (
                  <div key={midx} className="border-l-2 border-bangor-red/30 pl-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-bangor-red">{msg.from}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{msg.content}</p>
                    {msg.recommendation && (
                      <p className="text-xs text-slate-600 mt-1 italic">
                        Recommendation: {msg.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Decisions Tab */}
        <TabsContent value="decisions" className="space-y-4">
          {meeting.decisions?.length > 0 ? (
            meeting.decisions.map((dec, idx) => (
              <Card key={idx} className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-base">{dec.item}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Decision:</strong> {dec.decision}</p>
                  <p><strong>Owner:</strong> {dec.implementation_owner}</p>
                  <p><strong>Deadline:</strong> {dec.deadline}</p>
                  <p><strong>Voted by:</strong> {dec.voted_by?.join(', ')}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-slate-500 text-sm">No decisions recorded yet.</p>
          )}
        </TabsContent>
      </Tabs>

      {meeting.notes && (
        <Card className="bg-slate-50">
          <CardHeader>
            <CardTitle className="text-base">Meeting Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{meeting.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}