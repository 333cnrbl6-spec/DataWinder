import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Detect if running on Deno Deploy (no subprocess support)
const isDeployEnvironment = () => {
  return typeof Deno?.deploy !== 'undefined' || (typeof Deno?.env?.get('DENO_DEPLOYMENT_ID') !== 'undefined');
};

// Execute MAXENT locally via command line
const executeMaxent = async (maxentPath, occurrenceFile, environmentalLayers, parameters = {}) => {
  // Check for Deno Deploy environment
  if (isDeployEnvironment()) {
    return {
      success: false,
      error: 'Subprocess execution not available on Deno Deploy. Use local MAXENT installation or cloud service.',
      platform_constraint: true
    };
  }

  try {
    const isJar = maxentPath.endsWith('.jar');
    const command = isJar ? 'java' : maxentPath;
    
    // Build MAXENT command arguments
    const args = [];
    
    if (isJar) {
      args.push('-jar', maxentPath);
    }

    // Add input files
    args.push(
      '-e', environmentalLayers,
      '-s', occurrenceFile,
      '-o', parameters.outputDir || './maxent_results',
      '-r'  // Response curves
    );

    // Add optional parameters
    if (parameters.regularizationMultiplier) {
      args.push('-beta', String(parameters.regularizationMultiplier));
    }
    if (parameters.maxIterations) {
      args.push('-i', String(parameters.maxIterations));
    }
    if (parameters.replicates) {
      args.push('-x', String(parameters.replicates));
    }
    if (parameters.featureTypes) {
      args.push('-f', parameters.featureTypes.join(','));
    }

    // Execute
    const process = new Deno.Command(command, { args });
    const output = await process.output();
    
    const stdout = new TextDecoder().decode(output.stdout);
    const stderr = new TextDecoder().decode(output.stderr);

    return {
      success: output.success,
      exitCode: output.code,
      stdout: stdout.slice(0, 5000), // Limit output size
      stderr: stderr.slice(0, 5000),
      message: output.success ? 'MAXENT execution completed' : 'MAXENT execution failed'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      maxentPath,
      occurrenceFile,
      environmentalLayers,
      parameters,
      action
    } = await req.json();

    if (action !== 'execute') {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!maxentPath || !occurrenceFile || !environmentalLayers) {
      return Response.json({
        error: 'Missing required parameters: maxentPath, occurrenceFile, environmentalLayers'
      }, { status: 400 });
    }

    const result = await executeMaxent(maxentPath, occurrenceFile, environmentalLayers, parameters);

    // Handle platform constraint gracefully
    if (result.platform_constraint) {
      return Response.json({
        status: 'platform_constraint',
        execution: result,
        message: 'Local MAXENT execution requires local installation. Consider using cloud service or running locally.',
        suggestion: 'Submit run for cloud processing instead'
      });
    }

    return Response.json({
      status: result.success ? 'success' : 'failed',
      execution: result
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});