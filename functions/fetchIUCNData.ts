import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { endpoint, term, level } = await req.json();

        if (!user.iucn_api_token) {
            return Response.json({ error: 'IUCN API token not configured for user.' }, { status: 400 });
        }

        const BASE = 'https://api.iucnredlist.org/api/v4';
        const token = user.iucn_api_token;

        let apiUrl = '';
        switch (endpoint) {
            // Search by taxonomic level
            case 'taxa': {
                const taxaLevel = level || 'family';
                if (taxaLevel === 'genus') {
                    apiUrl = `${BASE}/taxa/genus/${encodeURIComponent(term)}`;
                } else if (taxaLevel === 'order') {
                    apiUrl = `${BASE}/taxa/order/${encodeURIComponent(term)}`;
                } else if (taxaLevel === 'class') {
                    apiUrl = `${BASE}/taxa/class/${encodeURIComponent(term)}`;
                } else if (taxaLevel === 'species') {
                    const parts = term.split(' ');
                    apiUrl = `${BASE}/taxa/scientific_name?genus_name=${encodeURIComponent(parts[0])}&species_name=${encodeURIComponent(parts[1] || '')}`;
                } else {
                    // default to family
                    apiUrl = `${BASE}/taxa/family/${encodeURIComponent(term)}`;
                }
                break;
            }
            // Get assessment by ID: /api/v4/assessment/{assessment_id}
            case 'assessment':
                apiUrl = `${BASE}/assessment/${term}`;
                break;
            // Habitats by assessment ID
            case 'habitats':
                apiUrl = `${BASE}/assessment/${term}/habitats`;
                break;
            // Threats by assessment ID
            case 'threats':
                apiUrl = `${BASE}/assessment/${term}/threats`;
                break;
            // History by taxon ID
            case 'history':
                apiUrl = `${BASE}/taxa/sis/${term}/history`;
                break;
            // List of countries
            case 'countries':
                apiUrl = `${BASE}/countries/`;
                break;
            // Range / species by SIS id
            case 'range':
                apiUrl = `${BASE}/taxa/sis/${term}`;
                break;
            // Images / species details by SIS id
            case 'images':
                apiUrl = `${BASE}/taxa/sis/${term}`;
                break;
            // Lookup by scientific name (genus + species)
            case 'scientific_name': {
                const parts = term.split(' ');
                const genus = parts[0];
                const species = parts[1] || '';
                if (species) {
                    apiUrl = `${BASE}/taxa/scientific_name?genus_name=${encodeURIComponent(genus)}&species_name=${encodeURIComponent(species)}`;
                } else {
                    apiUrl = `${BASE}/taxa/family/${encodeURIComponent(genus)}`;
                }
                break;
            }
            default:
                return Response.json({ error: 'Invalid IUCN API endpoint specified.' }, { status: 400 });
        }

        console.log(`Calling IUCN API: ${apiUrl}`);

        const iucnResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
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