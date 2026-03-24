import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { import_log_id } = await req.json();
    if (!import_log_id) return Response.json({ error: 'Missing import_log_id' }, { status: 400 });

    // Fetch the import log
    const logs = await base44.entities.ImportLog.filter({ id: import_log_id });
    const log = logs[0];
    if (!log) return Response.json({ error: 'Import log not found' }, { status: 404 });
    if (log.status === 'reverted') return Response.json({ error: 'This import has already been reverted' }, { status: 400 });

    const { entity_type, record_ids } = log;
    if (!entity_type) return Response.json({ error: 'Import log has no entity_type' }, { status: 400 });
    if (!record_ids || record_ids.length === 0) {
      return Response.json({ error: 'No record IDs stored for this import — cannot revert automatically.' }, { status: 400 });
    }

    const entity = base44.entities[entity_type];
    if (!entity) return Response.json({ error: `Unknown entity type: ${entity_type}` }, { status: 400 });

    // Delete each record — count successes and failures
    let deleted = 0;
    let failed = 0;
    for (const id of record_ids) {
      try {
        await entity.delete(id);
        deleted++;
      } catch (e) {
        console.warn(`Failed to delete ${entity_type} record ${id}: ${e.message}`);
        failed++;
      }
    }

    // Mark the import log as reverted
    await base44.entities.ImportLog.update(import_log_id, {
      status: 'reverted',
      reverted_at: new Date().toISOString(),
      reverted_by: user.email,
    });

    console.log(`Revert complete: ${deleted} deleted, ${failed} failed for import ${import_log_id}`);

    return Response.json({
      status: 'success',
      deleted,
      failed,
      message: failed > 0
        ? `Reverted ${deleted} records. ${failed} records could not be deleted (may have already been removed).`
        : `Successfully reverted all ${deleted} records.`,
    });

  } catch (error) {
    console.error('revertImport error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});