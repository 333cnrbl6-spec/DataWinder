/**
 * Utility functions for handling species data from multiple sources.
 * Extracted from Home.jsx to reduce complexity and improve reusability.
 */

import { base44 } from '@/api/base44Client';

/**
 * Generate CSV content for MAXENT occurrences
 */
export const generateMaxentCSV = (allSpecies) => {
  const maxentData = allSpecies
    .filter(sp => sp.observations?.length > 0 || sp.gbif_occurrences?.length > 0)
    .flatMap(sp => {
      const occurrences = [
        ...(sp.observations || []).map(obs => ({
          species: sp.scientific_name,
          longitude: obs.longitude,
          latitude: obs.latitude,
          date: obs.observed_on || '',
          source: 'iNaturalist'
        })),
        ...(sp.gbif_occurrences || []).map(occ => ({
          species: sp.scientific_name,
          longitude: occ.longitude,
          latitude: occ.latitude,
          date: occ.eventDate || '',
          source: 'GBIF'
        }))
      ];
      return occurrences;
    });

  const csv = [
    'species,longitude,latitude,date,source',
    ...maxentData.map(row => 
      `"${row.species}",${row.longitude},${row.latitude},${row.date},${row.source}`
    )
  ].join('\n');

  return csv;
};

/**
 * Generate GeoJSON for ArcGIS with species range data
 */
export const generateArcGISGeoJSON = (allSpecies) => {
  const features = allSpecies
    .filter(sp => sp.range_data_geojson)
    .map(sp => ({
      type: 'Feature',
      properties: {
        scientific_name: sp.scientific_name,
        common_name: sp.common_name,
        iucn_status: sp.iucn_status,
        population_trend: sp.population_trend,
        family: sp.family,
        order: sp.order_name,
        class: sp.class_name
      },
      geometry: sp.range_data_geojson.type === 'FeatureCollection' 
        ? sp.range_data_geojson.features[0]?.geometry 
        : sp.range_data_geojson.geometry
    }))
    .filter(f => f.geometry);

  return {
    type: 'FeatureCollection',
    features
  };
};

/**
 * Generate complete species dataset CSV
 */
export const generateCompleteDatasetCSV = (allSpecies) => {
  const data = allSpecies.map(sp => ({
    scientific_name: sp.scientific_name,
    common_name: sp.common_name,
    iucn_status: sp.iucn_status,
    population_trend: sp.population_trend,
    kingdom: sp.kingdom,
    phylum: sp.phylum,
    class: sp.class_name,
    order: sp.order_name,
    family: sp.family,
    genus: sp.genus,
    countries: sp.geographic_distribution?.countries?.join('; ') || '',
    country_count: sp.geographic_distribution?.countries?.length || 0,
    habitat: sp.habitat,
    threats: sp.threats,
    conservation_actions: sp.conservation_actions,
    observation_count: (sp.observation_count || 0) + (sp.gbif_occurrence_count || 0),
    assessment_date: sp.assessment_date
  }));

  const headers = Object.keys(data[0] || {}).join(',');
  const rows = data.map(row => 
    Object.values(row).map(val => {
      const value = String(val || '').replace(/"/g, '""');
      return value.includes(',') || value.includes('"') ? `"${value}"` : value;
    }).join(',')
  );

  return [headers, ...rows].join('\n');
};

/**
 * Download CSV/JSON to user's browser
 */
export const downloadFile = (content, filename, mimeType = 'text/csv') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Parse CSV/JSON file from user upload
 */
export const parseUploadedFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        let records = [];
        if (file.name.endsWith('.json')) {
          records = JSON.parse(ev.target.result);
          if (!Array.isArray(records)) records = [records];
        } else {
          const lines = ev.target.result.split('\n').filter(Boolean);
          const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
          records = lines.slice(1).map(line => {
            const values = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
            const obj = {};
            headers.forEach((h, i) => { 
              obj[h] = (values[i] || '').replace(/^"|"$/g, '').trim(); 
            });
            return obj;
          });
        }
        resolve(records);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
};

/**
 * Import species records from parsed data
 */
export const importSpeciesRecords = async (records) => {
  let created = 0;
  const errors = [];

  for (const record of records) {
    if (!record.scientific_name) continue;
    try {
      const existing = await base44.entities.Species.filter({ 
        scientific_name: record.scientific_name 
      });
      if (existing.length === 0) {
        await base44.entities.Species.create(record);
        created++;
      }
    } catch (err) {
      errors.push(`${record.scientific_name}: ${err.message}`);
    }
  }

  return { created, errors };
};