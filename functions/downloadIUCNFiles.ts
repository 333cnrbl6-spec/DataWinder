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
    const authHeaders = { 'Authorization': `Bearer ${token}` };
    const result = {};

    // Download Assessment PDF
    try {
      const url = `https://www.iucnredlist.org/species/pdf/${taxonid}`;
      console.log('Fetching PDF from:', url);
      const pdfRes = await fetch(url, { headers: authHeaders });
      console.log('PDF response status:', pdfRes.status, pdfRes.headers.get('content-type'));
      if (pdfRes.ok) {
        const pdfBytes = await pdfRes.arrayBuffer();
        console.log('PDF bytes:', pdfBytes.byteLength);
        const pdfFile = new File([pdfBytes], `${safeName}_assessment.pdf`, { type: 'application/pdf' });
        const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: pdfFile });
        result.assessment_pdf_file_uri = file_uri;
        console.log('PDF uploaded:', file_uri);
      }
    } catch (e) { console.error('PDF download failed:', e.message); }

    // Download Range Map JPG
    try {
      const url = `https://www.iucnredlist.org/species/map/png/${taxonid}`;
      console.log('Fetching map from:', url);
      const mapRes = await fetch(url, { headers: authHeaders });
      console.log('Map response status:', mapRes.status, mapRes.headers.get('content-type'));
      if (mapRes.ok) {
        const mapBytes = await mapRes.arrayBuffer();
        console.log('Map bytes:', mapBytes.byteLength);
        const mapFile = new File([mapBytes], `${safeName}_range_map.jpg`, { type: 'image/jpeg' });
        const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: mapFile });
        result.range_map_jpg_file_uri = file_uri;
        console.log('Map uploaded:', file_uri);
      }
    } catch (e) { console.error('Map download failed:', e.message); }

    // Download Range SHP (zip)
    try {
      const url = `https://api.iucnredlist.org/api/v4/taxa/sis/${taxonid}/ranges/assessment`;
      console.log('Fetching SHP from:', url);
      const shpRes = await fetch(url, { headers: { ...authHeaders, 'Accept': 'application/zip' } });
      console.log('SHP response status:', shpRes.status, shpRes.headers.get('content-type'));
      if (shpRes.ok) {
        const shpBytes = await shpRes.arrayBuffer();
        console.log('SHP bytes:', shpBytes.byteLength);
        const shpFile = new File([shpBytes], `${safeName}_range_data.zip`, { type: 'application/zip' });
        const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: shpFile });
        result.range_shp_file_uri = file_uri;
        console.log('SHP uploaded:', file_uri);
      }
    } catch (e) { console.error('SHP download failed:', e.message); }

    return Response.json({ status: 'success', ...result });
  } catch (error) {
    console.error('Fatal error:', error.message);
    return Response.json({ status: 'error', message: error.message }, { status: 500 });
  }
});