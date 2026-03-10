import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { taxonid, scientific_name, token: bodyToken } = body;

    const token = bodyToken || user.iucn_api_token;
    if (!token) return Response.json({ error: 'No IUCN token configured' }, { status: 400 });
    if (!taxonid || !scientific_name) return Response.json({ error: 'Missing taxonid or scientific_name' }, { status: 400 });

    const safeName = scientific_name.replace(/ /g, '_');
    // IUCN API v4 uses Token auth header
    const authHeaders = { 'Authorization': `Token ${token}` };
    const result = { logs: [] };

    // Test basic API connectivity first
    try {
      const testUrl = `https://api.iucnredlist.org/api/v4/taxa/sis/${taxonid}`;
      result.logs.push(`Testing API: ${testUrl}`);
      const testRes = await fetch(testUrl, { headers: authHeaders });
      result.logs.push(`API test status: ${testRes.status}`);
      const testText = await testRes.text();
      result.logs.push(`API test body (first 200 chars): ${testText.substring(0, 200)}`);
    } catch (e) {
      result.logs.push(`API test error: ${e.message}`);
    }

    // Download Assessment PDF via API
    try {
      // Get assessment ID first to form PDF URL
      const assessUrl = `https://api.iucnredlist.org/api/v4/taxa/sis/${taxonid}/assessments`;
      result.logs.push(`Fetching assessments: ${assessUrl}`);
      const assessRes = await fetch(assessUrl, { headers: authHeaders });
      result.logs.push(`Assessments status: ${assessRes.status}`);
      if (assessRes.ok) {
        const assessData = await assessRes.json();
        result.logs.push(`Assessment data keys: ${Object.keys(assessData).join(', ')}`);
        const assessmentId = assessData.assessments?.[0]?.assessment_id || assessData[0]?.assessment_id;
        result.logs.push(`Assessment ID: ${assessmentId}`);

        if (assessmentId) {
          const pdfUrl = `https://api.iucnredlist.org/api/v4/assessment/${assessmentId}/pdf`;
          result.logs.push(`Fetching PDF: ${pdfUrl}`);
          const pdfRes = await fetch(pdfUrl, { headers: { ...authHeaders, 'Accept': 'application/pdf' } });
          result.logs.push(`PDF status: ${pdfRes.status}, content-type: ${pdfRes.headers.get('content-type')}`);
          if (pdfRes.ok) {
            const pdfBytes = await pdfRes.arrayBuffer();
            result.logs.push(`PDF size: ${pdfBytes.byteLength} bytes`);
            if (pdfBytes.byteLength > 1000) {
              const pdfFile = new File([pdfBytes], `${safeName}_assessment.pdf`, { type: 'application/pdf' });
              const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: pdfFile });
              result.assessment_pdf_file_uri = file_uri;
              result.logs.push(`PDF uploaded: ${file_uri}`);
            }
          }
        }
      }
    } catch (e) { result.logs.push(`PDF error: ${e.message}`); }

    // Download Range Map
    try {
      const mapUrl = `https://api.iucnredlist.org/api/v4/taxa/sis/${taxonid}/ranges/map`;
      result.logs.push(`Fetching map: ${mapUrl}`);
      const mapRes = await fetch(mapUrl, { headers: { ...authHeaders, 'Accept': 'image/jpeg' } });
      result.logs.push(`Map status: ${mapRes.status}, content-type: ${mapRes.headers.get('content-type')}`);
      if (mapRes.ok) {
        const mapBytes = await mapRes.arrayBuffer();
        result.logs.push(`Map size: ${mapBytes.byteLength} bytes`);
        if (mapBytes.byteLength > 1000) {
          const mapFile = new File([mapBytes], `${safeName}_range_map.jpg`, { type: 'image/jpeg' });
          const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: mapFile });
          result.range_map_jpg_file_uri = file_uri;
          result.logs.push(`Map uploaded: ${file_uri}`);
        }
      }
    } catch (e) { result.logs.push(`Map error: ${e.message}`); }

    // Download Range SHP
    try {
      const shpUrl = `https://api.iucnredlist.org/api/v4/taxa/sis/${taxonid}/ranges/assessment`;
      result.logs.push(`Fetching SHP: ${shpUrl}`);
      const shpRes = await fetch(shpUrl, { headers: { ...authHeaders, 'Accept': 'application/zip' } });
      result.logs.push(`SHP status: ${shpRes.status}, content-type: ${shpRes.headers.get('content-type')}`);
      if (shpRes.ok) {
        const shpBytes = await shpRes.arrayBuffer();
        result.logs.push(`SHP size: ${shpBytes.byteLength} bytes`);
        if (shpBytes.byteLength > 100) {
          const shpFile = new File([shpBytes], `${safeName}_range_data.zip`, { type: 'application/zip' });
          const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: shpFile });
          result.range_shp_file_uri = file_uri;
          result.logs.push(`SHP uploaded: ${file_uri}`);
        }
      }
    } catch (e) { result.logs.push(`SHP error: ${e.message}`); }

    result.status = 'success';
    return Response.json(result);
  } catch (error) {
    return Response.json({ status: 'error', message: error.message }, { status: 500 });
  }
});