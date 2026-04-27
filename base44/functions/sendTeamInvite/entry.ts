import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, project_name, invitee_email, invited_role, message } = await req.json();

    if (!project_id || !invitee_email || !invited_role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user owns the project
    const project = await base44.entities.Project.get(project_id);
    if (project.owner_email !== user.email) {
      return Response.json({ error: 'Only project owner can invite members' }, { status: 403 });
    }

    // Create invitation record
    const invitation = await base44.entities.TeamInvitation.create({
      project_id,
      project_name,
      inviter_email: user.email,
      inviter_name: user.full_name,
      invitee_email: invitee_email.toLowerCase(),
      invited_role,
      message: message || null,
      status: 'pending',
      invited_at: new Date().toISOString(),
    });

    // Send email notification
    await base44.integrations.Core.SendEmail({
      to: invitee_email,
      subject: `You've been invited to collaborate on "${project_name}" — DataWinder`,
      body: `
Hi there,

${user.full_name} has invited you to collaborate on the "${project_name}" project on DataWinder.

Your role: ${invited_role === 'editor' ? 'Editor' : 'Viewer'}

${message ? `Message from ${user.full_name}:\n"${message}"\n` : ''}

You can accept or decline this invitation in your DataWinder dashboard.

Log in here: [APP_URL]

Best regards,
DataWinder Team
      `,
    });

    return Response.json({
      success: true,
      invitation_id: invitation.id,
      message: `Invitation sent to ${invitee_email}`,
    });

  } catch (error) {
    console.error('Team invite error:', error);
    return Response.json({
      error: 'Failed to send invitation',
      details: error.message,
    }, { status: 500 });
  }
});