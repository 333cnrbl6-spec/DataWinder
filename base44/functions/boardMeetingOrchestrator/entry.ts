import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, topic, attendees, meeting_id, member, response, recommendation } = await req.json();

    // Create new meeting
    if (action === 'create') {
      const meeting = await base44.asServiceRole.entities.BoardMeeting.create({
        title: topic,
        called_by: user.email,
        meeting_date: new Date().toISOString(),
        attendees: attendees || [],
        status: 'in_progress',
        agenda_items: [],
        discussion_threads: []
      });

      console.log(`Board meeting created: ${meeting.id} - ${topic}`);

      // Notify each attendee (in background)
      for (const attendee of (attendees || [])) {
        try {
          await base44.asServiceRole.functions.invoke('memberResponse', {
            meeting_id: meeting.id,
            member: attendee,
            topic: topic
          });
        } catch (err) {
          console.log(`Notification to ${attendee} queued or failed gracefully`);
        }
      }

      return Response.json({ 
        meeting_id: meeting.id, 
        status: 'meeting_created',
        title: topic,
        attendees: attendees
      });
    }

    // Add member response to discussion thread
    if (action === 'add_response') {
      const meetingData = await base44.asServiceRole.entities.BoardMeeting.list({ id: meeting_id });
      if (!meetingData || meetingData.length === 0) {
        return Response.json({ error: 'Meeting not found' }, { status: 404 });
      }

      const meeting = meetingData[0];
      const threads = meeting.discussion_threads || [];
      const agendaItem = topic || 'General Discussion';
      
      let thread = threads.find(t => t.agenda_item === agendaItem);
      if (!thread) {
        thread = { agenda_item: agendaItem, messages: [], decision: null, action_items: [] };
        threads.push(thread);
      }

      thread.messages.push({
        from: member,
        timestamp: new Date().toISOString(),
        content: response,
        perspective: member,
        recommendation: recommendation || ''
      });

      await base44.asServiceRole.entities.BoardMeeting.update(meeting_id, {
        discussion_threads: threads
      });

      console.log(`Response from ${member} recorded on "${agendaItem}"`);
      return Response.json({ status: 'response_recorded', member, topic: agendaItem });
    }

    // Conclude meeting and record decisions
    if (action === 'conclude') {
      const { decisions: decisionsPayload, notes } = await req.json();
      
      await base44.asServiceRole.entities.BoardMeeting.update(meeting_id, {
        status: 'concluded',
        decisions: decisionsPayload || [],
        notes: notes || ''
      });

      console.log(`Board meeting concluded: ${meeting_id}`);
      return Response.json({ status: 'meeting_concluded', meeting_id });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('boardMeetingOrchestrator error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});