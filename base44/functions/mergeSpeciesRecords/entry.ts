import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { masterId, duplicateIds, mergedData } = await req.json();

    if (!masterId || !duplicateIds || duplicateIds.length === 0) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Update master record with merged data
    await base44.asServiceRole.entities.Species.update(masterId, mergedData);

    // Delete duplicate records
    for (const dupId of duplicateIds) {
      await base44.asServiceRole.entities.Species.delete(dupId);
    }

    return Response.json({
      status: 'success',
      message: `Merged ${duplicateIds.length} duplicate records into master record`,
      masterId
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});