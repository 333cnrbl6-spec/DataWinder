import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const token = user.iucn_api_token;
    if (!token) return Response.json({ error: 'No IUCN token configured' }, { status: 400 });

    const { scientific_name, assessment_pdf_url, range_map_jpg_url, range_data_shp_url, range_data_csv_url } = await req.json();
    if (!scientific_name) return Response.json({ error: 'Missing scientific_name' }, { status: 400 });

    const safeName = scientific_name.replace(/ /g, '_');
    const authHeaders = { 'Authorization': `Bearer ${token}`, 'Accept': '*/*' };
    const result = { logs: [] };

    const downloadAndUpload = async (url, filename, mimeType) => {
      if (!url) return null;
      result.logs.push(`Fetching: ${url}`);
      const res = await fetch(url, { headers: authHeaders });
      result.logs.push(`Status: ${res.status}, type: ${res.headers.get('content-type')}`);
      if (!res.ok) return null;
      const bytes = await res.arrayBuffer();
      result.logs.push(`Size: ${bytes.byteLength} bytes`);
      if (bytes.byteLength < 500) return null;
      const file = new File([bytes], filename, { type: mimeType });
      const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
      result.logs.push(`Uploaded: ${file_uri}`);
      return file_uri;
    };

    result.assessment_pdf_file_uri = await downloadAndUpload(
      assessment_pdf_url, `${safeName}_assessment.pdf`, 'application/pdf'
    );

    result.range_map_jpg_file_uri = await downloadAndUpload(
      range_map_jpg_url, `${safeName}_range_map.jpg`, 'image/jpeg'
    );

    result.range_shp_file_uri = await downloadAndUpload(
      range_data_shp_url, `${safeName}_range_data.zip`, 'application/zip'
    );

    result.range_csv_file_uri = await downloadAndUpload(
      range_data_csv_url, `${safeName}_range_data.csv`, 'text/csv'
    );

    result.status = 'success';
    return Response.json(result);
  } catch (error) {
    return Response.json({ status: 'error', message: error.message, stack: error.stack }, { status: 500 });
  }
});