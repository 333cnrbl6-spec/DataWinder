import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = Deno.env.get('IUCN_API_KEY') || user.iucn_api_token;
        const BASE = 'https://api.iucnredlist.org/api/v4';

        const results = {
            token_exists: !!token,
            token_length: token ? token.length : 0,
            tests: []
        };

        if (!token) {
            return Response.json({ 
                status: 'error', 
                message: 'No IUCN API token found',
                results 
            }, { status: 400 });
        }

        // Test 1: Simple family search
        try {
            const resp = await fetch(`${BASE}/taxa/family/Cetacea`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            results.tests.push({
                name: 'Family search (Cetacea)',
                status: resp.status,
                ok: resp.ok,
                statusText: resp.statusText
            });
            if (!resp.ok) {
                const text = await resp.text();
                results.tests[results.tests.length - 1].error = text.substring(0, 200);
            }
        } catch (e) {
            results.tests.push({
                name: 'Family search (Cetacea)',
                status: 'error',
                error: e.message
            });
        }

        // Test 2: Order search
        try {
            const resp = await fetch(`${BASE}/taxa/order/Cetacea`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            results.tests.push({
                name: 'Order search (Cetacea)',
                status: resp.status,
                ok: resp.ok,
                statusText: resp.statusText
            });
            if (!resp.ok) {
                const text = await resp.text();
                results.tests[results.tests.length - 1].error = text.substring(0, 200);
            }
        } catch (e) {
            results.tests.push({
                name: 'Order search (Cetacea)',
                status: 'error',
                error: e.message
            });
        }

        // Test 3: Simple species search
        try {
            const resp = await fetch(`${BASE}/taxa/scientific_name?genus_name=Panthera&species_name=leo`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            results.tests.push({
                name: 'Species search (Panthera leo)',
                status: resp.status,
                ok: resp.ok,
                statusText: resp.statusText
            });
            if (!resp.ok) {
                const text = await resp.text();
                results.tests[results.tests.length - 1].error = text.substring(0, 200);
            }
        } catch (e) {
            results.tests.push({
                name: 'Species search (Panthera leo)',
                status: 'error',
                error: e.message
            });
        }

        return Response.json({ status: 'success', results });

    } catch (error) {
        return Response.json({ status: 'error', message: error.message }, { status: 500 });
    }
});