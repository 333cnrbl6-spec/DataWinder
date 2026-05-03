/**
 * SDM PIPELINE PROGRESS CALLBACK SERVICE
 * ======================================
 * Real-time progress updates via Server-Sent Events (SSE)
 * Eliminates polling, provides instant progress feedback.
 * 
 * Usage: Client opens EventSource to /sdmProgressCallback?runId=xxx
 * Receives streaming updates as pipeline progresses through stages
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  // Handle SSE connections
  if (req.headers.get('accept') === 'text/event-stream') {
    return handleSSEConnection(req);
  }

  // Handle regular progress query
  const base44 = createClientFromRequest(req);
  const url = new URL(req.url);
  const runId = url.searchParams.get('runId');

  if (!runId) {
    return Response.json({ error: 'Missing runId' }, { status: 400 });
  }

  try {
    const run = await base44.entities.SDMRun.filter({ id: runId });
    
    if (run.length === 0) {
      return Response.json({ error: 'Run not found' }, { status: 404 });
    }

    const runData = run[0];

    return Response.json({
      id: runData.id,
      status: runData.status,
      progress_pct: runData.progress_pct,
      progress_message: runData.progress_message,
      metrics: runData.metrics,
      occurrence_stats: runData.occurrence_stats
    });

  } catch (error) {
    console.error('Progress query error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Handle SSE (Server-Sent Events) connection for real-time updates
 */
async function handleSSEConnection(req) {
  const base44 = createClientFromRequest(req);
  const url = new URL(req.url);
  const runId = url.searchParams.get('runId');

  if (!runId) {
    return new Response('Missing runId', { status: 400 });
  }

  // Create ReadableStream for SSE
  const body = new ReadableStream({
    async start(controller) {
      try {
        // Send initial connection message
        controller.enqueue(encodeSSEMessage({
          type: 'connected',
          runId,
          timestamp: new Date().toISOString()
        }));

        // Poll for updates every 2 seconds
        let lastProgress = -1;
        const pollInterval = setInterval(async () => {
          try {
            const runs = await base44.entities.SDMRun.filter({ id: runId });
            
            if (runs.length === 0) {
              controller.enqueue(encodeSSEMessage({
                type: 'error',
                message: 'Run not found'
              }));
              clearInterval(pollInterval);
              controller.close();
              return;
            }

            const run = runs[0];

            // Send update if progress changed or message changed
            if (run.progress_pct !== lastProgress || run.progress_message) {
              controller.enqueue(encodeSSEMessage({
                type: 'progress',
                status: run.status,
                progress_pct: run.progress_pct,
                progress_message: run.progress_message,
                metrics: run.metrics,
                occurrence_stats: run.occurrence_stats
              }));

              lastProgress = run.progress_pct;
            }

            // Stop polling when done
            if (['completed', 'failed'].includes(run.status)) {
              controller.enqueue(encodeSSEMessage({
                type: 'complete',
                status: run.status,
                metrics: run.metrics
              }));
              clearInterval(pollInterval);
              controller.close();
            }

          } catch (err) {
            console.error('SSE poll error:', err.message);
            clearInterval(pollInterval);
            controller.close();
          }
        }, 2000);

        // Clean up on stream close
        req.signal?.addEventListener('abort', () => {
          clearInterval(pollInterval);
        });

      } catch (error) {
        console.error('SSE start error:', error.message);
        controller.close();
      }
    }
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }
  });
}

/**
 * Encode message as Server-Sent Event
 */
function encodeSSEMessage(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(message);
}