import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { download_url, dataset_name, dataset_id } = await req.json();
    if (!download_url || !dataset_name) {
      return Response.json({ error: 'Missing download_url or dataset_name' }, { status: 400 });
    }

    // Fetch the file from the remote URL
    const fileResponse = await fetch(download_url, {
      headers: { 'User-Agent': 'DataWinder/1.0 (Bangor University SDM Platform)' }
    });

    if (!fileResponse.ok) {
      return Response.json({
        error: `Failed to fetch from source: HTTP ${fileResponse.status} — the provider may require authentication or the URL may have changed.`,
        http_status: fileResponse.status
      }, { status: 422 });
    }

    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
    const contentLength = fileResponse.headers.get('content-length');
    const fileBuffer = await fileResponse.arrayBuffer();

    // Determine file name from URL or dataset name
    const urlPath = new URL(download_url).pathname;
    const urlFileName = urlPath.split('/').pop() || `${dataset_name.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;

    // Upload to private storage
    const fileBlob = new Blob([fileBuffer], { type: contentType });
    const file = new File([fileBlob], urlFileName, { type: contentType });

    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });

    // Update the ClimateDataset record if dataset_id provided
    if (dataset_id) {
      await base44.asServiceRole.entities.ClimateDataset.update(dataset_id, {
        notes: `File stored in backend on ${new Date().toISOString().split('T')[0]}. Original URL: ${download_url}`,
        maxent_ready: true
      });
    }

    return Response.json({
      status: 'success',
      file_uri,
      file_name: urlFileName,
      file_size_bytes: fileBuffer.byteLength,
      content_type: contentType,
      message: `Successfully fetched and stored "${urlFileName}" (${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)} MB)`
    });

  } catch (error) {
    console.error('fetchClimateFileToBackend error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});