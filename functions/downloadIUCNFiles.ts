import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { scientific_name, assessment_id, range_map_jpg_url, range_data_shp_url, range_data_csv_url } = await req.json();
    if (!scientific_name) return Response.json({ error: 'Missing scientific_name' }, { status: 400 });

    const safeName = scientific_name.replace(/ /g, '_');
    const result = { logs: [] };

    const downloadAndUpload = async (url, filename, expectedMimePrefix) => {
      if (!url) return null;
      result.logs.push(`Fetching: ${url}`);
      const res = await fetch(url, {
        headers: { 'Accept': '*/*', 'User-Agent': 'Mozilla/5.0' }
      });
      result.logs.push(`Status: ${res.status}, Content-Type: ${res.headers.get('content-type')}`);
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') || '';
      // Skip HTML responses — these are webpage redirects, not binary files
      if (ct.includes('text/html')) {
        result.logs.push(`Skipped: HTML response (not a binary file) — manual download required`);
        return null;
      }
      if (expectedMimePrefix && !ct.includes(expectedMimePrefix)) {
        result.logs.push(`Skipped: unexpected content-type ${ct}`);
        return null;
      }
      const bytes = await res.arrayBuffer();
      result.logs.push(`Downloaded: ${bytes.byteLength} bytes`);
      if (bytes.byteLength < 500) {
        result.logs.push(`Skipped: file too small (likely an error page)`);
        return null;
      }
      const file = new File([bytes], filename, { type: ct });
      const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
      result.logs.push(`Stored: ${file_uri}`);
      return file_uri;
    };

    // IUCN Assessment PDF — correct URL uses assessment_id, not sis_id
    // These are publicly accessible PDFs (no auth required)
    const pdfUrl = assessment_id
      ? `https://www.iucnredlist.org/documents/redlist/assessments/en/${assessment_id}.pdf`
      : null;

    result.assessment_pdf_file_uri = await downloadAndUpload(
      pdfUrl, `${safeName}_assessment.pdf`, 'application/pdf'
    );

    // Range map JPG — served from IUCN website map service
    result.range_map_jpg_file_uri = await downloadAndUpload(
      range_map_jpg_url, `${safeName}_range_map.jpg`, 'image/'
    );

    // Range SHP (zipped shapefile) — requires IUCN bulk download account
    // Attempt anyway in case the URL is a direct download link
    result.range_shp_file_uri = await downloadAndUpload(
      range_data_shp_url, `${safeName}_range_data.zip`, null
    );

    // Range CSV
    result.range_csv_file_uri = await downloadAndUpload(
      range_data_csv_url, `${safeName}_range_data.csv`, null
    );

    result.status = 'success';
    return Response.json(result);
  } catch (error) {
    return Response.json({ status: 'error', message: error.message, stack: error.stack }, { status: 500 });
  }
});