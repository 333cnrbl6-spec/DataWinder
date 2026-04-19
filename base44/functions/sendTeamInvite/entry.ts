import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, invitee_email, invited_role, message } = await req.json();

    if (!project_id || !invitee_email) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch project to verify ownership/editor access
    const projects = await base44.entities.Project.filter({ id: project_id });
    if (!projects || projects.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projects[0];

    // Check if user is project owner or has editor role
    const isOwner = project.owner_email === user.email;
    const isMember = project.team_members?.some(m => m.email === user.email && m.role === 'editor');

    if (!isOwner && !isMember) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if invitee is already a member
    if (project.team_members?.some(m => m.email === invitee_email)) {
      return Response.json({ error: 'User is already a member of this project' }, { status: 400 });
    }

    // Create invitation
    const invitation = await base44.entities.TeamInvitation.create({
      project_id,
      project_name: project.title,
      inviter_email: user.email,
      inviter_name: user.full_name,
      invitee_email,
      invited_role: invited_role || 'viewer',
      message,
      invited_at: new Date().toISOString(),
      status: 'pending'
    });

    // Send notification email
    try {
      await base44.integrations.Core.SendEmail({
        to: invitee_email,
        subject: `You've been invited to collaborate on "${project.title}"`,
        body: `${user.full_name} has invited you to collaborate on the DataWinder project "${project.title}" with ${invited_role} access.\n\n${message ? `Message: ${message}\n\n` : ''}Please log in to accept or decline this invitation.`
      });
    } catch (emailError) {
      console.warn('Email notification failed:', emailError.message);
    }

    return Response.json({
      success: true,
      invitation_id: invitation.id,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    console.error('Invite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});