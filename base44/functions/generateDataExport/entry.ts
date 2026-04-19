import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      project_id,
      export_type,
      data_components,
      filters
    } = await req.json();

    if (!project_id || !export_type || !data_components) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Create export job record
    const project = await base44.entities.Project.filter({ id: project_id });
    if (!project || project.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const exportJob = await base44.entities.ExportJob.create({
      project_id,
      project_name: project[0].title,
      export_type,
      data_components,
      filters: filters || {},
      requested_by: user.email,
      requested_by_name: user.full_name,
      status: 'processing',
      progress_pct: 0
    });

    // Collect data based on components
    const exportData = {
      metadata: {
        project: project[0],
        exported_at: new Date().toISOString(),
        exported_by: user.full_name,
        export_type,
        components: data_components
      },
      species: [],
      occurrences: [],
      occurrence_notes: [],
      sdm_results: [],
      validation_flags: []
    };

    let recordCount = 0;

    // Fetch species metadata
    if (data_components.includes('species_metadata') && project[0].species_ids?.length > 0) {
      const species = await base44.entities.Species.filter(
        { id: { $in: project[0].species_ids } },
        null,
        100
      );
      exportData.species = species;
      recordCount += species.length;

      await base44.entities.ExportJob.update(exportJob.id, { progress_pct: 20 });
    }

    // Fetch occurrence records
    if (data_components.includes('occurrence_records') && project[0].occurrence_ids?.length > 0) {
      // For large datasets, fetch in batches
      const occurrences = await base44.entities.OccurrenceNote.filter(
        { id: { $in: project[0].occurrence_ids } },
        null,
        500
      );
      exportData.occurrences = occurrences;
      recordCount += occurrences.length;

      await base44.entities.ExportJob.update(exportJob.id, { progress_pct: 40 });
    }

    // Fetch occurrence notes
    if (data_components.includes('occurrence_notes') && project[0].species_ids?.length > 0) {
      const notes = await base44.entities.OccurrenceNote.filter(
        { species_id: { $in: project[0].species_ids } },
        '-created_date',
        300
      );
      exportData.occurrence_notes = notes;

      await base44.entities.ExportJob.update(exportJob.id, { progress_pct: 60 });
    }

    // Fetch SDM results
    if (data_components.includes('sdm_results') && project[0].sdm_run_ids?.length > 0) {
      const runs = await base44.entities.SDMRun.filter(
        { id: { $in: project[0].sdm_run_ids } },
        null,
        50
      );
      exportData.sdm_results = runs.map(r => ({
        id: r.id,
        name: r.name,
        species_names: r.species_names,
        status: r.status,
        metrics: r.metrics,
        variable_importance: r.variable_importance,
        occurrence_stats: r.occurrence_stats,
        runtime_seconds: r.runtime_seconds,
        created_date: r.created_date
      }));
      recordCount += runs.length;

      await base44.entities.ExportJob.update(exportJob.id, { progress_pct: 80 });
    }

    // Fetch validation flags
    if (data_components.includes('validation_flags') && project[0].species_ids?.length > 0) {
      const flags = await base44.entities.ValidationFlag.filter(
        { species_id: { $in: project[0].species_ids } },
        '-created_date',
        500
      );
      exportData.validation_flags = flags;

      await base44.entities.ExportJob.update(exportJob.id, { progress_pct: 90 });
    }

    // Generate file based on export_type
    let csvContent = '';

    if (export_type === 'csv') {
      csvContent = generateCSV(exportData);
    } else if (export_type === 'geojson') {
      csvContent = generateGeoJSON(exportData);
    }

    // Upload file
    const fileName = `${project[0].title.replace(/\s+/g, '_')}_export_${Date.now()}`;
    const fileExtension = export_type === 'geojson' ? 'geojson' : 'csv';
    const mimeType = export_type === 'geojson' ? 'application/geo+json' : 'text/csv';

    const blob = new Blob([csvContent], { type: mimeType });
    const uploadedFile = await base44.integrations.Core.UploadFile({ file: blob });

    const fileSizeMb = blob.size / (1024 * 1024);

    // Update export job with completion
    await base44.entities.ExportJob.update(exportJob.id, {
      status: 'completed',
      progress_pct: 100,
      file_url: uploadedFile.file_url,
      file_size_mb: parseFloat(fileSizeMb.toFixed(2)),
      record_count: recordCount,
      completed_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      export_job_id: exportJob.id,
      file_url: uploadedFile.file_url,
      file_size_mb: fileSizeMb.toFixed(2),
      record_count: recordCount
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateCSV(data) {
  const rows = [];

  // Add metadata header
  rows.push('# Export Metadata');
  rows.push(`# Project: ${data.metadata.project.title}`);
  rows.push(`# Exported: ${data.metadata.exported_at}`);
  rows.push(`# Components: ${data.metadata.components.join(', ')}`);
  rows.push('');

  // Species data
  if (data.species.length > 0) {
    rows.push('## SPECIES DATA');
    const speciesHeaders = ['ID', 'Scientific Name', 'Common Name', 'IUCN Status', 'Population Trend', 'Observation Count'];
    rows.push(speciesHeaders.join(','));
    data.species.forEach(s => {
      rows.push([
        s.id || '',
        `"${(s.scientific_name || '').replace(/"/g, '""')}"`,
        `"${(s.common_name || '').replace(/"/g, '""')}"`,
        s.iucn_status || '',
        s.population_trend || '',
        s.observation_count || 0
      ].join(','));
    });
    rows.push('');
  }

  // Occurrence records
  if (data.occurrences.length > 0) {
    rows.push('## OCCURRENCE RECORDS');
    const occHeaders = ['ID', 'Species ID', 'Species Name', 'Latitude', 'Longitude', 'Date', 'Source', 'Validation Status'];
    rows.push(occHeaders.join(','));
    data.occurrences.forEach(o => {
      rows.push([
        o.id || '',
        o.species_id || '',
        `"${(o.species_name || '').replace(/"/g, '""')}"`,
        o.latitude || '',
        o.longitude || '',
        o.occurrence_date || '',
        o.source || '',
        o.validation_status || ''
      ].join(','));
    });
    rows.push('');
  }

  // SDM Results
  if (data.sdm_results.length > 0) {
    rows.push('## SDM MODEL RESULTS');
    const sdmHeaders = ['Run ID', 'Model Name', 'Species', 'Status', 'AUC', 'TSS', 'Records Used', 'Runtime (s)'];
    rows.push(sdmHeaders.join(','));
    data.sdm_results.forEach(r => {
      rows.push([
        r.id || '',
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.species_names?.join('; ') || '').replace(/"/g, '""')}"`,
        r.status || '',
        r.metrics?.auc || '',
        r.metrics?.tss || '',
        r.occurrence_stats?.after_thinning || '',
        r.runtime_seconds || ''
      ].join(','));
    });
    rows.push('');
  }

  return rows.join('\n');
}

function generateGeoJSON(data) {
  const features = [];

  // Convert occurrences to GeoJSON features
  if (data.occurrences.length > 0) {
    data.occurrences.forEach(occ => {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [occ.longitude, occ.latitude]
        },
        properties: {
          id: occ.id,
          species: occ.species_name,
          species_id: occ.species_id,
          date: occ.occurrence_date,
          source: occ.source,
          validation_status: occ.validation_status
        }
      });
    });
  }

  return JSON.stringify({
    type: 'FeatureCollection',
    features,
    properties: {
      project: data.metadata.project.title,
      exported_at: data.metadata.exported_at,
      record_count: features.length
    }
  }, null, 2);
}