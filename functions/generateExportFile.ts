import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import JSZip from 'npm:jszip@3.10.1';

const csvEscape = (val) => {
  const s = String(val ?? '').replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
};
const csvRow = (vals) => vals.map(csvEscape).join(',');

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { speciesIds, dataTypes, exportName, exportDescription, outlierExclusions } = await req.json();

  if (!speciesIds?.length || !dataTypes?.length) {
    return Response.json({ error: 'Please select species and at least one data type' }, { status: 400 });
  }

  const allSpecies = await base44.entities.Species.list();
  const species = allSpecies.filter(sp => speciesIds.includes(sp.id));

  if (!species.length) {
    return Response.json({ error: 'No species found for the given IDs' }, { status: 404 });
  }

  const zip = new JSZip();

  // 1. Species Summary CSV
  if (dataTypes.includes('species_summary')) {
    const headers = 'scientific_name,common_name,kingdom,phylum,class_name,order_name,family,genus,iucn_status,population_trend,habitat,countries,iucn_id,gbif_id,inat_taxon_id,assessment_date';
    const rows = species.map(sp => csvRow([
      sp.scientific_name, sp.common_name, sp.kingdom, sp.phylum,
      sp.class_name, sp.order_name, sp.family, sp.genus,
      sp.iucn_status, sp.population_trend, sp.habitat,
      sp.geographic_distribution?.countries?.join('; ') || '',
      sp.iucn_id || '', sp.gbif_id || '', sp.inat_taxon_id || '', sp.assessment_date || ''
    ]));
    zip.file('species_summary.csv', [headers, ...rows].join('\n'));
  }

  // Helper: filter observations/occurrences by outlier exclusions
  const getObservations = (sp) => {
    const excl = outlierExclusions?.[sp.id];
    const inatIdxs = new Set(excl?.inatIdxs || []);
    const gbifIdxs = new Set(excl?.gbifIdxs || []);
    const observations = (sp.observations || []).filter((_, i) => !inatIdxs.has(i));
    const gbif_occurrences = (sp.gbif_occurrences || []).filter((_, i) => !gbifIdxs.has(i));
    return { observations, gbif_occurrences };
  };

  // 2. MAXENT Occurrences CSV (species, longitude, latitude)
  if (dataTypes.includes('occurrences_maxent')) {
    const rows = ['species,longitude,latitude'];
    species.forEach(sp => {
      const { observations, gbif_occurrences } = getObservations(sp);
      observations.forEach(obs => {
        if (obs.longitude != null && obs.latitude != null)
          rows.push(csvRow([sp.scientific_name, obs.longitude, obs.latitude]));
      });
      gbif_occurrences.forEach(occ => {
        if (occ.decimalLongitude != null && occ.decimalLatitude != null)
          rows.push(csvRow([sp.scientific_name, occ.decimalLongitude, occ.decimalLatitude]));
      });
    });
    zip.file('maxent_occurrences.csv', rows.join('\n'));
  }

  // 3. ArcGIS Points CSV
  if (dataTypes.includes('occurrences_arcgis')) {
    const rows = ['scientific_name,common_name,iucn_status,longitude,latitude,source,observation_date'];
    species.forEach(sp => {
      const { observations, gbif_occurrences } = getObservations(sp);
      observations.forEach(obs => {
        if (obs.longitude != null && obs.latitude != null)
          rows.push(csvRow([sp.scientific_name, sp.common_name || '', sp.iucn_status || '', obs.longitude, obs.latitude, 'iNaturalist', obs.observed_on || '']));
      });
      gbif_occurrences.forEach(occ => {
        if (occ.decimalLongitude != null && occ.decimalLatitude != null)
          rows.push(csvRow([sp.scientific_name, sp.common_name || '', sp.iucn_status || '', occ.decimalLongitude, occ.decimalLatitude, 'GBIF', occ.eventDate || '']));
      });
    });
    zip.file('arcgis_points.csv', rows.join('\n'));
  }

  // 4. Range GeoJSON FeatureCollection
  if (dataTypes.includes('range_geojson')) {
    const features = [];
    species.forEach(sp => {
      if (!sp.range_data_geojson) return;
      const g = sp.range_data_geojson;
      const props = { scientific_name: sp.scientific_name, common_name: sp.common_name || '', iucn_status: sp.iucn_status || '' };
      if (g.features) {
        g.features.forEach(f => features.push({ ...f, properties: { ...f.properties, ...props } }));
      } else if (g.type === 'Feature') {
        features.push({ ...g, properties: { ...(g.properties || {}), ...props } });
      }
    });
    zip.file('species_ranges.geojson', JSON.stringify({ type: 'FeatureCollection', features }, null, 2));
  }

  // 5. GBIF Occurrences CSV
  if (dataTypes.includes('gbif_occurrences')) {
    const rows = ['scientific_name,gbif_key,latitude,longitude,country,state_province,event_date,basis_of_record,institution'];
    species.forEach(sp => {
      const { gbif_occurrences } = getObservations(sp);
      gbif_occurrences.forEach(occ => {
        rows.push(csvRow([
          sp.scientific_name, occ.key || '', occ.decimalLatitude || '', occ.decimalLongitude || '',
          occ.countryCode || '', occ.stateProvince || '', occ.eventDate || '', occ.basisOfRecord || '', occ.institutionCode || ''
        ]));
      });
    });
    zip.file('gbif_occurrences.csv', rows.join('\n'));
  }

  // 6. iNaturalist Observations CSV
  if (dataTypes.includes('inat_observations')) {
    const rows = ['scientific_name,latitude,longitude,location,date,observer,photo_url'];
    species.forEach(sp => {
      const { observations } = getObservations(sp);
      observations.forEach(obs => {
        rows.push(csvRow([
          sp.scientific_name, obs.latitude || '', obs.longitude || '',
          obs.location || '', obs.observed_on || '', obs.user || '', obs.photo_url || ''
        ]));
      });
    });
    zip.file('inat_observations.csv', rows.join('\n'));
  }

  // 7. Habitats & Threats JSON
  if (dataTypes.includes('habitats_threats')) {
    const data = species.map(sp => ({
      scientific_name: sp.scientific_name,
      common_name: sp.common_name || '',
      habitats: sp.habitats_detailed || [],
      threats: sp.threats_detailed || []
    }));
    zip.file('habitats_threats.json', JSON.stringify(data, null, 2));
  }

  // Generate ZIP buffer
  const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
  const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });

  // Upload to private storage
  const uploadResult = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: zipBlob });

  // Create ExportedFile record
  const name = exportName?.trim() || `Export ${new Date().toLocaleDateString('en-GB')}`;
  const description = exportDescription?.trim() || `${species.length} species — ${dataTypes.map(d => d.replace(/_/g, ' ')).join(', ')}`;
  const record = await base44.entities.ExportedFile.create({
    name,
    description,
    file_uri: uploadResult.file_uri,
    file_type: 'ZIP',
    species_count: species.length,
    species_names: species.map(sp => sp.scientific_name),
    data_types: dataTypes,
    status: 'ready'
  });

  return Response.json({ success: true, file: record });
});