import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { version_id } = await req.json();

    if (!version_id) {
      return Response.json({ error: 'version_id required' }, { status: 400 });
    }

    // Fetch the version to revert to
    const targetVersion = await base44.entities.RecordVersion.filter({ id: version_id });
    
    if (!targetVersion || targetVersion.length === 0) {
      return Response.json({ error: 'Version not found' }, { status: 404 });
    }

    const version = targetVersion[0];
    const { entity_type, entity_id, snapshot } = version;

    // Get current record
    let currentEntity;
    if (entity_type === 'Species') {
      const species = await base44.entities.Species.filter({ id: entity_id });
      currentEntity = species[0];
    } else if (entity_type === 'Occurrence') {
      const occ = await base44.entities.OccurrenceNote.filter({ id: entity_id });
      currentEntity = occ[0];
    }

    if (!currentEntity) {
      return Response.json({ error: 'Entity not found' }, { status: 404 });
    }

    // Track what changed
    const changedFields = Object.keys(snapshot).filter(key => currentEntity[key] !== snapshot[key]);
    
    const changeSummary = {};
    changedFields.forEach(field => {
      changeSummary[field] = {
        before: currentEntity[field],
        after: snapshot[field]
      };
    });

    // Create new version for the revert action (captures current state before reverting)
    const revertFromVersion = await base44.entities.RecordVersion.create({
      entity_type,
      entity_id,
      entity_name: version.entity_name,
      version_number: (version.version_number + 1),
      snapshot: currentEntity,
      changed_fields: changedFields,
      change_summary: changeSummary,
      modified_by: user.email,
      modified_by_name: user.full_name,
      version_timestamp: new Date().toISOString(),
      change_reason: `Reverted from version ${version.version_number}`,
      is_current: true
    });

    // Update the actual entity with reverted data
    await base44.entities[entity_type].update(entity_id, snapshot);

    // Mark the reverted-from version as not current
    await base44.entities.RecordVersion.update(version.id, { is_current: false });

    return Response.json({
      success: true,
      message: `Reverted to version ${version.version_number}`,
      new_version_id: revertFromVersion.id,
      revert_version_number: revertFromVersion.version_number
    });
  } catch (error) {
    console.error('Error reverting version:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});