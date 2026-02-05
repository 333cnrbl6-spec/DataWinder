import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Leaf, AlertCircle, Info, Database, Grid3x3, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import TaxonomicSearch from '@/components/species/TaxonomicSearch';
import SpeciesGrid from '@/components/species/SpeciesGrid';
import MapView from '@/components/species/MapView';
import SelectionBar from '@/components/species/SelectionBar';
import DownloadPanel from '@/components/species/DownloadPanel';
import StatusBadge, { statusConfig } from '@/components/species/StatusBadge';
import CompareSpecies from '@/components/species/CompareSpecies';
import SpeciesListManager from '@/components/species/SpeciesListManager';
import SpeciesNotes from '@/components/species/SpeciesNotes';
import OnboardingWizard from '@/components/OnboardingWizard';
import BangOnLogo from '@/components/BangOnLogo';
import LogoShowcase from '@/components/LogoShowcase';
import SaveSearchPanel from '@/components/SaveSearchPanel';

export default function Home() {
  const [species, setSpecies] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDownload, setShowDownload] = useState(false);
  const [searchInfo, setSearchInfo] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [showCompare, setShowCompare] = useState(false);
  const [showListManager, setShowListManager] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteSpecies, setNoteSpecies] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showLogoSelector, setShowLogoSelector] = useState(false);
  const [showSaveSearch, setShowSaveSearch] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const user = await base44.auth.me();
        if (!user.onboarding_completed) {
          setShowOnboarding(true);
        } else {
          setOnboardingChecked(true);
        }
      } catch (error) {
        // User not logged in, redirect to login with next URL
        base44.auth.redirectToLogin(window.location.pathname);
      }
    };
    checkOnboarding();
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setOnboardingChecked(true);
  };

  const handleSearch = async ({ level, terms, iucnToken, includeINaturalist = true }) => {
    if (!onboardingChecked) {
      setShowOnboarding(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSpecies([]);
    setSelectedIds([]);
    setSearchInfo({ level, terms: terms.join(', ') });

    try {
      let allSpecies = [];

      // Search IUCN for each term - always fetch individual species
      if (iucnToken) {
        for (const term of terms) {
          try {
            // Use backend function to fetch IUCN data
            const searchResult = await base44.functions.fetchIUCNData({
              level: level,
              term: term,
              endpoint: 'taxa',
              iucnToken: iucnToken
            });

            if (searchResult.status === 'error') {
              console.error(`IUCN API error for ${term}:`, searchResult.message);
              if (searchResult.statusCode === 401) {
                setError('IUCN API token is invalid. Please check your token and try again.');
                setIsLoading(false);
                return;
              }
              continue;
            }

            const searchData = searchResult.data;

            if (!searchData.result || searchData.result.length === 0) {
              console.warn(`No IUCN species found for ${term}`);
              continue;
            }

            // Get the list of species to fetch detailed data for
            const speciesList = searchData.result;

            // For each species in the result, fetch comprehensive data
            const detailedSpecies = await Promise.all(
              speciesList.map(async (sp) => {
                try {
                  // Fetch multiple data endpoints for comprehensive information using backend function
                  const [assessmentResult, habitatResult, threatsResult, historicalResult, countriesResult] = await Promise.all([
                    base44.functions.fetchIUCNData({
                      endpoint: 'assessment',
                      term: String(sp.assessment_id || sp.taxonid),
                      iucnToken: iucnToken
                    }),
                    base44.functions.fetchIUCNData({
                      endpoint: 'habitats',
                      term: String(sp.taxonid),
                      iucnToken: iucnToken
                    }),
                    base44.functions.fetchIUCNData({
                      endpoint: 'threats',
                      term: String(sp.taxonid),
                      iucnToken: iucnToken
                    }),
                    base44.functions.fetchIUCNData({
                      endpoint: 'scientific_name',
                      term: sp.scientific_name,
                      iucnToken: iucnToken
                    }),
                    base44.functions.fetchIUCNData({
                      endpoint: 'countries',
                      term: '',
                      iucnToken: iucnToken
                    })
                  ]);

                  const assessmentData = assessmentResult.status === 'success' ? assessmentResult.data : null;
                  const habitatData = habitatResult.status === 'success' ? habitatResult.data : null;
                  const threatsData = threatsResult.status === 'success' ? threatsResult.data : null;
                  const historicalData = historicalResult.status === 'success' ? historicalResult.data : null;
                  const countriesData = countriesResult.status === 'success' ? countriesResult.data : null;

                  const assessment = assessmentData?.result || {};
                  const narrative = assessment;
                  const habitats = habitatData?.result || [];
                  const threats = threatsData?.result || [];
                  const history = historicalData?.result || [];
                  const countries = countriesData?.result || [];

                  // Download and upload files to backend storage
                  let searchSummaryFileUri = null;
                  let rangeGeoJsonFileUri = null;
                  let assessmentPdfFileUri = null;
                  let rangeShpFileUri = null;
                  let rangeCsvFileUri = null;
                  let rangeMapJpgFileUri = null;

                  // Fetch range data from IUCN API v4
                  let rangeDataGeoJSON = null;
                  let rangeDataPoints = null;
                  try {
                    const rangeResult = await base44.functions.fetchIUCNData({
                      endpoint: 'range',
                      term: String(sp.taxonid || sp.assessment_id),
                      iucnToken: iucnToken
                    });
                    
                    if (rangeResult.status === 'success') {
                      rangeDataGeoJSON = rangeResult.data;
                      rangeDataPoints = rangeDataGeoJSON.result || [];
                    }
                  } catch (err) {
                    console.error('Error fetching range data:', err);
                  }

                  // Fetch additional images if available
                  let allImages = [];
                  if (sp.taxonid) {
                    try {
                      const imagesUrl = `https://apiv4.iucnredlist.org/api/v4/taxa/sis/${sp.taxonid}?token=${iucnToken}`;
                      const imagesRes = await fetch(imagesUrl);
                      if (imagesRes.ok) {
                        const imagesData = await imagesRes.json();
                        allImages = imagesData.result?.map(img => img.url) || [];
                      }
                    } catch (err) {
                      console.error('Error fetching images:', err);
                    }
                  }

                  // Create comprehensive search summary JSON
                  const searchSummary = {
                    taxon_id: sp.taxonid,
                    scientific_name: sp.scientific_name,
                    common_name: sp.main_common_name,
                    category: sp.category,
                    population_trend: narrative.populationtrend,
                    population: narrative.population,
                    assessment_date: sp.published_year,
                    countries: countries.map(c => c.country),
                    regions: [...new Set(countries.map(c => c.region).filter(Boolean))],
                    habitats: habitats.map(h => ({
                      code: h.code,
                      habitat: h.habitat,
                      suitability: h.suitability,
                      season: h.season
                    })),
                    threats: threats.map(t => ({
                      code: t.code,
                      title: t.title,
                      timing: t.timing,
                      scope: t.scope,
                      severity: t.severity
                    })),
                    conservation_measures: narrative.conservationmeasures,
                    range_description: narrative.range,
                    habitat_description: narrative.habitat,
                    threats_description: narrative.threats,
                    use_and_trade: narrative.usetrade,
                    range_data_points: rangeDataPoints,
                    assessment_id: sp.assessment_id
                  };

                  // Upload search summary JSON to backend storage
                  try {
                    const searchSummaryBlob = new Blob([JSON.stringify(searchSummary, null, 2)], { type: 'application/json' });
                    const searchSummaryFile = new File([searchSummaryBlob], `${sp.scientific_name.replace(/ /g, '_')}_search_summary.json`, { type: 'application/json' });
                    const { file_uri: summaryUri } = await base44.integrations.Core.UploadPrivateFile({ file: searchSummaryFile });
                    searchSummaryFileUri = summaryUri;
                  } catch (err) {
                    console.error('Error uploading search summary:', err);
                  }

                  // Upload range GeoJSON to backend storage
                  if (rangeDataGeoJSON) {
                    try {
                      const rangeGeoJsonBlob = new Blob([JSON.stringify(rangeDataGeoJSON, null, 2)], { type: 'application/json' });
                      const rangeGeoJsonFile = new File([rangeGeoJsonBlob], `${sp.scientific_name.replace(/ /g, '_')}_range_data.geojson`, { type: 'application/json' });
                      const { file_uri: geoJsonUri } = await base44.integrations.Core.UploadPrivateFile({ file: rangeGeoJsonFile });
                      rangeGeoJsonFileUri = geoJsonUri;
                    } catch (err) {
                      console.error('Error uploading range GeoJSON:', err);
                    }
                  }

                  // Download and upload assessment PDF
                  try {
                    const pdfUrl = `https://www.iucnredlist.org/species/pdf/${sp.taxonid}`;
                    const pdfRes = await fetch(pdfUrl);
                    if (pdfRes.ok) {
                      const pdfBlob = await pdfRes.blob();
                      const pdfFile = new File([pdfBlob], `${sp.scientific_name.replace(/ /g, '_')}_assessment.pdf`, { type: 'application/pdf' });
                      const { file_uri: pdfUri } = await base44.integrations.Core.UploadPrivateFile({ file: pdfFile });
                      assessmentPdfFileUri = pdfUri;
                    }
                  } catch (err) {
                    console.error('Error downloading/uploading assessment PDF:', err);
                  }

                  // Download and upload range map JPG
                  try {
                    const mapUrl = `https://www.iucnredlist.org/species/map/${sp.taxonid}`;
                    const mapRes = await fetch(mapUrl);
                    if (mapRes.ok) {
                      const mapBlob = await mapRes.blob();
                      const mapFile = new File([mapBlob], `${sp.scientific_name.replace(/ /g, '_')}_range_map.jpg`, { type: 'image/jpeg' });
                      const { file_uri: mapUri } = await base44.integrations.Core.UploadPrivateFile({ file: mapFile });
                      rangeMapJpgFileUri = mapUri;
                    }
                  } catch (err) {
                    console.error('Error downloading/uploading range map JPG:', err);
                  }

                  // Download and upload range SHP file
                  try {
                    const shpUrl = `https://www.iucnredlist.org/species/spatial-data/${sp.taxonid}`;
                    const shpRes = await fetch(shpUrl);
                    if (shpRes.ok) {
                      const shpBlob = await shpRes.blob();
                      const shpFile = new File([shpBlob], `${sp.scientific_name.replace(/ /g, '_')}_range_data.shp.zip`, { type: 'application/zip' });
                      const { file_uri: shpUri } = await base44.integrations.Core.UploadPrivateFile({ file: shpFile });
                      rangeShpFileUri = shpUri;
                    }
                  } catch (err) {
                    console.error('Error downloading/uploading range SHP:', err);
                  }

                  // Download and upload range CSV if available
                  if (rangeDataPoints && rangeDataPoints.length > 0) {
                    try {
                      const csvContent = [
                        'latitude,longitude,season,origin,presence',
                        ...rangeDataPoints.map(point => 
                          `${point.latitude || ''},${point.longitude || ''},${point.season || ''},${point.origin || ''},${point.presence || ''}`
                        )
                      ].join('\n');
                      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
                      const csvFile = new File([csvBlob], `${sp.scientific_name.replace(/ /g, '_')}_range_points.csv`, { type: 'text/csv' });
                      const { file_uri: csvUri } = await base44.integrations.Core.UploadPrivateFile({ file: csvFile });
                      rangeCsvFileUri = csvUri;
                    } catch (err) {
                      console.error('Error uploading range CSV:', err);
                    }
                  }
                  
                  return {
                    id: `iucn-${sp.taxonid}`,
                    scientific_name: sp.scientific_name,
                    common_name: sp.main_common_name || '',
                    iucn_status: sp.category || 'NE',
                    population_trend: narrative.populationtrend?.toLowerCase() || 'unknown',
                    population_details: narrative.population || '',
                    status_history: history.map(h => ({
                      year: h.year,
                      status: h.code,
                      category: h.category
                    })),
                    geographic_distribution: {
                      countries: countries.map(c => c.country),
                      regions: [...new Set(countries.map(c => c.region).filter(Boolean))],
                      area_km2: null
                    },
                    kingdom: sp.kingdom || '',
                    phylum: sp.phylum || '',
                    class_name: sp.class || '',
                    order_name: sp.order || '',
                    family: sp.family || '',
                    genus: sp.genus || '',
                    habitat: narrative.habitat || '',
                    habitats_detailed: habitats.map(h => ({
                      code: h.code,
                      habitat: h.habitat,
                      suitability: h.suitability,
                      season: h.season,
                      major_importance: h.majorimportance
                    })),
                    range_description: narrative.range || '',
                    threats: narrative.threats || '',
                    threats_detailed: threats.map(t => ({
                      code: t.code,
                      title: t.title,
                      timing: t.timing,
                      scope: t.scope,
                      severity: t.severity
                    })),
                    conservation_actions: narrative.conservationmeasures || '',
                    assessment_date: sp.published_year ? `${sp.published_year}-01-01` : null,
                    iucn_id: sp.taxonid,
                    assessment_id: sp.assessment_id,
                    assessment_pdf_url: `https://www.iucnredlist.org/species/pdf/${sp.taxonid}`,
                    range_map_jpg_url: `https://www.iucnredlist.org/species/map/${sp.taxonid}`,
                    range_data_shp_url: `https://www.iucnredlist.org/species/spatial-data/${sp.taxonid}`,
                    range_data_csv_url: rangeDataPoints ? 'available' : null,
                    range_data_geojson: rangeDataGeoJSON,
                    search_summary_json: searchSummary,
                    search_results_csv_url: `https://www.iucnredlist.org/search/export?query=${encodeURIComponent(term)}&searchType=species`,
                    all_images_urls: allImages.length > 0 ? allImages : (sp.main_common_name ? [sp.default_photo?.url].filter(Boolean) : []),
                    dataset_name: term,
                    data_source: 'IUCN Red List',
                    search_summary_file_uri: searchSummaryFileUri,
                    range_geojson_file_uri: rangeGeoJsonFileUri,
                    assessment_pdf_file_uri: assessmentPdfFileUri,
                    range_shp_file_uri: rangeShpFileUri,
                    range_csv_file_uri: rangeCsvFileUri,
                    range_map_jpg_file_uri: rangeMapJpgFileUri
                  };
                } catch (err) {
                  console.error(`Error fetching comprehensive details for ${sp.scientific_name}:`, err);
                  return {
                    id: `iucn-${sp.taxonid}`,
                    scientific_name: sp.scientific_name,
                    common_name: sp.main_common_name || '',
                    iucn_status: sp.category || 'NE',
                    kingdom: sp.kingdom || '',
                    phylum: sp.phylum || '',
                    class_name: sp.class || '',
                    order_name: sp.order || '',
                    family: sp.family || '',
                    genus: sp.genus || '',
                    iucn_id: sp.taxonid,
                    dataset_name: term,
                    data_source: 'IUCN Red List'
                  };
                }
              })
            );

            allSpecies = [...allSpecies, ...detailedSpecies];

            // Save IUCN species to database
            for (const species of detailedSpecies) {
              try {
                // Check if species already exists
                const existing = await base44.entities.Species.filter({
                  scientific_name: species.scientific_name
                });

                if (existing.length > 0) {
                  // Create pending update for review instead of direct update
                  const newDataFields = {};
                  
                  // Only include fields that are new or different
                  if (species.common_name && species.common_name !== existing[0].common_name) newDataFields.common_name = species.common_name;
                  if (species.kingdom && species.kingdom !== existing[0].kingdom) newDataFields.kingdom = species.kingdom;
                  if (species.phylum && species.phylum !== existing[0].phylum) newDataFields.phylum = species.phylum;
                  if (species.class_name && species.class_name !== existing[0].class_name) newDataFields.class_name = species.class_name;
                  if (species.order_name && species.order_name !== existing[0].order_name) newDataFields.order_name = species.order_name;
                  if (species.family && species.family !== existing[0].family) newDataFields.family = species.family;
                  if (species.genus && species.genus !== existing[0].genus) newDataFields.genus = species.genus;
                  if (species.iucn_status && species.iucn_status !== existing[0].iucn_status) newDataFields.iucn_status = species.iucn_status;
                  if (species.population_trend && species.population_trend !== existing[0].population_trend) newDataFields.population_trend = species.population_trend;
                  if (species.population_details && species.population_details !== existing[0].population_details) newDataFields.population_details = species.population_details;
                  if (species.status_history && JSON.stringify(species.status_history) !== JSON.stringify(existing[0].status_history)) newDataFields.status_history = species.status_history;
                  if (species.geographic_distribution && JSON.stringify(species.geographic_distribution) !== JSON.stringify(existing[0].geographic_distribution)) newDataFields.geographic_distribution = species.geographic_distribution;
                  if (species.habitat && species.habitat !== existing[0].habitat) newDataFields.habitat = species.habitat;
                  if (species.habitats_detailed && JSON.stringify(species.habitats_detailed) !== JSON.stringify(existing[0].habitats_detailed)) newDataFields.habitats_detailed = species.habitats_detailed;
                  if (species.range_description && species.range_description !== existing[0].range_description) newDataFields.range_description = species.range_description;
                  if (species.threats && species.threats !== existing[0].threats) newDataFields.threats = species.threats;
                  if (species.threats_detailed && JSON.stringify(species.threats_detailed) !== JSON.stringify(existing[0].threats_detailed)) newDataFields.threats_detailed = species.threats_detailed;
                  if (species.conservation_actions && species.conservation_actions !== existing[0].conservation_actions) newDataFields.conservation_actions = species.conservation_actions;
                  if (species.assessment_date && species.assessment_date !== existing[0].assessment_date) newDataFields.assessment_date = species.assessment_date;
                  if (species.iucn_id && species.iucn_id !== existing[0].iucn_id) newDataFields.iucn_id = species.iucn_id;
                  if (species.assessment_id && species.assessment_id !== existing[0].assessment_id) newDataFields.assessment_id = species.assessment_id;
                  if (species.assessment_pdf_url && species.assessment_pdf_url !== existing[0].assessment_pdf_url) newDataFields.assessment_pdf_url = species.assessment_pdf_url;
                  if (species.range_map_jpg_url && species.range_map_jpg_url !== existing[0].range_map_jpg_url) newDataFields.range_map_jpg_url = species.range_map_jpg_url;
                  if (species.range_data_shp_url && species.range_data_shp_url !== existing[0].range_data_shp_url) newDataFields.range_data_shp_url = species.range_data_shp_url;
                  if (species.range_data_csv_url && species.range_data_csv_url !== existing[0].range_data_csv_url) newDataFields.range_data_csv_url = species.range_data_csv_url;
                  if (species.range_data_geojson && JSON.stringify(species.range_data_geojson) !== JSON.stringify(existing[0].range_data_geojson)) newDataFields.range_data_geojson = species.range_data_geojson;
                  if (species.search_summary_json && JSON.stringify(species.search_summary_json) !== JSON.stringify(existing[0].search_summary_json)) newDataFields.search_summary_json = species.search_summary_json;
                  if (species.search_results_csv_url && species.search_results_csv_url !== existing[0].search_results_csv_url) newDataFields.search_results_csv_url = species.search_results_csv_url;
                  if (species.all_images_urls && JSON.stringify(species.all_images_urls) !== JSON.stringify(existing[0].all_images_urls)) newDataFields.all_images_urls = species.all_images_urls;
                  if (species.image_url && species.image_url !== existing[0].image_url) newDataFields.image_url = species.image_url;
                  if (species.search_summary_file_uri && species.search_summary_file_uri !== existing[0].search_summary_file_uri) newDataFields.search_summary_file_uri = species.search_summary_file_uri;
                  if (species.range_geojson_file_uri && species.range_geojson_file_uri !== existing[0].range_geojson_file_uri) newDataFields.range_geojson_file_uri = species.range_geojson_file_uri;
                  if (species.assessment_pdf_file_uri && species.assessment_pdf_file_uri !== existing[0].assessment_pdf_file_uri) newDataFields.assessment_pdf_file_uri = species.assessment_pdf_file_uri;
                  if (species.range_shp_file_uri && species.range_shp_file_uri !== existing[0].range_shp_file_uri) newDataFields.range_shp_file_uri = species.range_shp_file_uri;
                  if (species.range_csv_file_uri && species.range_csv_file_uri !== existing[0].range_csv_file_uri) newDataFields.range_csv_file_uri = species.range_csv_file_uri;
                  if (species.range_map_jpg_file_uri && species.range_map_jpg_file_uri !== existing[0].range_map_jpg_file_uri) newDataFields.range_map_jpg_file_uri = species.range_map_jpg_file_uri;

                  // Only create pending update if there are actual changes
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
                  await base44.entities.Species.create({
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
                    observation_count: species.observation_count,
                    observations: species.observations,
                    last_observed: species.last_observed,
                    inat_taxon_id: species.inat_taxon_id,
                    inat_wikipedia_url: species.inat_wikipedia_url,
                    search_summary_file_uri: species.search_summary_file_uri,
                    range_geojson_file_uri: species.range_geojson_file_uri,
                    assessment_pdf_file_uri: species.assessment_pdf_file_uri,
                    range_shp_file_uri: species.range_shp_file_uri,
                    range_csv_file_uri: species.range_csv_file_uri,
                    range_map_jpg_file_uri: species.range_map_jpg_file_uri
                    });
                }
              } catch (err) {
                console.error(`Error saving species ${species.scientific_name}:`, err);
              }
            }
          } catch (err) {
            console.error(`Error fetching IUCN data for ${term}:`, err);
          }
        }
      }

      // Only search iNaturalist if requested
      if (!includeINaturalist) {
        if (allSpecies.length === 0) {
          setError('No species found in IUCN Red List for the search terms.');
          return;
        }
        setSpecies(allSpecies);
        setIsLoading(false);
        return;
      }

      // Search iNaturalist - get individual species for each term
      for (const term of terms) {
        try {
          // First, find the taxon ID for the search term
          const taxonUrl = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(term)}&rank=${level}`;
          const taxonRes = await fetch(taxonUrl);
          if (!taxonRes.ok) {
            console.error(`iNaturalist API error for ${term}:`, taxonRes.status);
            continue;
          }

          const taxonData = await taxonRes.json();
          if (!taxonData.results || taxonData.results.length === 0) {
            console.warn(`No iNaturalist taxa found for ${term}`);
            continue;
          }

          // Get the main taxon (genus, family, etc.)
          const mainTaxon = taxonData.results[0];
          
          // Now search for all species within this taxon
          const speciesUrl = `https://api.inaturalist.org/v1/taxa?taxon_id=${mainTaxon.id}&rank=species&per_page=200`;
          const speciesRes = await fetch(speciesUrl);
          if (!speciesRes.ok) {
            console.error(`iNaturalist species search error for ${term}:`, speciesRes.status);
            continue;
          }

          const speciesData = await speciesRes.json();
          const speciesToFetch = speciesData.results || [];

          if (speciesToFetch.length === 0) {
            console.warn(`No iNaturalist species found within ${term}`);
            continue;
          }

          // Fetch detailed observation data for each species
          const inatSpecies = await Promise.all(speciesToFetch.map(async (taxon) => {
            // Fetch recent observations for this taxon
            let observationData = null;
            try {
              const obsUrl = `https://api.inaturalist.org/v1/observations?taxon_id=${taxon.id}&per_page=20&order=desc&order_by=created_at&photos=true`;
              const obsRes = await fetch(obsUrl);
              if (obsRes.ok) {
                observationData = await obsRes.json();
              }
            } catch (err) {
              console.error(`Error fetching observations for ${taxon.name}:`, err);
            }

            const observations = observationData?.results || [];
            const recentObservation = observations[0];

            // Extract location data from observations
            const locations = observations
              .filter(obs => obs.place_guess)
              .map(obs => obs.place_guess)
              .slice(0, 5);

            const uniqueLocations = [...new Set(locations)];

            // Store observations with coordinates for mapping
            const observationsWithCoords = observations
              .filter(obs => obs.location)
              .map(obs => ({
                latitude: parseFloat(obs.location.split(',')[0]),
                longitude: parseFloat(obs.location.split(',')[1]),
                location: obs.place_guess || '',
                observed_on: obs.observed_on,
                user: obs.user?.login || 'Unknown',
                photo_url: obs.photos?.[0]?.url || ''
              }));

            return {
              id: `inat-${taxon.id}`,
              scientific_name: taxon.name,
              common_name: taxon.preferred_common_name || '',
              iucn_status: 'NE',
              population_trend: 'unknown',
              kingdom: taxon.ancestor_ids?.length > 0 ? taxon.ancestors?.find(a => a.rank === 'kingdom')?.name || '' : '',
              phylum: taxon.ancestors?.find(a => a.rank === 'phylum')?.name || '',
              class_name: taxon.ancestors?.find(a => a.rank === 'class')?.name || '',
              order_name: taxon.ancestors?.find(a => a.rank === 'order')?.name || '',
              family: taxon.ancestors?.find(a => a.rank === 'family')?.name || '',
              genus: taxon.ancestors?.find(a => a.rank === 'genus')?.name || '',
              habitat: recentObservation?.description || '',
              range_description: uniqueLocations.join('; ') || '',
              threats: '',
              conservation_actions: '',
              assessment_date: null,
              iucn_id: null,
              dataset_name: term,
              data_source: 'iNaturalist',
              observation_count: taxon.observations_count || 0,
              image_url: taxon.default_photo?.medium_url || recentObservation?.photos?.[0]?.url || '',
              inat_taxon_id: taxon.id,
              inat_wikipedia_url: taxon.wikipedia_url || '',
              recent_observations: observations.length,
              last_observed: recentObservation?.observed_on || null,
              observations: observationsWithCoords
            };
          }));

          allSpecies = [...allSpecies, ...inatSpecies];

          // Save iNaturalist species to database
          for (const species of inatSpecies) {
            try {
              // Check if species already exists
              const existing = await base44.entities.Species.filter({
                scientific_name: species.scientific_name
              });

              if (existing.length > 0) {
                // Create pending update for iNaturalist data
                const newDataFields = {};
                
                if (species.common_name && species.common_name !== existing[0].common_name) newDataFields.common_name = species.common_name;
                if (species.kingdom && species.kingdom !== existing[0].kingdom) newDataFields.kingdom = species.kingdom;
                if (species.phylum && species.phylum !== existing[0].phylum) newDataFields.phylum = species.phylum;
                if (species.class_name && species.class_name !== existing[0].class_name) newDataFields.class_name = species.class_name;
                if (species.order_name && species.order_name !== existing[0].order_name) newDataFields.order_name = species.order_name;
                if (species.family && species.family !== existing[0].family) newDataFields.family = species.family;
                if (species.genus && species.genus !== existing[0].genus) newDataFields.genus = species.genus;
                if (species.habitat && !existing[0].habitat) newDataFields.habitat = species.habitat;
                if (species.range_description && !existing[0].range_description) newDataFields.range_description = species.range_description;
                if (species.image_url && species.image_url !== existing[0].image_url) newDataFields.image_url = species.image_url;
                if (species.observation_count && species.observation_count !== existing[0].observation_count) newDataFields.observation_count = species.observation_count;
                if (species.observations && JSON.stringify(species.observations) !== JSON.stringify(existing[0].observations)) newDataFields.observations = species.observations;
                if (species.last_observed && species.last_observed !== existing[0].last_observed) newDataFields.last_observed = species.last_observed;
                if (species.inat_taxon_id && species.inat_taxon_id !== existing[0].inat_taxon_id) newDataFields.inat_taxon_id = species.inat_taxon_id;
                if (species.inat_wikipedia_url && species.inat_wikipedia_url !== existing[0].inat_wikipedia_url) newDataFields.inat_wikipedia_url = species.inat_wikipedia_url;

                if (Object.keys(newDataFields).length > 0) {
                  await base44.entities.PendingSpeciesUpdate.create({
                    species_id: existing[0].id,
                    scientific_name: species.scientific_name,
                    current_data: existing[0],
                    new_data: newDataFields,
                    data_source: 'iNaturalist',
                    status: 'pending'
                  });
                }
              } else {
                // Create new species record
                await base44.entities.Species.create({
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
                  habitat: species.habitat,
                  range_description: species.range_description,
                  image_url: species.image_url
                });
              }
            } catch (err) {
              console.error(`Error saving species ${species.scientific_name}:`, err);
            }
          }
          } catch (err) {
          console.error(`Error fetching iNaturalist data for ${term}:`, err);
          }
          }

          if (allSpecies.length === 0) {
        setError('No species found for any of the search terms from any source.');
        return;
      }

      // Merge duplicate species (same scientific name from different sources)
      const mergedSpecies = {};
      allSpecies.forEach(sp => {
        const key = sp.scientific_name.toLowerCase();
        if (!mergedSpecies[key]) {
          mergedSpecies[key] = sp;
        } else {
          // Merge data, preferring IUCN data for conservation info, iNat for observations
          const existing = mergedSpecies[key];
          mergedSpecies[key] = {
            ...existing,
            // Keep IUCN conservation data if available, otherwise use iNaturalist
            iucn_status: existing.iucn_status !== 'NE' ? existing.iucn_status : sp.iucn_status,
            population_trend: existing.population_trend !== 'unknown' ? existing.population_trend : sp.population_trend,
            population_details: existing.population_details || sp.population_details,
            status_history: existing.status_history || sp.status_history,
            geographic_distribution: existing.geographic_distribution || sp.geographic_distribution,
            habitat: existing.habitat || sp.habitat,
            range_description: existing.range_description || sp.range_description,
            threats: existing.threats || sp.threats,
            conservation_actions: existing.conservation_actions || sp.conservation_actions,
            assessment_date: existing.assessment_date || sp.assessment_date,
            iucn_id: existing.iucn_id || sp.iucn_id,
            assessment_pdf_url: existing.assessment_pdf_url || sp.assessment_pdf_url,
            range_map_jpg_url: existing.range_map_jpg_url || sp.range_map_jpg_url,
            range_data_shp_url: existing.range_data_shp_url || sp.range_data_shp_url,
            range_data_csv_url: existing.range_data_csv_url || sp.range_data_csv_url,
            search_summary_json: existing.search_summary_json || sp.search_summary_json,
            search_results_csv_url: existing.search_results_csv_url || sp.search_results_csv_url,
            all_images_urls: existing.all_images_urls || sp.all_images_urls,
            habitats_detailed: existing.habitats_detailed || sp.habitats_detailed,
            threats_detailed: existing.threats_detailed || sp.threats_detailed,
            // Taxonomy - use IUCN if available, fall back to iNaturalist
            kingdom: existing.kingdom || sp.kingdom,
            phylum: existing.phylum || sp.phylum,
            class_name: existing.class_name || sp.class_name,
            order_name: existing.order_name || sp.order_name,
            family: existing.family || sp.family,
            genus: existing.genus || sp.genus,
            // Keep iNaturalist observation data if available
            observation_count: sp.observation_count || existing.observation_count,
            observations: sp.observations || existing.observations,
            last_observed: sp.last_observed || existing.last_observed,
            inat_taxon_id: sp.inat_taxon_id || existing.inat_taxon_id,
            inat_wikipedia_url: sp.inat_wikipedia_url || existing.inat_wikipedia_url,
            // Use best available image
            image_url: existing.image_url || sp.image_url,
            common_name: existing.common_name || sp.common_name,
            // Mark as combined source
            data_source: existing.data_source !== sp.data_source ? 'IUCN + iNaturalist' : existing.data_source
          };
        }
      });

      setSpecies(Object.values(mergedSpecies));
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (sp) => {
    const id = sp.id || sp.scientific_name;
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(species.map(sp => sp.id || sp.scientific_name));
  const deselectAll = () => setSelectedIds([]);

  const selectedSpecies = species.filter(sp => selectedIds.includes(sp.id || sp.scientific_name));

  const handleCompare = () => {
    if (selectedSpecies.length >= 2) {
      setShowCompare(true);
    }
  };

  const handleRemoveFromCompare = (sp) => {
    setSelectedIds(prev => prev.filter(id => id !== (sp.id || sp.scientific_name)));
  };

  const handleAddNote = (sp) => {
    setNoteSpecies(sp);
    setShowNotes(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-bangor-sun/8 to-bangor-red/3">
      {/* Header */}
      <header className="bg-gradient-to-r from-white via-bangor-sun/5 to-white/80 backdrop-blur-sm border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div onClick={() => setShowLogoSelector(true)} className="cursor-pointer opacity-90">
              <BangOnLogo size="sm" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-bangor-red">The DataWinder</h1>
              <p className="text-sm text-slate-600">b-Izzy on Data</p>
            </div>
            <Link to={createPageUrl('SavedData')}>
              <button className="flex items-center gap-2 px-4 py-2 bg-bangor-sun/20 text-bangor-sun rounded-lg font-medium">
                <Database className="w-4 h-4" />
                <span className="text-sm font-medium">Saved Data</span>
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Search */}
        <TaxonomicSearch onSearch={handleSearch} isLoading={isLoading} />

        {/* Info Banner */}
        {!species.length && !isLoading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Alert className="bg-bangor-sun/10 border-bangor-sun/30">
              <Info className="h-4 w-4 text-bangor-sun" />
              <AlertTitle className="text-bangor-red">How It Works</AlertTitle>
              <AlertDescription className="text-slate-700">
                Search species data from multiple sources (IUCN Red List & iNaturalist) by taxonomic group. 
                View results in grid or interactive map with observation points. 
                Compare species side-by-side, create custom lists to share, add personal notes with tags, 
                and export filtered data in CSV or JSON format with customizable fields.
              </AlertDescription>
            </Alert>

            <div className="mt-4 p-4 bg-gradient-to-r from-bangor-red/5 to-bangor-sun/5 rounded-lg border border-bangor-red/20 text-xs text-slate-600">
              <p className="mb-1 font-semibold text-slate-700">Data Sources:</p>
              <p className="italic">• IUCN 2025. IUCN Red List of Threatened Species. Version 2025-2 www.iucnredlist.org</p>
              <p className="italic">• iNaturalist observation data www.inaturalist.org</p>
            </div>

            {/* Status Legend */}
            <div className="mt-6 bg-gradient-to-br from-white to-bangor-sun/5 rounded-xl border border-bangor-sun/20 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-bangor-red mb-4">IUCN Red List Categories</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(statusConfig).map(([code, config]) => (
                  <div key={code} className="flex items-center gap-2">
                    <StatusBadge status={code} size="sm" />
                    <span className="text-xs text-slate-500">{config.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {species.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              {searchInfo && (
                <div className="text-sm text-slate-500">
                  Showing species from <span className="font-medium text-slate-700">{searchInfo.level}</span>: <span className="font-medium text-bangor-red">{searchInfo.terms}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={viewMode === 'grid' ? 'bg-bangor-red text-white' : 'bg-slate-100 text-slate-700'}
                    >
                    <Grid3x3 className="w-4 h-4 mr-2" />
                    Grid
                    </Button>
                    <Button
                    size="sm"
                    onClick={() => setViewMode('map')}
                    className={viewMode === 'map' ? 'bg-bangor-red text-white' : 'bg-slate-100 text-slate-700'}
                  >
                    <Map className="w-4 h-4 mr-2" />
                    Map
                  </Button>
              </div>
            </div>

            <SelectionBar
              totalCount={species.length}
              selectedCount={selectedIds.length}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
              onDownload={() => setShowDownload(true)}
              onCompare={handleCompare}
              onManageLists={() => setShowListManager(true)}
              onAddNote={handleAddNote}
              onSaveSearch={() => setShowSaveSearch(true)}
              selectedSpecies={selectedSpecies}
            />

            {viewMode === 'grid' ? (
              <SpeciesGrid
                species={species}
                selectedIds={selectedIds}
                onSelect={handleSelect}
              />
            ) : (
              <MapView
                species={species}
                selectedIds={selectedIds}
                onSelect={handleSelect}
              />
            )}
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-bangor-sun/30 rounded-full animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Leaf className="w-6 h-6 text-bangor-red animate-bounce" />
              </div>
            </div>
            <p className="mt-4 text-slate-600">Downloading Species Data From Multiple Sources...</p>
            <p className="text-sm text-slate-400">Fetching From IUCN Red List & iNaturalist</p>
          </div>
        )}
      </main>

      {/* Download Panel */}
      {showDownload && selectedSpecies.length > 0 && (
        <DownloadPanel
          selectedSpecies={selectedSpecies}
          onClose={() => setShowDownload(false)}
          onSaveComplete={() => {
            alert('Data saved to database successfully!');
          }}
        />
      )}

      {/* Compare Species */}
      {showCompare && (
        <CompareSpecies
          species={selectedSpecies}
          onClose={() => setShowCompare(false)}
          onRemove={handleRemoveFromCompare}
        />
      )}

      {/* List Manager */}
      {showListManager && (
        <SpeciesListManager
          selectedSpecies={selectedSpecies}
          onClose={() => setShowListManager(false)}
        />
      )}

      {/* Species Notes */}
      {showNotes && noteSpecies && (
        <SpeciesNotes
          species={noteSpecies}
          onClose={() => {
            setShowNotes(false);
            setNoteSpecies(null);
          }}
        />
      )}

      {/* Onboarding Wizard */}
      <OnboardingWizard 
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
      />

      {/* Logo Selector */}
      <LogoShowcase 
        open={showLogoSelector}
        onClose={() => setShowLogoSelector(false)}
        onSelect={(logoId) => {
          console.log('Selected logo:', logoId);
          setShowLogoSelector(false);
          alert(`Logo "${logoId}" selected! To fully implement this, you'd update the BangOnLogo component or create a logo preference system.`);
        }}
      />

      {/* Save Search Panel */}
      {showSaveSearch && (
        <SaveSearchPanel
          open={showSaveSearch}
          onClose={() => setShowSaveSearch(false)}
          species={species}
          searchInfo={searchInfo}
          onSaveComplete={() => {
            // Refresh saved data if user navigates to SavedData page
          }}
        />
      )}
      </div>
      );
      }