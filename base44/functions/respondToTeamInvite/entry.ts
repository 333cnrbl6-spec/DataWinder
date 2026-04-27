import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invitation_id, accept } = await req.json();

    if (!invitation_id || accept === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get invitation
    const invitation = await base44.entities.TeamInvitation.get(invitation_id);

    if (invitation.invitee_email !== user.email) {
      return Response.json({ error: 'This invitation is not for you' }, { status: 403 });
    }

    if (invitation.status !== 'pending') {
      return Response.json({ error: 'This invitation has already been responded to' }, { status: 400 });
    }

    // Update invitation status
    const newStatus = accept ? 'accepted' : 'declined';
    await base44.entities.TeamInvitation.update(invitation_id, {
      status: newStatus,
      responded_at: new Date().toISOString(),
    });

    if (accept) {
      // Add user to project team
      const project = await base44.entities.Project.get(invitation.project_id);
      const updatedTeam = [
        ...(project.team_members || []),
        {
          email: user.email,
          name: user.full_name,
          role: invitation.invited_role,
          added_date: new Date().toISOString(),
        },
      ];

      await base44.entities.Project.update(invitation.project_id, {
        team_members: updatedTeam,
      });

      // Notify inviter
      await base44.integrations.Core.SendEmail({
        to: invitation.inviter_email,
        subject: `${user.full_name} accepted your project invitation`,
        body: `${user.full_name} has accepted your invitation to collaborate on "${invitation.project_name}".`,
      });

      return Response.json({
        success: true,
        message: `You've joined the ${invitation.project_name} project!`,
      });
    } else {
      // Notify inviter of decline
      await base44.integrations.Core.SendEmail({
        to: invitation.inviter_email,
        subject: `${user.full_name} declined your project invitation`,
        body: `${user.full_name} has declined your invitation to collaborate on "${invitation.project_name}".`,
      });

      return Response.json({
        success: true,
        message: 'You declined the invitation.',
      });
    }

  } catch (error) {
    console.error('Respond to invite error:', error);
    return Response.json({
      error: 'Failed to respond to invitation',
      details: error.message,
    }, { status: 500 });
  }
});