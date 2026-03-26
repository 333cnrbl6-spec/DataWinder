import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Automated IUCN Bulk Extraction Backend Function
 * 
 * Extracts species ranges from bulk IUCN files without UI interaction.
 * Can be triggered:
 *   1. Directly via API: POST /functions/automatedIUCNExtract
 *   2. On schedule: via automations (e.g., daily, weekly)
 * 
 * Payload options:
 *   {
 *     "library_id": "uuid",        // Extract from specific bulk file in library
 *     "genus_filter": "Panthera",  // Optional: filter by genus
 *     "mode": "app_data"           // Or omit for file mode
 *   }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { library_id, genus_filter, mode } = body;

    console.log(`[automatedIUCNExtract] Started by ${user.email}`, { library_id, genus_filter, mode });

    let file_uri = null;
    let iucn_version = null;

    // If library_id provided, fetch the bulk file details
    if (library_id) {
      const libraries = await base44.asServiceRole.entities.IUCNBulkLibrary.list();
      const bulkFile = libraries.find(l => l.id === library_id);
      
      if (!bulkFile) {
        return Response.json({ 
          error: `Bulk file not found: ${library_id}` 
        }, { status: 404 });
      }
      
      file_uri = bulkFile.file_uri;
      iucn_version = bulkFile.iucn_version;
      console.log(`[automatedIUCNExtract] Using bulk file: ${bulkFile.label}`);
    }

    // Call extractIUCNBulkSpecies function (reuse existing logic)
    const result = await base44.asServiceRole.functions.invoke('extractIUCNBulkSpecies', {
      ...(mode === 'app_data' ? { mode: 'app_data' } : { file_uri }),
      ...(genus_filter ? { genus_filter } : {}),
      ...(iucn_version ? { iucn_version } : {})
    });

    if (result.status >= 400) {
      throw new Error(`Backend extraction failed (${result.status}): ${result.data?.error || 'Unknown error'}`);
    }

    if (result.data?.error) {
      throw new Error(result.data.error);
    }

    console.log(`[automatedIUCNExtract] Success: ${result.data?.species_count} species processed`);

    return Response.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      extracted_by: user.email,
      species_count: result.data?.species_count || 0,
      message: result.data?.message || 'Extraction completed',
      species: result.data?.species || []
    });

  } catch (error) {
    console.error('[automatedIUCNExtract] Error:', error.message);
    return Response.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});