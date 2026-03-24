import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) return Response.json({ error: 'No token provided' }, { status: 400 });

    // Find the share by token
    const shares = await base44.asServiceRole.entities.SecureShare.filter({ token });
    if (!shares || shares.length === 0) {
      return Response.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    const share = shares[0];

    // Already burned?
    if (share.burned) {
      return Response.json({ error: 'This link has already been viewed and is permanently expired.' }, { status: 410 });
    }

    // Expired by time?
    if (new Date(share.expires_at) < new Date()) {
      return Response.json({ error: 'This link has expired.' }, { status: 410 });
    }

    // Get viewer IP from headers
    const viewerIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // BURN the token immediately — one view only
    await base44.asServiceRole.entities.SecureShare.update(share.id, {
      burned: true,
      viewed_at: new Date().toISOString(),
      viewer_ip: viewerIp,
    });

    console.log(`[SECURE SHARE] Token burned. Viewed by IP: ${viewerIp} at ${new Date().toISOString()}. Title: ${share.paper_title}`);

    // Return the content — this is the one and only time
    return Response.json({
      status: 'ok',
      paper_title: share.paper_title,
      paper_content: share.paper_content,
      audio_enabled: share.audio_enabled,
      created_by: share.created_by_email,
      viewed_at: new Date().toISOString(),
      viewer_ip: viewerIp,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});