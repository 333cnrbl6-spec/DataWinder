import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { species_list, layer_ids, layer_names, parameters, batch_name } = body;

    if (!species_list || !Array.isArray(species_list) || species_list.length === 0) {
      return Response.json({ error: 'species_list is required and must be a non-empty array' }, { status: 400 });
    }

    const MAXENT_API_URL = Deno.env.get('MAXENT_API_URL');
    const MAXENT_API_KEY = Deno.env.get('MAXENT_API_KEY');

    const results = [];

    for (const sp of species_list) {
      const runName = batch_name
        ? `[Batch: ${batch_name}] ${sp.scientific_name}`
        : `${sp.scientific_name} — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

      const occurrenceCount = (sp.observation_count || 0) + (sp.gbif_occurrence_count || 0);

      // Create the run record
      const run = await base44.asServiceRole.entities.MaxentRun.create({
        name: runName,
        species_id: sp.id,
        species_name: sp.scientific_name,
        climate_dataset_ids: layer_ids || [],
        climate_dataset_names: layer_names || [],
        occurrence_count: occurrenceCount,
        parameters: parameters || {},
        status: 'submitted',
        notes: `Batch submitted at ${new Date().toISOString()} by ${user.email}.`,
      });

      // Submit to external MAXENT service if configured
      if (MAXENT_API_URL && MAXENT_API_KEY) {
        try {
          const response = await fetch(`${MAXENT_API_URL}/runs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${MAXENT_API_KEY}`,
            },
            body: JSON.stringify({
              species: sp.scientific_name,
              occurrence_csv_url: sp.occurrence_csv_url || null,
              layer_names: layer_names || [],
              parameters: parameters || {},
            }),
          });

          if (response.ok) {
            const result = await response.json();
            const externalJobId = result.job_id || result.id || result.run_id;
            await base44.asServiceRole.entities.MaxentRun.update(run.id, {
              status: 'running',
              external_job_id: externalJobId,
              notes: `Batch job submitted at ${new Date().toISOString()}. External job ID: ${externalJobId}`,
            });
            results.push({ run_id: run.id, species: sp.scientific_name, status: 'running', external_job_id: externalJobId });
          } else {
            results.push({ run_id: run.id, species: sp.scientific_name, status: 'submitted', note: 'External submission failed, saved locally' });
          }
        } catch {
          results.push({ run_id: run.id, species: sp.scientific_name, status: 'submitted', note: 'External submission error, saved locally' });
        }
      } else {
        results.push({ run_id: run.id, species: sp.scientific_name, status: 'submitted' });
      }
    }

    return Response.json({ success: true, total: results.length, results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});