import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Job tracking: maps job IDs to status
// In production, this would use a database or queue service
const jobStatus = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, jobId, jobType, payload } = await req.json();

    if (action === 'create') {
      // Create new job
      if (!jobType) return Response.json({ error: 'Missing jobType' }, { status: 400 });
      
      const newJobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      jobStatus.set(newJobId, {
        id: newJobId,
        type: jobType,
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString(),
        payload: payload || {}
      });

      return Response.json({
        status: 'success',
        jobId: newJobId,
        message: `Job created: ${jobType}`
      });
    }

    if (action === 'status') {
      // Get job status
      if (!jobId) return Response.json({ error: 'Missing jobId' }, { status: 400 });
      
      const job = jobStatus.get(jobId);
      if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

      return Response.json({
        status: 'success',
        job: job
      });
    }

    if (action === 'update') {
      // Update job status (admin only)
      if (!jobId || !payload) return Response.json({ error: 'Missing jobId or payload' }, { status: 400 });
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const job = jobStatus.get(jobId);
      if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

      job.status = payload.status || job.status;
      job.progress = payload.progress || job.progress;
      job.result = payload.result || job.result;
      job.error = payload.error || job.error;

      return Response.json({
        status: 'success',
        job: job
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});