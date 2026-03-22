import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Called by entity automation when a new Species record is created
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const { event, data } = body;

  if (event?.type !== 'create') {
    return Response.json({ skipped: true });
  }

  const species_id = event.entity_id;
  if (!species_id) return Response.json({ error: 'No entity_id' }, { status: 400 });

  // Invoke the main suggestion function as service role
  try {
    const result = await base44.asServiceRole.functions.invoke('suggestSpeciesFields', { species_id });
    console.log('Auto-suggest result:', JSON.stringify(result));
    return Response.json({ success: true, result });
  } catch (e) {
    console.error('Auto-suggest error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
});