import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { endpoint, term } = await req.json();

        if (!user.iucn_api_token) {
            return Response.json({ error: 'IUCN API token not configured for user.' }, { status: 400 });
        }

        const BASE = 'https://api.iucnredlist.org/api/v4';
        const token = user.iucn_api_token;

        let apiUrl = '';
        switch (endpoint) {
            // Search by family name: /api/v4/taxa/family/{family_name}
            case 'taxa':
                apiUrl = `${BASE}/taxa/family/${encodeURIComponent(term)}?token=${token}`;
                break;
            // Get assessment by ID: /api/v4/assessment/{assessment_id}
            case 'assessment':
                apiUrl = `${BASE}/assessment/${term}?token=${token}`;
                break;
            // Habitats by assessment code
            case 'habitats':
                apiUrl = `${BASE}/habitats/?token=${token}`;
                break;
            // Threats by code
            case 'threats':
                apiUrl = `${BASE}/threats/?token=${token}`;
                break;
            // History / Red list categories
            case 'history':
                apiUrl = `${BASE}/red_list_categories/?token=${token}`;
                break;
            // List of countries
            case 'countries':
                apiUrl = `${BASE}/countries/?token=${token}`;
                break;
            // Range / species by SIS id
            case 'range':
                apiUrl = `${BASE}/taxa/sis/${term}?token=${token}`;
                break;
            // Images / species details by SIS id
            case 'images':
                apiUrl = `${BASE}/taxa/sis/${term}?token=${token}`;
                break;
            // Lookup by scientific name (genus + species)
            case 'scientific_name': {
                const parts = term.split(' ');
                const genus = parts[0];
                const species = parts[1] || '';
                if (species) {
                    apiUrl = `${BASE}/taxa/scientific_name?genus_name=${encodeURIComponent(genus)}&species_name=${encodeURIComponent(species)}&token=${token}`;
                } else {
                    apiUrl = `${BASE}/taxa/family/${encodeURIComponent(genus)}?token=${token}`;
                }
                break;
            }
            default:
                return Response.json({ error: 'Invalid IUCN API endpoint specified.' }, { status: 400 });
        }

        console.log(`Calling IUCN API: ${apiUrl.replace(token, '***')}`);

        const iucnResponse = await fetch(apiUrl);
        
        if (!iucnResponse.ok) {
            const errorText = await iucnResponse.text();
            console.error(`IUCN API Error for ${endpoint} with term ${term}: ${iucnResponse.status} - ${errorText}`);
            if (iucnResponse.status === 401) {
                return Response.json({ status: 'error', message: 'Invalid IUCN API token.', statusCode: 401 }, { status: 401 });
            }
            return Response.json({ status: 'error', message: `IUCN API error (${iucnResponse.status})`, statusCode: iucnResponse.status }, { status: iucnResponse.status });
        }

        const data = await iucnResponse.json();
        return Response.json({ status: 'success', data });

    } catch (error) {
        console.error('Error in fetchIUCNData backend function:', error);
        return Response.json({ status: 'error', message: error.message }, { status: 500 });
    }
});