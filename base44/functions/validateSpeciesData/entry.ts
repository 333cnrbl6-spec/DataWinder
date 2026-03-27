import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { species, validationType } = await req.json();
    if (!species || !Array.isArray(species)) {
      return Response.json({ error: 'Invalid species list' }, { status: 400 });
    }

    const iucnKey = Deno.env.get('IUCN_API_KEY');
    const validationResults = [];

    for (const sp of species) {
      const issues = [];
      const warnings = [];
      let iucnData = null;
      let gbifData = null;

      // Validate against IUCN
      if (validationType === 'all' || validationType === 'iucn') {
        try {
          const iucnRes = await fetch(
            `https://apiv3.iucnredlist.org/api/v3/advanced_search?taxonomy=true&page=1&name=${encodeURIComponent(sp)}&token=${iucnKey}`
          );
          const iucnJson = await iucnRes.json();
          
          if (iucnJson.result && iucnJson.result.length > 0) {
            iucnData = iucnJson.result[0];
            
            // Check if taxonomy is valid
            if (!iucnData.kingdom || !iucnData.phylum || !iucnData.class_name) {
              issues.push('Incomplete taxonomic information in IUCN database');
            }
            
            // Flag data deficient species
            if (iucnData.assessment_html && iucnData.assessment_html.includes('DD')) {
              warnings.push('Species is Data Deficient (DD) in IUCN Red List');
            }
          } else {
            issues.push('Species not found in IUCN Red List database');
          }
        } catch (err) {
          warnings.push(`IUCN lookup failed: ${err.message}`);
        }
      }

      // Validate against GBIF
      if (validationType === 'all' || validationType === 'gbif') {
        try {
          const gbifRes = await fetch(
            `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(sp)}&limit=1`
          );
          const gbifJson = await gbifRes.json();
          
          if (gbifJson.results && gbifJson.results.length > 0) {
            gbifData = gbifJson.results[0];
            
            // Check for taxonomic match confidence
            if (gbifJson.results[0].matchType === 'FUZZY') {
              warnings.push('Fuzzy taxonomic match on GBIF - spelling may be incorrect');
            }
            
            // Check if accepted name differs
            if (gbifJson.results[0].acceptedUsageName && 
                gbifJson.results[0].acceptedUsageName !== sp) {
              warnings.push(`Accepted name: ${gbifJson.results[0].acceptedUsageName}`);
            }
          } else {
            warnings.push('Species not found in GBIF database');
          }
        } catch (err) {
          warnings.push(`GBIF lookup failed: ${err.message}`);
        }
      }

      // Check geographic consistency if both APIs return data
      if (iucnData && gbifData && (validationType === 'all' || validationType === 'geographic')) {
        // This is a placeholder for geographic validation
        // In production, compare range maps and occurrence distributions
        if (!iucnData.assessment_html || !gbifData.lastInterpreted) {
          warnings.push('Insufficient geographic data for comparison');
        }
      }

      validationResults.push({
        species: sp,
        isValid: issues.length === 0,
        issues,
        warnings,
        iucnData: iucnData ? {
          id: iucnData.assessment_id || null,
          status: iucnData.red_list_category || 'Unknown',
          kingdom: iucnData.kingdom || null,
          phylum: iucnData.phylum || null,
          class: iucnData.class_name || null,
          order: iucnData.order_name || null,
          family: iucnData.family || null,
          genus: iucnData.genus || null,
          species: iucnData.species || null,
        } : null,
        gbifData: gbifData ? {
          key: gbifData.key || null,
          matchType: gbifData.matchType || 'Unknown',
          acceptedName: gbifData.acceptedUsageName || null,
          datasetKey: gbifData.datasetKey || null,
        } : null,
      });
    }

    return Response.json({ validationResults, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});