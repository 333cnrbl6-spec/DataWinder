import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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
  win32: [
    'C:\\Program Files\\maxent',
    'C:\\Program Files (x86)\\maxent',
    'C:\\maxent',
    'C:\\Users\\*\\maxent',
  ]
};

// Detect MAXENT executable location
const detectMaxent = async () => {
  try {
    // Check environment variable first
    const envMaxent = Deno.env.get('MAXENT_PATH');
    if (envMaxent) {
      try {
        const stat = await Deno.stat(envMaxent);
        if (stat.isFile || stat.isDirectory) {
          return { path: envMaxent, source: 'environment' };
        }
      } catch {
        // Path doesn't exist
      }
    }

    // Try common paths based on OS
    const os = Deno.build.os;
    const paths = COMMON_PATHS[os] || [];

    for (const pathPattern of paths) {
      try {
        // Expand tilde for home directory
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
            return { path: execPath, source: 'system_scan', os };
          } catch {
            // Try jar file
            const jarPath = `${path}/maxent.jar`;
            try {
              await Deno.stat(jarPath);
              return { path: jarPath, source: 'system_scan', os, type: 'jar' };
            } catch {
              // Continue searching
            }
          }
        }
      } catch {
        // Path doesn't exist, continue
      }
    }

    return { path: null, found: false, message: 'MAXENT not found in common locations' };
  } catch (error) {
    return { path: null, error: error.message };
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, customPath } = await req.json();

    if (action === 'detect') {
      const result = await detectMaxent();
      return Response.json({
        status: 'success',
        detection: result,
        os: Deno.build.os,
      });
    }

    if (action === 'verify') {
      if (!customPath) return Response.json({ error: 'Missing customPath' }, { status: 400 });
      
      try {
        const stat = await Deno.stat(customPath);
        const exists = stat.isFile || stat.isDirectory;
        return Response.json({
          status: 'success',
          verified: exists,
          path: customPath,
          type: stat.isDirectory ? 'directory' : 'file'
        });
      } catch {
        return Response.json({
          status: 'success',
          verified: false,
          path: customPath,
          message: 'Path does not exist or is not accessible'
        });
      }
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});