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

        let apiUrl = '';
        switch (endpoint) {
            case 'taxa':
                // For initial taxonomic search by name (e.g., family name)
                apiUrl = `https://api.iucnredlist.org/api/v4/species/name/${term}?token=${user.iucn_api_token}`;
                break;
            case 'assessment':
                apiUrl = `https://api.iucnredlist.org/api/v4/assessments/${term}?token=${user.iucn_api_token}`;
                break;
            case 'habitats':
                apiUrl = `https://api.iucnredlist.org/api/v4/taxa/${term}/habitats?token=${user.iucn_api_token}`;
                break;
            case 'threats':
                apiUrl = `https://api.iucnredlist.org/api/v4/taxa/${term}/threats?token=${user.iucn_api_token}`;
                break;
            case 'history':
                apiUrl = `https://api.iucnredlist.org/api/v4/taxa/${term}/history?token=${user.iucn_api_token}`;
                break;
            case 'countries':
                apiUrl = `https://api.iucnredlist.org/api/v4/regions/countries?token=${user.iucn_api_token}`;
                break;
            case 'range':
                apiUrl = `https://api.iucnredlist.org/api/v4/species/range/${term}?token=${user.iucn_api_token}`;
                break;
            case 'images':
                apiUrl = `https://api.iucnredlist.org/api/v4/taxa/sis/${term}?token=${user.iucn_api_token}`;
                break;
            case 'scientific_name':
                const parts = term.split(' ');
                const genus = parts[0];
                const species = parts[1] || '';
                apiUrl = `https://api.iucnredlist.org/api/v4/taxa/scientific_name?genus_name=${encodeURIComponent(genus)}&species_name=${encodeURIComponent(species)}&token=${user.iucn_api_token}`;
                break;
            default:
                return Response.json({ error: 'Invalid IUCN API endpoint specified.' }, { status: 400 });
        }

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