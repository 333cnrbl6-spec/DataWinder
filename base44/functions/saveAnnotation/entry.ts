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
      annotation_type,
      geometry,
      notes,
      suitability_override,
      latitude,
      longitude,
      severity
    } = await req.json();

    if (!sdm_run_id || !annotation_type || !geometry) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get SDM run to link annotation
    const sdmRun = await base44.entities.SDMRun.filter({ id: sdm_run_id }).then(r => r[0]);
    if (!sdmRun) {
      return Response.json({ error: 'SDM run not found' }, { status: 404 });
    }

    // Create annotation record
    const annotation = await base44.entities.SDMAnnotation.create({
      sdm_run_id,
      species_id: sdmRun.species_ids?.[0] || 'unknown',
      species_name: sdmRun.species_names?.[0] || 'Unknown',
      annotation_type,
      severity: severity || 'info',
      latitude: latitude || 0,
      longitude: longitude || 0,
      title: `${annotation_type} - ${new Date().toLocaleDateString()}`,
      content: notes || '',
      created_by: user.email,
      created_by_name: user.full_name || user.email,
      resolved: false,
      rerun_parameters: suitability_override ? { suitability_override } : undefined
    });

    return Response.json({ 
      success: true, 
      annotation_id: annotation.id,
      message: 'Annotation saved successfully'
    });
  } catch (error) {
    console.error('Save annotation error:', error);
    return Response.json(
      { error: error.message || 'Failed to save annotation' },
      { status: 500 }
    );
  }
});