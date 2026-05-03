/**
 * SDM VALIDATION TASK MANAGER
 * ===========================
 * Manages creation, assignment, and progress tracking of field validation tasks.
 * Supports real-time updates and team notifications.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, taskId, data } = await req.json();

    if (!action) {
      return Response.json({ error: 'Missing action' }, { status: 400 });
    }

    switch (action) {
      case 'create':
        return await handleCreateTask(base44, user, data);
      
      case 'update':
        return await handleUpdateTask(base44, user, taskId, data);
      
      case 'assign':
        return await handleAssignTask(base44, user, taskId, data);
      
      case 'markProgress':
        return await handleMarkProgress(base44, user, taskId, data);
      
      case 'complete':
        return await handleCompleteTask(base44, user, taskId, data);
      
      case 'list':
        return await handleListTasks(base44, data);
      
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

  } catch (error) {
    console.error('Validation task error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Create new validation task
 */
async function handleCreateTask(base44, user, data) {
  const {
    sdm_run_id,
    project_id,
    species_id,
    species_name,
    grid_bounds,
    center_lat,
    center_lon,
    task_type = 'field_validation',
    priority = 'medium',
    description = '',
    suitability_range
  } = data;

  if (!sdm_run_id || !project_id || !species_id || !grid_bounds) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const task = await base44.entities.SDMValidationTask.create({
      sdm_run_id,
      project_id,
      species_id,
      species_name,
      grid_bounds,
      center_lat: center_lat || (grid_bounds.min_lat + grid_bounds.max_lat) / 2,
      center_lon: center_lon || (grid_bounds.min_lon + grid_bounds.max_lon) / 2,
      task_type,
      priority,
      status: 'open',
      description,
      suitability_range,
      expected_field_visits: data.expected_field_visits || 5,
      created_by_email: user.email,
      created_by_name: user.full_name
    });

    console.log(`✓ Validation task created: ${task.id}`);

    return Response.json({
      success: true,
      taskId: task.id,
      task
    });

  } catch (err) {
    console.error('Failed to create task:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Update task details
 */
async function handleUpdateTask(base44, user, taskId, data) {
  if (!taskId) {
    return Response.json({ error: 'Missing taskId' }, { status: 400 });
  }

  try {
    const task = await base44.entities.SDMValidationTask.filter({ id: taskId });
    
    if (task.length === 0) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const updated = await base44.entities.SDMValidationTask.update(taskId, {
      description: data.description || task[0].description,
      priority: data.priority || task[0].priority,
      expected_field_visits: data.expected_field_visits || task[0].expected_field_visits,
      notes: data.notes || task[0].notes,
      color: data.color || task[0].color
    });

    return Response.json({
      success: true,
      task: updated
    });

  } catch (err) {
    console.error('Failed to update task:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Assign task to team member
 */
async function handleAssignTask(base44, user, taskId, data) {
  const { assignee_email, assignee_name } = data;

  if (!taskId || !assignee_email) {
    return Response.json({ error: 'Missing taskId or assignee_email' }, { status: 400 });
  }

  try {
    const updated = await base44.entities.SDMValidationTask.update(taskId, {
      assigned_to_email: assignee_email,
      assigned_to_name: assignee_name,
      status: 'open',
      assigned_at: new Date().toISOString()
    });

    // Send notification to assignee
    try {
      await base44.integrations.Core.SendEmail({
        to: assignee_email,
        subject: `New Field Validation Task: ${updated.species_name}`,
        body: `You have been assigned a field validation task for ${updated.species_name}.\n\nTask: ${updated.task_type}\nPriority: ${updated.priority}\nExpected field visits: ${updated.expected_field_visits}\n\nDescription: ${updated.description || 'No description provided'}\n\nLog in to the workspace to view details.`
      });
    } catch (e) {
      console.warn('Failed to send assignment email:', e.message);
    }

    console.log(`✓ Task assigned to ${assignee_email}`);

    return Response.json({
      success: true,
      task: updated
    });

  } catch (err) {
    console.error('Failed to assign task:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Update task progress
 */
async function handleMarkProgress(base44, user, taskId, data) {
  const { completed_field_visits, notes } = data;

  if (!taskId) {
    return Response.json({ error: 'Missing taskId' }, { status: 400 });
  }

  try {
    const task = await base44.entities.SDMValidationTask.filter({ id: taskId });
    
    if (task.length === 0) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const currentTask = task[0];
    const newStatus = completed_field_visits >= currentTask.expected_field_visits
      ? 'completed'
      : 'in_progress';

    const updated = await base44.entities.SDMValidationTask.update(taskId, {
      completed_field_visits: completed_field_visits || currentTask.completed_field_visits + 1,
      status: newStatus,
      notes: notes || currentTask.notes,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    });

    console.log(`✓ Task progress updated: ${completed_field_visits}/${currentTask.expected_field_visits}`);

    return Response.json({
      success: true,
      task: updated,
      progress_pct: Math.round((completed_field_visits / currentTask.expected_field_visits) * 100)
    });

  } catch (err) {
    console.error('Failed to update progress:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Mark task as complete
 */
async function handleCompleteTask(base44, user, taskId, data) {
  if (!taskId) {
    return Response.json({ error: 'Missing taskId' }, { status: 400 });
  }

  try {
    const updated = await base44.entities.SDMValidationTask.update(taskId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      notes: data.notes || ''
    });

    console.log(`✓ Task completed: ${taskId}`);

    return Response.json({
      success: true,
      task: updated
    });

  } catch (err) {
    console.error('Failed to complete task:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

/**
 * List tasks for project/SDM run
 */
async function handleListTasks(base44, data) {
  const { project_id, sdm_run_id, status_filter, assigned_to } = data;

  try {
    let query = {};
    if (project_id) query.project_id = project_id;
    if (sdm_run_id) query.sdm_run_id = sdm_run_id;
    if (assigned_to) query.assigned_to_email = assigned_to;

    const tasks = await base44.entities.SDMValidationTask.filter(query);

    const filtered = status_filter
      ? tasks.filter(t => status_filter.includes(t.status))
      : tasks;

    return Response.json({
      success: true,
      count: filtered.length,
      tasks: filtered.sort((a, b) => {
        // Sort by priority and status
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const statusOrder = { in_progress: 0, open: 1, completed: 2, cancelled: 3 };
        
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return statusOrder[a.status] - statusOrder[b.status];
      })
    });

  } catch (err) {
    console.error('Failed to list tasks:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}