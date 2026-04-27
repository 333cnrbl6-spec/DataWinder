import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, member_email } = await req.json();

    if (!project_id || !member_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user owns the project
    const project = await base44.entities.Project.get(project_id);
    if (project.owner_email !== user.email) {
      return Response.json({ error: 'Only project owner can remove members' }, { status: 403 });
    }

    // Remove member from team
    const updatedTeam = (project.team_members || []).filter(
      member => member.email !== member_email
    );

    await base44.entities.Project.update(project_id, {
      team_members: updatedTeam,
    });

    // Notify removed member
    await base44.integrations.Core.SendEmail({
      to: member_email,
      subject: `You've been removed from the "${project.title}" project`,
      body: `You are no longer a member of the "${project.title}" project on DataWinder. You no longer have access to project data.`,
    });

    return Response.json({
      success: true,
      message: `${member_email} has been removed from the project`,
    });

  } catch (error) {
    console.error('Remove member error:', error);
    return Response.json({
      error: 'Failed to remove member',
      details: error.message,
    }, { status: 500 });
  }
});