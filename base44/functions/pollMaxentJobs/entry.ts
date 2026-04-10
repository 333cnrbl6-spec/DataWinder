import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);


    const MAXENT_API_URL = Deno.env.get('MAXENT_API_URL');
    const MAXENT_API_KEY = Deno.env.get('MAXENT_API_KEY');

    if (!MAXENT_API_URL || !MAXENT_API_KEY) {
      return Response.json({ message: 'No MAXENT service configured, skipping poll.' });
    }

    // Fetch all runs currently in 'running' state
    const runningRuns = await base44.asServiceRole.entities.MaxentRun.filter({ status: 'running' });

    if (!runningRuns.length) {
      return Response.json({ message: 'No running jobs to poll.', polled: 0 });
    }

    const updated = [];

    for (const run of runningRuns) {
      if (!run.external_job_id) continue;

      const statusRes = await fetch(`${MAXENT_API_URL}/runs/${run.external_job_id}`, {
        headers: { 'Authorization': `Bearer ${MAXENT_API_KEY}` },
      });

      if (!statusRes.ok) continue;

      const jobData = await statusRes.json();
      const jobStatus = jobData.status; // expected: 'running' | 'completed' | 'failed'

      if (jobStatus === 'completed') {
        // Fetch results
        const resultsRes = await fetch(`${MAXENT_API_URL}/runs/${run.external_job_id}/results`, {
          headers: { 'Authorization': `Bearer ${MAXENT_API_KEY}` },
        });

        const results = resultsRes.ok ? await resultsRes.json() : {};

        await base44.asServiceRole.entities.MaxentRun.update(run.id, {
          status: 'completed',
          results,
          notes: `Completed at ${new Date().toISOString()}.`,
        });
        updated.push({ run_id: run.id, status: 'completed' });

      } else if (jobStatus === 'failed') {
        await base44.asServiceRole.entities.MaxentRun.update(run.id, {
          status: 'failed',
          notes: `Failed at ${new Date().toISOString()}. External message: ${jobData.error || jobData.message || 'unknown'}`,
        });
        updated.push({ run_id: run.id, status: 'failed' });
      }
    }

    return Response.json({ polled: runningRuns.length, updated });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});