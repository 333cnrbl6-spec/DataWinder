import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { maxentRunId, validateAll } = body;

    if (!maxentRunId && !validateAll) {
      return Response.json({ 
        error: 'maxentRunId or validateAll required' 
      }, { status: 400 });
    }

    // Validation rules
    const RULES = {
      auc: { min: 0, max: 1, required: true },
      test_auc: { min: 0, max: 1, required: true },
      occurrence_count: { min: 10, required: true },
      species_name: { required: true, type: 'string' },
      variable_contributions: { required: false, type: 'array' }
    };

    const validateRun = (run) => {
      const errors = [];
      const warnings = [];

      // Check required fields
      if (!run.results) {
        errors.push('Missing results object');
        return { errors, warnings, valid: false };
      }

      const results = run.results;

      // AUC validation
      if (RULES.auc.required && results.auc === undefined) {
        errors.push('AUC is required');
      } else if (results.auc !== undefined && (results.auc < RULES.auc.min || results.auc > RULES.auc.max)) {
        errors.push(`AUC ${results.auc} out of range [0-1]`);
      }

      if (results.test_auc !== undefined && (results.test_auc < RULES.test_auc.min || results.test_auc > RULES.test_auc.max)) {
        errors.push(`Test AUC ${results.test_auc} out of range [0-1]`);
      }

      // Occurrence count
      if (RULES.occurrence_count.required && (!run.occurrence_count || run.occurrence_count < RULES.occurrence_count.min)) {
        errors.push(`Occurrence count (${run.occurrence_count}) below minimum ${RULES.occurrence_count.min}`);
      }

      // Species name
      if (RULES.species_name.required && !run.species_name) {
        errors.push('Species name is required');
      }

      // Variable contributions validation
      if (results.variable_contributions && Array.isArray(results.variable_contributions)) {
        const contributions = results.variable_contributions;
        if (contributions.length === 0) {
          warnings.push('Variable contributions array is empty');
        }

        // Check contribution percentages sum to ~100
        const totalPercent = contributions.reduce((sum, v) => sum + (v.percent_contribution || 0), 0);
        if (Math.abs(totalPercent - 100) > 1) {
          warnings.push(`Variable contributions sum to ${totalPercent}% (expected ~100%)`);
        }

        // Check for negative values
        contributions.forEach((v, idx) => {
          if (v.permutation_importance < 0) {
            errors.push(`Variable ${idx} has negative permutation_importance`);
          }
          if (v.percent_contribution < 0) {
            errors.push(`Variable ${idx} has negative percent_contribution`);
          }
        });
      }

      // AUC consistency
      if (results.auc && results.test_auc && results.auc < results.test_auc - 0.1) {
        warnings.push(`Test AUC (${results.test_auc}) significantly higher than training AUC (${results.auc}) - possible overfitting`);
      }

      // Low performance warning
      if (results.auc && results.auc < 0.7) {
        warnings.push(`AUC ${results.auc} indicates weak model performance (typical threshold: 0.7+)`);
      }

      return {
        errors,
        warnings,
        valid: errors.length === 0
      };
    };

    let results = [];

    if (validateAll) {
      // Validate all MaxentRun records
      const allRuns = await base44.entities.MaxentRun.list('-updated_date', 100);
      
      results = allRuns.map(run => ({
        id: run.id,
        species_name: run.data.species_name,
        name: run.data.name,
        status: run.data.status,
        ...validateRun(run.data)
      }));
    } else {
      // Validate single run
      const runs = await base44.entities.MaxentRun.list('-updated_date', 1);
      const run = runs.find(r => r.id === maxentRunId);

      if (!run) {
        return Response.json({ 
          error: 'MaxentRun not found' 
        }, { status: 404 });
      }

      results = [{
        id: run.id,
        species_name: run.data.species_name,
        name: run.data.name,
        status: run.data.status,
        ...validateRun(run.data)
      }];
    }

    // Summary statistics
    const summary = {
      total_runs_checked: results.length,
      valid_runs: results.filter(r => r.valid).length,
      runs_with_errors: results.filter(r => r.errors.length > 0).length,
      runs_with_warnings: results.filter(r => r.warnings.length > 0).length,
      data_quality_score: ((results.filter(r => r.valid).length / results.length) * 100).toFixed(1) + '%'
    };

    return Response.json({
      status: 'success',
      summary,
      validation_results: results
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});