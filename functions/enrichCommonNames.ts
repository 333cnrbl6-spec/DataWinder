import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const allSpecies = await base44.entities.Species.list();
  const missing = allSpecies.filter(sp => !sp.common_name || sp.common_name.trim() === '');

  if (missing.length === 0) {
    return Response.json({ updated: 0, message: 'All species already have common names.' });
  }

  let updated = 0;
  const results = [];

  for (const sp of missing) {
    let commonName = null;

    // 1. Try iNaturalist preferred_common_name
    if (!commonName) {
      try {
        const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sp.scientific_name)}&rank=species&per_page=1`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const taxon = data.results?.[0];
          if (taxon?.preferred_common_name) {
            commonName = taxon.preferred_common_name;
          }
        }
      } catch (_) {}
    }

    // 2. Try GBIF vernacular names
    if (!commonName && sp.gbif_id) {
      try {
        const url = `https://api.gbif.org/v1/species/${sp.gbif_id}/vernacularNames`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const english = data.results?.find(v => v.language === 'eng');
          if (english?.vernacularName) {
            commonName = english.vernacularName;
          } else if (data.results?.[0]?.vernacularName) {
            commonName = data.results[0].vernacularName;
          }
        }
      } catch (_) {}
    }

    // 3. Try GBIF species search by name for vernacular
    if (!commonName) {
      try {
        const url = `https://api.gbif.org/v1/species?name=${encodeURIComponent(sp.scientific_name)}&limit=1`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const gbifId = data.results?.[0]?.key;
          if (gbifId) {
            const vUrl = `https://api.gbif.org/v1/species/${gbifId}/vernacularNames`;
            const vRes = await fetch(vUrl);
            if (vRes.ok) {
              const vData = await vRes.json();
              const english = vData.results?.find(v => v.language === 'eng');
              if (english?.vernacularName) {
                commonName = english.vernacularName;
              }
            }
          }
        }
      } catch (_) {}
    }

    if (commonName) {
      // Capitalize first letter of each word
      const formatted = commonName.replace(/\b\w/g, c => c.toUpperCase());
      await base44.entities.Species.update(sp.id, { common_name: formatted });
      updated++;
      results.push({ scientific_name: sp.scientific_name, common_name: formatted });
    } else {
      results.push({ scientific_name: sp.scientific_name, common_name: null });
    }
  }

  return Response.json({
    updated,
    total_missing: missing.length,
    results,
    message: `Updated ${updated} of ${missing.length} species with common names.`
  });
});