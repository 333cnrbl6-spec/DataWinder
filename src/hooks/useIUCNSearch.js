/**
 * Custom hook to handle IUCN Red List search logic
 * Extracted from Home.jsx handleSearch function
 */

import { base44 } from '@/api/base44Client';

/**
 * Fetch and process species from IUCN
 */
export const fetchIUCNSpecies = async (terms, level, autoExpand, iucnToken) => {
  const allSpeciesMap = {};

  if (!iucnToken) {
    return allSpeciesMap;
  }

  for (const term of terms) {
    try {
      const searchResult = await base44.functions.invoke('fetchIUCNData', {
        term,
        endpoint: 'taxa',
        level,
        autoExpand
      });

      if (searchResult.data.status === 'error') {
        console.error(`IUCN API error for ${term}:`, searchResult.data.message);
        if (searchResult.data.statusCode === 401) {
          throw new Error('IUCN API token is invalid. Please check your token and try again.');
        }
        continue;
      }

      const searchData = searchResult.data.data;
      let speciesList = [];

      // Parse IUCN v4 API response
      if (searchData.assessments && searchData.assessments.length > 0) {
        const speciesByTaxonId = {};
        
        for (const assessment of searchData.assessments) {
          const sisId = assessment.sis_taxon_id || assessment.taxon_id;
          const scientificName = assessment.taxon_scientific_name || assessment.scientific_name;
          
          if (!sisId && !scientificName) continue;
          
          if (!speciesByTaxonId[sisId]) {
            speciesByTaxonId[sisId] = assessment;
          } else {
            const current = speciesByTaxonId[sisId];
            if (assessment.latest || (assessment.year_published > (current.year_published || 0))) {
              speciesByTaxonId[sisId] = assessment;
            }
          }
        }
        
        speciesList = Object.values(speciesByTaxonId);
        
        // Safety check: reject higher-taxon searches that return < 2 unique species
        if ((level === 'order' || level === 'class' || level === 'family') && speciesList.length < 2) {
          console.warn(`⚠️  IUCN ${level} search returned ${speciesList.length} unique species - likely bulk aggregate. Rejecting.`);
          throw new Error(`The IUCN ${level} search did not expand to individual species. Please select specific species manually.`);
        }
      } else if (searchData.taxon) {
        const taxon = searchData.taxon;
        const assessments = searchData.assessments || [];
        const latest = assessments.find(a => a.latest) || assessments[0];
        if (latest) {
          speciesList = [{
            sis_taxon_id: taxon.sis_id,
            taxon_scientific_name: taxon.scientific_name,
            red_list_category_code: latest.red_list_category_code,
            assessment_id: latest.assessment_id,
            latest: true,
            _taxon: taxon
          }];
        }
      }

      if (speciesList.length === 0) {
        console.warn(`No IUCN species found for ${term}`);
        continue;
      }

      // Fetch SIS assessment history for status tracking
      const uniqueSisIds = [...new Set(speciesList.map(sp => sp.sis_taxon_id).filter(Boolean))];
      const sisDataMap = {};
      
      for (let i = 0; i < uniqueSisIds.length; i += 5) {
        const chunk = uniqueSisIds.slice(i, i + 5);
        await Promise.all(chunk.map(async (sisId) => {
          try {
            const sisResult = await base44.functions.invoke('fetchIUCNData', {
              endpoint: 'sis', 
              term: String(sisId)
            });
            if (sisResult.data.status === 'success') {
              sisDataMap[sisId] = sisResult.data.data;
            }
          } catch (e) { /* non-critical */ }
        }));
      }

      speciesList = speciesList.map(sp => ({
        ...sp,
        _sisAssessments: sisDataMap[sp.sis_taxon_id]?.assessments || []
      }));

      // Fetch comprehensive details for each species
      const detailedSpecies = await Promise.all(
        speciesList.map(async (sp) => {
          return fetchIUCNSpeciesDetails(sp, term);
        })
      );

      // Automatically fetch all range data formats (GeoJSON, shapefiles, CSV) and PDFs
      for (const species of detailedSpecies) {
        if (species.iucn_id) {
          try {
            const dlResult = await base44.functions.invoke('downloadIUCNFiles', {
              scientific_name: species.scientific_name,
              assessment_id: species.assessment_id,
              iucn_id: species.iucn_id,
              range_map_jpg_url: species.range_map_jpg_url,
              range_data_shp_url: species.range_data_shp_url,
              range_data_csv_url: species.range_data_csv_url
            });
            
            if (dlResult.data?.status === 'success') {
              // Store all downloaded file URIs to species record
              if (dlResult.data.assessment_pdf_file_uri) species.assessment_pdf_file_uri = dlResult.data.assessment_pdf_file_uri;
              if (dlResult.data.range_map_jpg_file_uri) species.range_map_jpg_file_uri = dlResult.data.range_map_jpg_file_uri;
              if (dlResult.data.range_shp_file_uri) species.range_shp_file_uri = dlResult.data.range_shp_file_uri;
              if (dlResult.data.range_csv_file_uri) species.range_csv_file_uri = dlResult.data.range_csv_file_uri;
              if (dlResult.data.range_geojson_file_uri) species.range_geojson_file_uri = dlResult.data.range_geojson_file_uri;
              if (dlResult.data.range_data_geojson) species.range_data_geojson = dlResult.data.range_data_geojson;
            }
          } catch (e) {
            console.warn(`IUCN file download skipped for ${species.scientific_name}:`, e.message);
          }
        }
      }

      // Save to database
      for (const species of detailedSpecies) {
        await saveSpeciesToDatabase(species, term);
      }

      detailedSpecies.forEach(sp => {
        allSpeciesMap[sp.scientific_name] = sp;
      });

    } catch (err) {
      console.error(`Error fetching IUCN data for ${term}:`, err);
      throw err;
    }
  }

  return allSpeciesMap;
};

/**
 * Fetch comprehensive details for a single IUCN species
 */
const fetchIUCNSpeciesDetails = async (sp, term) => {
  try {
    const sisId = sp.sis_taxon_id;
    const assessmentId = sp.assessment_id;
    const scientificName = sp.taxon_scientific_name;

    const assessmentResult = assessmentId
      ? await base44.functions.invoke('fetchIUCNData', {
          endpoint: 'assessment',
          term: String(assessmentId)
        })
      : { data: { status: 'error' } };

    const a = assessmentResult.data.status === 'success' ? assessmentResult.data.data : null;

    const habitats = a?.habitats || [];
    const threats = a?.threats || [];
    const conservationActionsArr = a?.conservation_actions || [];
    const doc = a?.documentation || {};
    const populationTrendCode = (a?.population_trend?.code || 'unknown').toLowerCase();
    const redListCode = a?.red_list_category?.code || sp.red_list_category_code || 'NE';
    const taxonInfo = a?.taxon || sp._taxon || {};

    // Upload search summary to backend
    let searchSummaryFileUri = null;
    const searchSummary = buildIUCNSearchSummary(scientificName, sisId, assessmentId, a, habitats, threats, sp._sisAssessments);
    try {
      const searchSummaryBlob = new Blob([JSON.stringify(searchSummary, null, 2)], { type: 'application/json' });
      const searchSummaryFile = new File([searchSummaryBlob], `${scientificName.replace(/ /g, '_')}_search_summary.json`, { type: 'application/json' });
      const { file_uri: summaryUri } = await base44.integrations.Core.UploadPrivateFile({ file: searchSummaryFile });
      searchSummaryFileUri = summaryUri;
    } catch (err) {
      console.error('Error uploading search summary:', err);
    }

    // Fetch images
    let allImages = [];
    if (sisId) {
      try {
        const imagesRes = await base44.functions.invoke('fetchIUCNData', {
          endpoint: 'sis',
          term: String(sisId)
        });
        if (imagesRes.data?.status === 'success') {
          const sisImgData = imagesRes.data.data;
          allImages = (sisImgData?.taxon?.image_links || []).map(img => img.url).filter(Boolean);
        }
      } catch (err) {
        console.error('Error fetching images:', err);
      }
    }

    const commonName = (taxonInfo.common_names || []).find(c => c.main && c.language === 'eng')?.name
      || (taxonInfo.common_names || []).find(c => c.language === 'eng')?.name
      || (taxonInfo.common_names || [])[0]?.name || '';

    const populationDetails = doc.population || '';
    const rangeDesc = doc.range || '';
    const habitatDesc = doc.habitat || '';
    const threatsDesc = doc.threats || '';
    const conservationActionsText = doc.conservation_actions || '';

    const conservationActions = conservationActionsText || 
      conservationActionsArr.map(ca => ca.description?.en || ca.title || '').filter(Boolean).join('; ');

    const countryNames = [];
    const regions = (a?.scopes || []).map(s => s.description?.en || '').filter(Boolean);

    const statusHistory = (sp._sisAssessments || []).map(h => ({
      year: parseInt(h.year_published),
      status: h.red_list_category_code,
      category: h.red_list_category_code
    }));

    return {
      id: `iucn-${sisId}`,
      scientific_name: scientificName,
      common_name: commonName,
      iucn_status: redListCode,
      population_trend: populationTrendCode,
      population_details: populationDetails,
      status_history: statusHistory,
      geographic_distribution: {
        countries: countryNames,
        regions,
        area_km2: null
      },
      kingdom: taxonInfo.kingdom_name || '',
      phylum: taxonInfo.phylum_name || '',
      class_name: taxonInfo.class_name || '',
      order_name: taxonInfo.order_name || '',
      family: taxonInfo.family_name || '',
      genus: taxonInfo.genus_name || '',
      image_url: allImages.length > 0 ? allImages[0] : null,
      habitat: habitatDesc,
      habitats_detailed: habitats.map(h => ({
        code: h.code,
        habitat: h.description?.en || h.description || '',
        suitability: h.suitability?.description?.en || h.suitability || '',
        season: h.season?.description?.en || h.season || '',
        major_importance: h.major_importance
      })),
      range_description: rangeDesc,
      threats: threatsDesc,
      threats_detailed: threats.map(t => ({
        code: t.code,
        title: t.title || t.description?.en || '',
        timing: t.timing?.description?.en || t.timing || '',
        scope: t.scope?.description?.en || t.scope || '',
        severity: t.severity?.description?.en || t.severity || ''
      })),
      conservation_actions: conservationActions,
      assessment_date: a?.year_published ? `${a.year_published}-01-01` : null,
      iucn_id: sisId,
      assessment_id: assessmentId,
      assessment_pdf_url: assessmentId ? `https://www.iucnredlist.org/documents/redlist/assessments/en/${assessmentId}.pdf` : null,
      range_map_jpg_url: sisId ? `https://www.iucnredlist.org/content/application/cms/calc/output_map_png.png?sis_id=${sisId}` : null,
      range_data_shp_url: sisId ? `https://www.iucnredlist.org/species/spatial-data/${sisId}` : null,
      range_data_csv_url: sisId ? `https://www.iucnredlist.org/species/range-points/${sisId}` : null,
      range_data_geojson: null,
      search_summary_json: searchSummary,
      search_results_csv_url: `https://www.iucnredlist.org/search/export?query=${encodeURIComponent(term)}&searchType=species`,
      all_images_urls: allImages,
      dataset_name: term,
      data_source: 'IUCN Red List',
      search_summary_file_uri: searchSummaryFileUri,
      // Range file URIs will be populated by downloadIUCNRangeData
      range_geojson_file_uri: null,
      range_shp_file_uri: null,
      range_csv_file_uri: null,
      range_map_jpg_file_uri: null,
      assessment_pdf_file_uri: null
    };
  } catch (err) {
    console.error(`Error fetching comprehensive details:`, err);
    return {
      id: `iucn-${sp.sis_taxon_id || sp.taxonid}`,
      scientific_name: sp.taxon_scientific_name || sp.scientific_name,
      common_name: '',
      iucn_status: sp.red_list_category_code || sp.category || 'NE',
      iucn_id: sp.sis_taxon_id || sp.taxonid,
      assessment_id: sp.assessment_id,
      dataset_name: term,
      data_source: 'IUCN Red List'
    };
  }
};

/**
 * Build IUCN search summary JSON
 */
const buildIUCNSearchSummary = (scientificName, sisId, assessmentId, a, habitats, threats, sisAssessments) => {
  const doc = a?.documentation || {};
  return {
    taxon_id: sisId,
    scientific_name: scientificName,
    common_name: '',
    category: a?.red_list_category?.code || 'NE',
    population_trend: (a?.population_trend?.code || 'unknown').toLowerCase(),
    population: doc.population || '',
    assessment_date: a?.year_published,
    countries: [],
    regions: (a?.scopes || []).map(s => s.description?.en || '').filter(Boolean),
    habitats: habitats.map(h => ({
      code: h.code,
      habitat: h.description?.en || h.description || '',
      suitability: h.suitability?.description?.en || h.suitability || '',
      season: h.season?.description?.en || h.season || ''
    })),
    threats: threats.map(t => ({
      code: t.code,
      title: t.title || t.description?.en || '',
      timing: t.timing?.description?.en || t.timing || '',
      scope: t.scope?.description?.en || t.scope || '',
      severity: t.severity?.description?.en || t.severity || ''
    })),
    conservation_measures: (a?.conservation_actions || []).map(ca => ca.description?.en || ca.title || '').filter(Boolean).join('; '),
    range_description: doc.range || '',
    habitat_description: doc.habitat || '',
    threats_description: doc.threats || '',
    use_and_trade: doc.use_trade || '',
    range_data_points: null,
    assessment_id: assessmentId
  };
};

/**
 * Save species to database, handling both new and existing records
 */
const saveSpeciesToDatabase = async (species, term) => {
  try {
    const existing = await base44.entities.Species.filter({
      scientific_name: species.scientific_name
    });

    if (existing.length > 0) {
      // Create pending update for review
      const newDataFields = buildPendingUpdateFields(species, existing[0]);
      if (Object.keys(newDataFields).length > 0) {
        await base44.entities.PendingSpeciesUpdate.create({
          species_id: existing[0].id,
          scientific_name: species.scientific_name,
          current_data: existing[0],
          new_data: newDataFields,
          data_source: 'IUCN Red List',
          status: 'pending'
        });
      }
    } else {
      // Create new species record
      await base44.entities.Species.create(buildSpeciesCreatePayload(species));
    }
  } catch (err) {
    console.error(`Error saving species ${species.scientific_name}:`, err);
  }
};

/**
 * Build fields for pending update check
 */
const buildPendingUpdateFields = (newSpecies, existing) => {
  const fields = {};
  const fieldsToCheck = [
    'common_name', 'kingdom', 'phylum', 'class_name', 'order_name', 'family', 'genus',
    'iucn_status', 'population_trend', 'population_details', 'status_history',
    'geographic_distribution', 'habitat', 'habitats_detailed', 'range_description',
    'threats', 'threats_detailed', 'conservation_actions', 'assessment_date', 'iucn_id',
    'assessment_id', 'assessment_pdf_url', 'range_map_jpg_url', 'range_data_shp_url',
    'range_data_csv_url', 'range_data_geojson', 'search_summary_json', 'search_results_csv_url',
    'all_images_urls', 'image_url', 'search_summary_file_uri', 'range_geojson_file_uri',
    'assessment_pdf_file_uri', 'range_shp_file_uri', 'range_csv_file_uri', 'range_map_jpg_file_uri'
  ];

  for (const field of fieldsToCheck) {
    const newValue = newSpecies[field];
    const oldValue = existing[field];
    
    if (newValue === undefined || newValue === null) continue;
    
    if (typeof newValue === 'object') {
      if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
        fields[field] = newValue;
      }
    } else if (newValue !== oldValue) {
      fields[field] = newValue;
    }
  }

  return fields;
};

/**
 * Build payload for creating new species
 */
const buildSpeciesCreatePayload = (species) => {
  return {
    scientific_name: species.scientific_name,
    common_name: species.common_name,
    kingdom: species.kingdom,
    phylum: species.phylum,
    class_name: species.class_name,
    order_name: species.order_name,
    family: species.family,
    genus: species.genus,
    iucn_status: species.iucn_status,
    population_trend: species.population_trend,
    population_details: species.population_details,
    status_history: species.status_history,
    geographic_distribution: species.geographic_distribution,
    habitat: species.habitat,
    habitats_detailed: species.habitats_detailed,
    range_description: species.range_description,
    threats: species.threats,
    threats_detailed: species.threats_detailed,
    conservation_actions: species.conservation_actions,
    assessment_date: species.assessment_date,
    iucn_id: species.iucn_id,
    assessment_id: species.assessment_id,
    assessment_pdf_url: species.assessment_pdf_url,
    range_map_jpg_url: species.range_map_jpg_url,
    range_data_shp_url: species.range_data_shp_url,
    range_data_csv_url: species.range_data_csv_url,
    range_data_geojson: species.range_data_geojson,
    search_summary_json: species.search_summary_json,
    search_results_csv_url: species.search_results_csv_url,
    all_images_urls: species.all_images_urls,
    image_url: species.image_url,
    search_summary_file_uri: species.search_summary_file_uri,
    range_geojson_file_uri: species.range_geojson_file_uri,
    assessment_pdf_file_uri: species.assessment_pdf_file_uri,
    range_shp_file_uri: species.range_shp_file_uri,
    range_csv_file_uri: species.range_csv_file_uri,
    range_map_jpg_file_uri: species.range_map_jpg_file_uri
  };
};