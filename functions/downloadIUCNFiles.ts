import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.iucn_api_token) return Response.json({ error: 'No IUCN token' }, { status: 400 });

    const { taxonid, scientific_name } = await req.json();
    if (!taxonid || !scientific_name) return Response.json({ error: 'Missing taxonid or scientific_name' }, { status: 400 });

    const token = user.iucn_api_token;
    const safeName = scientific_name.replace(/ /g, '_');
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': '*/*' };
    const result = {};

    // Download Assessment PDF
    try {
      const pdfRes = await fetch(`https://www.iucnredlist.org/species/pdf/${taxonid}`, { headers });
      if (pdfRes.ok) {
        const pdfBytes = await pdfRes.arrayBuffer();
        const pdfFile = new File([pdfBytes], `${safeName}_assessment.pdf`, { type: 'application/pdf' });
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: pdfFile });
        result.assessment_pdf_file_uri = file_uri;
      }
    } catch (e) { console.error('PDF download failed:', e.message); }

    // Download Range Map JPG
    try {
      const mapRes = await fetch(`https://www.iucnredlist.org/species/map/png/${taxonid}`, { headers });
      if (mapRes.ok) {
        const mapBytes = await mapRes.arrayBuffer();
        const mapFile = new File([mapBytes], `${safeName}_range_map.jpg`, { type: 'image/jpeg' });
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: mapFile });
        result.range_map_jpg_file_uri = file_uri;
      }
    } catch (e) { console.error('Map download failed:', e.message); }

    // Download Range SHP (zip)
    try {
      const shpRes = await fetch(`https://api.iucnredlist.org/api/v4/taxa/sis/${taxonid}/ranges/assessment`, { headers: { ...headers, 'Accept': 'application/zip' } });
      if (shpRes.ok) {
        const shpBytes = await shpRes.arrayBuffer();
        const shpFile = new File([shpBytes], `${safeName}_range_data.zip`, { type: 'application/zip' });
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: shpFile });
        result.range_shp_file_uri = file_uri;
      }
    } catch (e) { console.error('SHP download failed:', e.message); }

    return Response.json({ status: 'success', ...result });
  } catch (error) {
    return Response.json({ status: 'error', message: error.message }, { status: 500 });
  }
});