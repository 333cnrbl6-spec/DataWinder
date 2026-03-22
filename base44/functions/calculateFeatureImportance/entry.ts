import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const maxentRunId = body.maxentRunId || body.id;

    if (!maxentRunId) {
      return Response.json({ 
        status: 'error', 
        message: 'maxentRunId is required' 
      }, { status: 400 });
    }

    // Fetch the MaxentRun by ID
    const runs = await base44.entities.MaxentRun.filter(
      { id: maxentRunId },
      null,
      1
    );

    if (!runs || runs.length === 0) {
      return Response.json({ 
        status: 'error', 
        message: 'MaxentRun not found' 
      }, { status: 404 });
    }

    const maxentRun = runs[0];

    // Parse results if they exist
    if (!maxentRun.results || typeof maxentRun.results !== 'object') {
      return Response.json({
        status: 'error',
        message: 'MaxentRun has no model results yet'
      }, { status: 400 });
    }

    const results = maxentRun.results;

    // Extract feature contribution from MaxEnt output
    // MaxEnt provides: permutation importance and gain values
    const featureImportance = [];

    // If results contain variable contributions (from MaxEnt output)
    if (results.variable_contributions && Array.isArray(results.variable_contributions)) {
      results.variable_contributions.forEach(contrib => {
        featureImportance.push({
          variable: contrib.name || contrib.variable,
          permutation_importance: contrib.permutation_importance || 0,
          gain: contrib.gain || 0,
          contribution_percent: contrib.percent_contribution || 0
        });
      });
    }

    // Sort by contribution
    featureImportance.sort((a, b) => 
      (b.contribution_percent || 0) - (a.contribution_percent || 0)
    );

    // Calculate relative importance (normalize to 100%)
    const totalContribution = featureImportance.reduce((sum, f) => 
      sum + (f.contribution_percent || 0), 0
    ) || 100;

    const normalizedImportance = featureImportance.map(f => ({
      ...f,
      relative_importance: totalContribution > 0 
        ? ((f.contribution_percent || 0) / totalContribution * 100).toFixed(1)
        : 0
    }));

    return Response.json({
      status: 'success',
      data: {
        maxent_run_id: maxentRunId,
        species_name: maxentRun.species_name,
        feature_importance: normalizedImportance,
        total_variables: normalizedImportance.length,
        top_3_variables: normalizedImportance.slice(0, 3).map(f => f.variable),
        auc: results.auc || null,
        test_auc: results.test_auc || null
      }
    });
  } catch (error) {
    console.error('Feature importance calculation error:', error);
    return Response.json({ 
      status: 'error', 
      message: error.message 
    }, { status: 500 });
  }
});