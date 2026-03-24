import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { draft_id, audio_enabled = false, expires_hours = 24 } = await req.json();

    // Load the draft
    const draft = await base44.asServiceRole.entities.PaperDraft.get(draft_id);
    if (!draft) return Response.json({ error: 'Draft not found' }, { status: 404 });

    // Generate a cryptographically random token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    // Expiry
    const expiresAt = new Date(Date.now() + expires_hours * 60 * 60 * 1000).toISOString();

    // Store share record
    const share = await base44.asServiceRole.entities.SecureShare.create({
      token,
      draft_id,
      paper_title: draft.title,
      paper_content: draft.sections,
      created_by_email: user.email,
      expires_at: expiresAt,
      viewed_at: null,
      burned: false,
      audio_enabled,
    });

    return Response.json({ token, share_id: share.id, expires_at: expiresAt });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});