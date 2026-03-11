import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Debug helper: returns only the top-level keys and array lengths of an assessment
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

        // Fetch the assessment directly
        if (assessmentId) {
            const res = await fetch(`${BASE}/assessment/${assessmentId}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });
            if (res.ok) {
                const data = await res.json();
                // Return structure summary: keys + if arrays, their length and first item keys
                const summary = {};
                for (const [k, v] of Object.entries(data)) {
                    if (Array.isArray(v)) {
                        summary[k] = { type: 'array', length: v.length, firstItem: v[0] || null };
                    } else if (v && typeof v === 'object') {
                        summary[k] = { type: 'object', keys: Object.keys(v) };
                    } else {
                        summary[k] = v;
                    }
                }
                results.assessment = summary;
            } else {
                results.assessmentError = await res.text();
            }
        }

        // Fetch the taxa/sis endpoint and return assessment list structure
        if (sisId) {
            const res = await fetch(`${BASE}/taxa/sis/${sisId}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });
            if (res.ok) {
                const data = await res.json();
                // Return just the assessments array structure
                results.sisData = {
                    sis_id: data.sis_id,
                    taxon_keys: Object.keys(data.taxon || {}),
                    assessments_count: (data.assessments || []).length,
                    assessments_sample: (data.assessments || []).slice(0, 5).map(a => ({
                        assessment_id: a.assessment_id,
                        year_published: a.year_published,
                        latest: a.latest,
                        red_list_category_code: a.red_list_category_code,
                        keys: Object.keys(a)
                    }))
                };
            } else {
                results.sisError = await res.text();
            }
        }

        return Response.json(results);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});