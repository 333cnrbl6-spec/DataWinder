import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { run_id, species_name, parameters, layer_names, occurrence_count } = body;

    if (!run_id) {
      return Response.json({ error: 'run_id is required' }, { status: 400 });
    }

    // Update status to submitted and record timestamp
    await base44.asServiceRole.entities.MaxentRun.update(run_id, {
      status: 'submitted',
      notes: `Submitted at ${new Date().toISOString()} by ${user.email}. Awaiting external MAXENT service connection.\n\nSpecies: ${species_name}\nOccurrence records: ${occurrence_count}\nEnvironmental layers: ${(layer_names || []).join(', ')}\n\nTo connect a real MAXENT service, replace the placeholder block in this function with your API call.`,
    });

    // ─── EXTERNAL MAXENT SERVICE HOOK ────────────────────────────────────────
    // Replace this block when connecting to a real MAXENT service:
    //
    // const MAXENT_API_URL = Deno.env.get('MAXENT_API_URL');
    // const MAXENT_API_KEY = Deno.env.get('MAXENT_API_KEY');
    //
    // const response = await fetch(`${MAXENT_API_URL}/runs`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${MAXENT_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     species: species_name,
    //     occurrence_csv_url: body.occurrence_csv_url,
    //     layer_names,
    //     parameters,
    //   }),
    // });
    //
    // const result = await response.json();
    //
    // await base44.asServiceRole.entities.MaxentRun.update(run_id, {
    //   status: 'running',
    //   external_job_id: result.job_id,
    // });
    // ─────────────────────────────────────────────────────────────────────────

    return Response.json({
      status: 'success',
      message: `Model run saved (ID: ${run_id}). Connect an external MAXENT service to process it.`,
      run_id,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});