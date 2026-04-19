import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, member_email, new_role } = await req.json();

    if (!project_id || !member_email || !['editor', 'viewer'].includes(new_role)) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Fetch project
    const projects = await base44.entities.Project.filter({ id: project_id });
    if (!projects || projects.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projects[0];

    // Verify user is owner
    if (project.owner_email !== user.email) {
      return Response.json({ error: 'Only project owner can modify permissions' }, { status: 403 });
    }

    // Cannot remove owner
    if (member_email === project.owner_email) {
      return Response.json({ error: 'Cannot modify owner permissions' }, { status: 400 });
    }

    // Update member role
    const updatedMembers = (project.team_members || []).map(m =>
      m.email === member_email ? { ...m, role: new_role } : m
    );

    await base44.entities.Project.update(project_id, {
      team_members: updatedMembers
    });

    return Response.json({
      success: true,
      message: `Member role updated to ${new_role}`
    });
  } catch (error) {
    console.error('Permission update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});