import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { run_id, species_name, parameters, layer_names, occurrence_count, occurrence_csv_url } = body;

    if (!run_id) {
      return Response.json({ error: 'run_id is required' }, { status: 400 });
    }

    const MAXENT_API_URL = Deno.env.get('MAXENT_API_URL');
    const MAXENT_API_KEY = Deno.env.get('MAXENT_API_KEY');

    if (!MAXENT_API_URL || !MAXENT_API_KEY) {
      // No external service configured — mark as submitted/placeholder
      await base44.asServiceRole.entities.MaxentRun.update(run_id, {
        status: 'submitted',
        notes: `Submitted at ${new Date().toISOString()} by ${user.email}. No external MAXENT service configured (MAXENT_API_URL / MAXENT_API_KEY not set).`,
      });
      return Response.json({ status: 'submitted', message: 'Run saved. Configure MAXENT_API_URL and MAXENT_API_KEY to enable processing.', run_id });
    }

    // Submit job to external MAXENT service
    const response = await fetch(`${MAXENT_API_URL}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAXENT_API_KEY}`,
      },
      body: JSON.stringify({
        species: species_name,
        occurrence_csv_url: occurrence_csv_url || null,
        layer_names: layer_names || [],
        parameters: parameters || {},
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      await base44.asServiceRole.entities.MaxentRun.update(run_id, {
        status: 'failed',
        notes: `Submission failed at ${new Date().toISOString()}: HTTP ${response.status} — ${errText}`,
      });
      return Response.json({ error: `MAXENT service error: ${response.status}`, detail: errText }, { status: 502 });
    }

    const result = await response.json();
    const externalJobId = result.job_id || result.id || result.run_id;

    await base44.asServiceRole.entities.MaxentRun.update(run_id, {
      status: 'running',
      external_job_id: externalJobId,
      notes: `Job submitted at ${new Date().toISOString()} by ${user.email}. External job ID: ${externalJobId}`,
    });

    return Response.json({ status: 'running', run_id, external_job_id: externalJobId });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});