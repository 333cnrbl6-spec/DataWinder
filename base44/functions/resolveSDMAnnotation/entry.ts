import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { annotation_id, resolution_notes, linked_rerun_id } = await req.json();

    if (!annotation_id) {
      return Response.json({ error: 'annotation_id required' }, { status: 400 });
    }

    const updated = await base44.entities.SDMAnnotation.update(annotation_id, {
      resolved: true,
      resolved_by: user.email,
      resolved_by_name: user.full_name,
      resolution_notes: resolution_notes || '',
      linked_rerun_id: linked_rerun_id || null
    });

    return Response.json({
      success: true,
      annotation: updated
    });
  } catch (error) {
    console.error('Error resolving annotation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});