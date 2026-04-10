import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch current IUCN Red List version from their API (v4 endpoint)
    const apiKey = Deno.env.get('IUCN_API_KEY');
    const resp = await fetch('https://api.iucnredlist.org/api/v4/information/red_list_version', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!resp.ok) {
      throw new Error(`IUCN API returned ${resp.status}`);
    }

    const data = await resp.json();
    // v4 response shape: { version: "2025-2" } or { red_list_version: "2025-2" }
    const latestVersion = data.version || data.red_list_version || data.latest_version || String(data);

    console.log(`IUCN latest version: ${latestVersion}`);

    // Load existing version record (take the first/only one)
    const records = await base44.asServiceRole.entities.IUCNVersionRecord.list();
    const existing = records?.[0];

    const importedVersion = existing?.imported_version || null;
    const updateAvailable = !!importedVersion && importedVersion !== latestVersion;

    const payload = {
      latest_known_version: latestVersion,
      last_checked_at: new Date().toISOString(),
      update_available: updateAvailable
    };

    if (existing) {
      await base44.asServiceRole.entities.IUCNVersionRecord.update(existing.id, payload);
      console.log(`Updated version record id=${existing.id}. Update available: ${updateAvailable}`);
    } else {
      await base44.asServiceRole.entities.IUCNVersionRecord.create({
        ...payload,
        imported_version: null
      });
      console.log('Created initial version record');
    }

    return Response.json({
      latest_version: latestVersion,
      imported_version: importedVersion,
      update_available: updateAvailable
    });
  } catch (error) {
    console.error('checkIUCNVersion error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});