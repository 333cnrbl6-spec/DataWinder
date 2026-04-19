import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invitation_id, response } = await req.json();

    if (!invitation_id || !['accepted', 'declined'].includes(response)) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Fetch invitation
    const invitations = await base44.entities.TeamInvitation.filter({ id: invitation_id });
    if (!invitations || invitations.length === 0) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const invitation = invitations[0];

    // Verify invitation is for current user
    if (invitation.invitee_email !== user.email) {
      return Response.json({ error: 'This invitation is not for you' }, { status: 403 });
    }

    // Check if already responded
    if (invitation.status !== 'pending') {
      return Response.json({ error: 'Invitation already responded to' }, { status: 400 });
    }

    // Update invitation status
    await base44.entities.TeamInvitation.update(invitation_id, {
      status: response,
      responded_at: new Date().toISOString()
    });

    // If accepted, add user to project team
    if (response === 'accepted') {
      const project = await base44.entities.Project.filter({ id: invitation.project_id });
      if (project && project.length > 0) {
        const p = project[0];
        const updatedMembers = p.team_members || [];

        // Add new member
        updatedMembers.push({
          email: user.email,
          name: user.full_name,
          role: invitation.invited_role,
          added_date: new Date().toISOString()
        });

        await base44.entities.Project.update(invitation.project_id, {
          team_members: updatedMembers
        });
      }
    }

    return Response.json({
      success: true,
      message: response === 'accepted' ? 'Added to project' : 'Invitation declined'
    });
  } catch (error) {
    console.error('Response error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});