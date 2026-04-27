import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, member_email, new_role } = await req.json();

    if (!project_id || !member_email || !new_role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user owns the project
    const project = await base44.entities.Project.get(project_id);
    if (project.owner_email !== user.email) {
      return Response.json({ error: 'Only project owner can update permissions' }, { status: 403 });
    }

    // Update team member role
    const updatedTeam = (project.team_members || []).map(member => {
      if (member.email === member_email) {
        return { ...member, role: new_role };
      }
      return member;
    });

    await base44.entities.Project.update(project_id, {
      team_members: updatedTeam,
    });

    // Notify member
    await base44.integrations.Core.SendEmail({
      to: member_email,
      subject: `Your permissions have been updated on "${project.title}"`,
      body: `Your role on the "${project.title}" project has been changed to: ${new_role === 'editor' ? 'Editor' : 'Viewer'}`,
    });

    return Response.json({
      success: true,
      message: `${member_email}'s permissions updated to ${new_role}`,
    });

  } catch (error) {
    console.error('Update permission error:', error);
    return Response.json({
      error: 'Failed to update permissions',
      details: error.message,
    }, { status: 500 });
  }
});