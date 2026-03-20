import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, file_name } = await req.json();

    if (!file_url || !file_name) {
      return Response.json({ error: 'Missing file_url or file_name' }, { status: 400 });
    }

    // Fetch file
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file');
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileExt = file_name.split('.').pop().toLowerCase();

    let analysis = {
      original_file: file_name,
      file_extension: fileExt,
      file_size: fileBuffer.byteLength,
      is_zip: false,
      contents: []
    };

    // Check if ZIP
    if (fileExt === 'zip') {
      analysis.is_zip = true;
      
      // Try to analyze ZIP structure
      const JSZip = (await import('npm:jszip')).default;
      const zip = new JSZip();
      await zip.loadAsync(fileBuffer);

      const fileTypes = {};
      const fileList = [];

      for (const [path, file] of Object.entries(zip.files)) {
        if (file.dir) continue;

        const fileName = path.split('/').pop();
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        fileTypes[fileExtension] = (fileTypes[fileExtension] || 0) + 1;
        fileList.push({
          name: fileName,
          path,
          extension: fileExtension,
          size: file._data?.uncompressedSize || 0
        });
      }

      analysis.contents = fileList;
      analysis.file_types_found = fileTypes;
      analysis.total_files = fileList.length;

      // Determine what kind of data this is
      const allExts = Object.keys(fileTypes);
      if (allExts.includes('tif') || allExts.includes('tiff') || allExts.includes('asc')) {
        analysis.data_type = 'geospatial_raster';
        analysis.description = 'Geospatial raster data (elevation, climate layers, etc.)';
      } else if (allExts.includes('shp') || allExts.includes('dbf')) {
        analysis.data_type = 'geospatial_vector';
        analysis.description = 'Geospatial vector data (shapefiles)';
      } else if (allExts.includes('csv')) {
        analysis.data_type = 'tabular_data';
        analysis.description = 'Tabular data (CSV records)';
      } else if (allExts.includes('json')) {
        analysis.data_type = 'json_data';
        analysis.description = 'JSON structured data';
      } else if (allExts.includes('geojson')) {
        analysis.data_type = 'geojson_data';
        analysis.description = 'GeoJSON geographic data';
      } else {
        analysis.data_type = 'mixed_archive';
        analysis.description = 'Mixed file archive';
      }

    } else {
      // Single file analysis
      const typeMap = {
        'tif': 'geospatial_raster',
        'tiff': 'geospatial_raster',
        'asc': 'geospatial_raster',
        'shp': 'geospatial_vector',
        'dbf': 'geospatial_vector',
        'csv': 'tabular_data',
        'json': 'json_data',
        'geojson': 'geojson_data',
        'pdf': 'document_pdf',
        'txt': 'text_file',
        'xlsx': 'spreadsheet',
        'xls': 'spreadsheet'
      };

      const dataType = typeMap[fileExt] || 'unknown';
      analysis.data_type = dataType;
      analysis.contents = [{
        name: file_name,
        extension: fileExt,
        size: fileBuffer.byteLength
      }];

      const descriptions = {
        'geospatial_raster': 'Raster data (elevation, climate, etc.)',
        'geospatial_vector': 'Vector data (shapes, boundaries)',
        'tabular_data': 'Tabular species/occurrence records',
        'json_data': 'Structured JSON data',
        'geospatial_data': 'Geographic data',
        'document_pdf': 'PDF document',
        'spreadsheet': 'Spreadsheet data',
        'text_file': 'Text file',
        'unknown': 'File type to be determined'
      };
      
      analysis.description = descriptions[dataType] || 'Unknown file type';
    }

    return Response.json({
      status: 'success',
      analysis
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});