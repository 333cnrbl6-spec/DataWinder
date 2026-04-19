import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      sdm_run_id,
      species_id,
      species_name,
      annotation_type,
      severity,
      latitude,
      longitude,
      radius_km,
      title,
      content,
      inconsistency_type,
      rerun_parameters,
      mentions
    } = await req.json();

    if (!sdm_run_id || !species_id || !annotation_type || latitude === undefined || longitude === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return Response.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const annotation = await base44.entities.SDMAnnotation.create({
      sdm_run_id,
      species_id,
      species_name,
      annotation_type,
      severity: severity || 'info',
      latitude,
      longitude,
      radius_km: radius_km || null,
      title,
      content,
      inconsistency_type: inconsistency_type || null,
      rerun_parameters: rerun_parameters || null,
      created_by: user.email,
      created_by_name: user.full_name,
      mentions: mentions || [],
      resolved: false
    });

    return Response.json({
      success: true,
      annotation_id: annotation.id,
      annotation
    });
  } catch (error) {
    console.error('Error creating annotation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});