import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, entity_id, entity_name, snapshot, changed_fields, change_summary, change_reason } = await req.json();

    // Validate input
    if (!entity_type || !entity_id || !snapshot) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get previous versions to increment version number
    const previousVersions = await base44.entities.RecordVersion.filter({
      entity_type,
      entity_id
    }, '-version_number', 1);

    const nextVersionNumber = previousVersions.length > 0 ? previousVersions[0].version_number + 1 : 1;

    // Mark previous version as not current
    if (previousVersions.length > 0) {
      await base44.entities.RecordVersion.update(previousVersions[0].id, { is_current: false });
    }

    // Create new version record
    const versionRecord = await base44.entities.RecordVersion.create({
      entity_type,
      entity_id,
      entity_name,
      version_number: nextVersionNumber,
      snapshot,
      changed_fields: changed_fields || [],
      change_summary: change_summary || {},
      modified_by: user.email,
      modified_by_name: user.full_name,
      version_timestamp: new Date().toISOString(),
      change_reason: change_reason || '',
      is_current: true
    });

    return Response.json({
      success: true,
      version_id: versionRecord.id,
      version_number: nextVersionNumber,
      timestamp: versionRecord.version_timestamp
    });
  } catch (error) {
    console.error('Error creating version:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});