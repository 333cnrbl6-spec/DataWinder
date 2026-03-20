import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Execute MAXENT locally via command line
const executeMaxent = async (maxentPath, occurrenceFile, environmentalLayers, parameters = {}) => {
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

    return Response.json({
      status: result.success ? 'success' : 'failed',
      execution: result
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});