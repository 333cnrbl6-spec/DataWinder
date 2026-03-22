import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Common MAXENT installation paths by OS
const COMMON_PATHS = {
  linux: [
    '/opt/maxent',
    '/usr/local/maxent',
    '/home/*/maxent',
    '~/maxent',
  ],
  darwin: [
    '/Applications/maxent',
    '/Applications/MaxEnt',
    '/usr/local/maxent',
    '~/maxent',
  ],
  windows: [
    'C:\\Program Files\\maxent',
    'C:\\Program Files (x86)\\maxent',
    'C:\\maxent',
    'C:\\Users\\*\\maxent',
  ]
};

// Detect if running on Deno Deploy (no subprocess support)
const isDeployEnvironment = () => {
  return typeof Deno?.deploy !== 'undefined' || (typeof Deno?.env?.get('DENO_DEPLOYMENT_ID') !== 'undefined');
};

// Auto-detect MAXENT executable location
const detectMaxentPath = async () => {
  try {
    // Check environment variable first
    const envMaxent = Deno.env.get('MAXENT_PATH');
    if (envMaxent) {
      try {
        const stat = await Deno.stat(envMaxent);
        if (stat.isFile || stat.isDirectory) {
          return envMaxent;
        }
      } catch {
        // Path doesn't exist, continue searching
      }
    }

    // Try common paths based on OS
    const os = Deno.build.os;
    const paths = COMMON_PATHS[os] || [];

    for (const pathPattern of paths) {
      try {
        let path = pathPattern;
        if (path.startsWith('~')) {
          const homeDir = Deno.env.get('HOME') || Deno.env.get('USERPROFILE');
          if (homeDir) path = path.replace('~', homeDir);
        }

        const stat = await Deno.stat(path);
        if (stat.isDirectory) {
          // Check for maxent executable in directory
          const executable = os === 'windows' ? 'maxent.bat' : 'maxent';
          const execPath = `${path}/${executable}`;
          try {
            await Deno.stat(execPath);
            return execPath;
          } catch {
            // Try jar file
            const jarPath = `${path}/maxent.jar`;
            try {
              await Deno.stat(jarPath);
              return jarPath;
            } catch {
              // Continue searching
            }
          }
        }
      } catch {
        // Path doesn't exist, continue
      }
    }

    return null;
  } catch (error) {
    return null;
  }
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

    if (!occurrenceFile || !environmentalLayers) {
      return Response.json({
        error: 'Missing required parameters: occurrenceFile, environmentalLayers'
      }, { status: 400 });
    }

    // Auto-detect MAXENT path if not provided
    let resolvedMaxentPath = maxentPath;
    if (!resolvedMaxentPath) {
      resolvedMaxentPath = await detectMaxentPath();
      if (!resolvedMaxentPath) {
        return Response.json({
          status: 'not_found',
          error: 'MAXENT installation not found. Set MAXENT_PATH environment variable or install MAXENT in a standard location.'
        }, { status: 400 });
      }
    }

    const result = await executeMaxent(resolvedMaxentPath, occurrenceFile, environmentalLayers, parameters);

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
      execution: result,
      detectedPath: !maxentPath ? resolvedMaxentPath : undefined
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});