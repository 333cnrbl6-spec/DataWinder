import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { assessmentId, sisId } = await req.json();
        const token = user.iucn_api_token;
        if (!token) return Response.json({ error: 'No token' }, { status: 400 });

        const BASE = 'https://api.iucnredlist.org/api/v4';
        const results = {};

        if (assessmentId) {
            const res = await fetch(`${BASE}/assessment/${assessmentId}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });
            if (res.ok) {
                const data = await res.json();
                // Return ALL top-level keys with type info
                results.topLevelKeys = Object.keys(data);
                // Return array fields with length + first element sample
                for (const [k, v] of Object.entries(data)) {
                    if (Array.isArray(v)) {
                        results[`array_${k}`] = { length: v.length, sample: v[0] };
                    } else if (v && typeof v === 'object') {
                        results[`obj_${k}`] = v;
                    } else {
                        results[`val_${k}`] = v;
                    }
                }
            } else {
                results.assessmentError = await res.text();
            }
        }

        if (sisId) {
            const res = await fetch(`${BASE}/taxa/sis/${sisId}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });
            if (res.ok) {
                const data = await res.json();
                results.sisTopKeys = Object.keys(data);
                results.assessmentsList = (data.assessments || []).map(a => ({
                    id: a.assessment_id,
                    year: a.year_published,
                    latest: a.latest,
                    code: a.red_list_category_code
                }));
            } else {
                results.sisError = await res.text();
            }
        }

        return Response.json(results);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});