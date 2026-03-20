import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { endpoint, term, level } = await req.json();

        const BASE = 'https://api.iucnredlist.org/api/v4';
        const token = Deno.env.get('IUCN_API_KEY') || user.iucn_api_token;

        if (!token) {
            return Response.json({ error: 'IUCN API token not configured. Set IUCN_API_KEY in environment variables.' }, { status: 400 });
        }

        let apiUrl = '';
        switch (endpoint) {
            // ---------------------------------------------------------------
            // TAXA SEARCH - returns {assessments:[...]} for higher taxa
            //               returns {taxon:{...}, assessments:[...]} for species
            // v4 taxa endpoints: /kingdom /phylum /class /order /family
            // species: /taxa/scientific_name?genus_name=X&species_name=Y
            // genus: /taxa/scientific_name?genus_name=X  (no /taxa/genus/ in v4)
            // ---------------------------------------------------------------
            case 'taxa': {
                const taxaLevel = level || 'family';
                if (taxaLevel === 'species') {
                    const parts = term.trim().split(' ');
                    apiUrl = `${BASE}/taxa/scientific_name?genus_name=${encodeURIComponent(parts[0])}&species_name=${encodeURIComponent(parts[1] || '')}`;
                } else if (taxaLevel === 'genus') {
                    // v4 has NO genus endpoint — not supported
                    return Response.json({ status: 'error', message: 'Genus-level search is not supported by IUCN API v4. Please search at family level or by species name.', statusCode: 400 }, { status: 400 });
                } else if (taxaLevel === 'family') {
                    apiUrl = `${BASE}/taxa/family/${encodeURIComponent(term.trim())}`;
                } else if (taxaLevel === 'order') {
                    apiUrl = `${BASE}/taxa/order/${encodeURIComponent(term.trim())}`;
                } else if (taxaLevel === 'class') {
                    apiUrl = `${BASE}/taxa/class/${encodeURIComponent(term.trim())}`;
                } else if (taxaLevel === 'phylum') {
                    apiUrl = `${BASE}/taxa/phylum/${encodeURIComponent(term.trim())}`;
                } else if (taxaLevel === 'kingdom') {
                    apiUrl = `${BASE}/taxa/kingdom/${encodeURIComponent(term.trim())}`;
                } else {
                    apiUrl = `${BASE}/taxa/family/${encodeURIComponent(term.trim())}`;
                }
                break;
            }

            // ---------------------------------------------------------------
            // ASSESSMENT - full assessment by assessment_id
            // Returns the complete record including: habitats[], threats[],
            // conservation_actions[], documentation{}, population_trend{},
            // red_list_category{}, taxon{}, supplementary_info{} etc.
            // ALL sub-data is embedded here — no separate sub-endpoints in v4.
            // ---------------------------------------------------------------
            case 'assessment':
                apiUrl = `${BASE}/assessment/${term}`;
                break;

            // ---------------------------------------------------------------
            // SIS - full taxon details + all assessments history by sis_id
            // Returns: {sis_id, taxon:{}, assessments:[{assessment_id, latest, ...}]}
            // ---------------------------------------------------------------
            case 'sis':
                apiUrl = `${BASE}/taxa/sis/${term}`;
                break;

            // RANGE endpoint does not exist in IUCN API v4 — spatial data is bulk download only
            case 'range':
                return Response.json({ status: 'error', message: 'Range data is not available via IUCN API v4. Download spatial data from iucnredlist.org.', statusCode: 404 }, { status: 404 });

            // ---------------------------------------------------------------
            // SCIENTIFIC NAME lookup
            // Returns: {taxon:{...}, assessments:[...]}
            // ---------------------------------------------------------------
            case 'scientific_name': {
                const parts = term.trim().split(' ');
                const genus = parts[0];
                const species = parts[1] || '';
                apiUrl = species
                    ? `${BASE}/taxa/scientific_name?genus_name=${encodeURIComponent(genus)}&species_name=${encodeURIComponent(species)}`
                    : `${BASE}/taxa/scientific_name?genus_name=${encodeURIComponent(genus)}&species_name=`;
                break;
            }

            // ---------------------------------------------------------------
            // COUNTRIES - returns list of country codes (not per-species)
            // Use /countries/ for a full list of ISO codes
            // ---------------------------------------------------------------
            case 'countries':
                apiUrl = `${BASE}/countries/`;
                break;

            default:
                return Response.json({ error: 'Invalid IUCN API endpoint specified.' }, { status: 400 });
        }

        console.log(`[IUCN v4] ${endpoint} → ${apiUrl}`);

        const iucnResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!iucnResponse.ok) {
            const errorText = await iucnResponse.text();
            console.error(`IUCN API Error [${iucnResponse.status}] ${endpoint}/${term}: ${errorText}`);
            if (iucnResponse.status === 401) {
                return Response.json({ status: 'error', message: 'Invalid IUCN API token.', statusCode: 401 }, { status: 401 });
            }
            return Response.json({ status: 'error', message: `IUCN API error (${iucnResponse.status})`, statusCode: iucnResponse.status }, { status: iucnResponse.status });
        }

        const data = await iucnResponse.json();
        return Response.json({ status: 'success', data });

    } catch (error) {
        console.error('Error in fetchIUCNData:', error);
        return Response.json({ status: 'error', message: error.message }, { status: 500 });
    }
});