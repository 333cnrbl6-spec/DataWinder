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
            case 'taxa':
                apiUrl = `${BASE}/species/name/${term}?token=${token}`;
                break;
            case 'assessment':
                apiUrl = `${BASE}/assessments/${term}?token=${token}`;
                break;
            case 'habitats':
                apiUrl = `${BASE}/taxa/${term}/habitats?token=${token}`;
                break;
            case 'threats':
                apiUrl = `${BASE}/taxa/${term}/threats?token=${token}`;
                break;
            case 'history':
                apiUrl = `${BASE}/taxa/${term}/history?token=${token}`;
                break;
            case 'countries':
                apiUrl = `${BASE}/regions/countries?token=${token}`;
                break;
            case 'range':
                apiUrl = `${BASE}/species/range/${term}?token=${token}`;
                break;
            case 'images':
                apiUrl = `${BASE}/taxa/sis/${term}?token=${token}`;
                break;
            case 'scientific_name': {
                const parts = term.split(' ');
                const genus = parts[0];
                const species = parts[1] || '';
                apiUrl = `${BASE}/taxa/scientific_name?genus_name=${encodeURIComponent(genus)}&species_name=${encodeURIComponent(species)}&token=${token}`;
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
            if (iucnResponse.status === 401 || errorText.includes('Invalid API token')) {
                return Response.json({ status: 'error', message: 'Invalid IUCN API token.', statusCode: 401 }, { status: 401 });
            }
            return Response.json({ status: 'error', message: `IUCN API error: ${errorText}`, statusCode: iucnResponse.status }, { status: iucnResponse.status });
        }

        const data = await iucnResponse.json();
        return Response.json({ status: 'success', data });

    } catch (error) {
        console.error('Error in fetchIUCNData backend function:', error);
        return Response.json({ status: 'error', message: error.message }, { status: 500 });
    }
});