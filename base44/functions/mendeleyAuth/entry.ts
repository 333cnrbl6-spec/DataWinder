import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const CLIENT_ID = Deno.env.get("MENDELEY_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("MENDELEY_CLIENT_SECRET");
const REDIRECT_URI = Deno.env.get("MENDELEY_REDIRECT_URI") || "https://preview-sandbox--69821d606837970a4a3c0ef2.base44.app/MendeleyConnect";

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, code, token } = body;

    if (action === 'get_auth_url') {
        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: 'all',
        });
        const url = `https://api.mendeley.com/oauth/authorize?${params}`;
        return Response.json({ url });
    }

    if (action === 'exchange_code') {
        // Mendeley requires HTTP Basic Auth for client credentials
        const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
        const resp = await fetch('https://api.mendeley.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
            }),
        });
        const data = await resp.json();
        if (!resp.ok) {
            console.error('Mendeley token error:', JSON.stringify(data));
            return Response.json({ error: data.error_description || data.error || 'Token exchange failed', details: data }, { status: resp.status });
        }
        return Response.json(data);
    }

    if (action === 'search_papers') {
        const { query, limit = 20, offset = 0 } = body;
        const params = new URLSearchParams({ query, limit, offset, view: 'all' });
        const resp = await fetch(`https://api.mendeley.com/search/catalog?${params}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.mendeley-document.1+json' },
        });
        const data = await resp.json();
        const total = resp.headers.get('Mendeley-Count') || 0;
        return Response.json({ results: Array.isArray(data) ? data : [], total: parseInt(total) });
    }

    if (action === 'get_library') {
        const { limit = 50, offset = 0 } = body;
        const params = new URLSearchParams({ limit, offset, view: 'all' });
        const resp = await fetch(`https://api.mendeley.com/documents?${params}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.mendeley-document.1+json' },
        });
        const data = await resp.json();
        const total = resp.headers.get('Mendeley-Count') || 0;
        return Response.json({ results: Array.isArray(data) ? data : [], total: parseInt(total) });
    }

    if (action === 'get_paper_details') {
        const { document_id } = body;
        const resp = await fetch(`https://api.mendeley.com/catalog/${document_id}?view=all`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.mendeley-document.1+json' },
        });
        const data = await resp.json();
        return Response.json(data);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
});