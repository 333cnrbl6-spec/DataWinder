import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, Map, FileSpreadsheet, Layers, Search as SearchIcon, FolderOpen, Upload, Grid3x3, Leaf, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function DataManagement() {
  const [species, setSpecies] = useState([]);
  const [savedSpeciesScientificNames, setSavedSpeciesScientificNames] = useState(new Set());
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
  const queryClient = useQueryClient();

  const { data: allSpecies = [], refetch: refetchSpecies } = useQuery({
    queryKey: ['allSpecies'],
    queryFn: () => base44.entities.Species.list('-created_date', 10000)
  });

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['savedSearches'],
    queryFn: () => base44.entities.SavedSearch.list('-created_date')
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = base44.entities.Species.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['allSpecies'] });
    });
    return unsubscribe;
  }, [queryClient]);

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
        base44.auth.redirectToLogin(window.location.pathname);
      }
    };
    checkOnboarding();

    const fetchSavedSpecies = async () => {
      try {
        const savedSpecies = await base44.entities.Species.list();
        const scientificNames = new Set(savedSpecies.map(sp => sp.scientific_name));
        setSavedSpeciesScientificNames(scientificNames);
      } catch (err) {
        console.error('Error fetching saved species:', err);
      }
    };
    fetchSavedSpecies();
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setOnboardingChecked(true);
  };

  const handleSearch = async ({ level, terms, iucnToken, includeINaturalist = false, includeGBIF = false }) => {
    if (!onboardingChecked) {
      setShowOnboarding(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSpecies([]);
    setSelectedIds([]);
    setSearchInfo({ 
      level, 
      terms: terms.join(', '),
      includeINaturalist,
      includeGBIF,
      iucnToken: !!iucnToken
    });

    try {
      const allSpeciesMap = {};

      // Search IUCN for each term if token available
      if (iucnToken && includeINaturalist !== false) {
        for (const term of terms) {
          try {
            const searchResult = await base44.functions.invoke('fetchIUCNData', {
              term: term,
              endpoint: 'taxa'
            });

            if (searchResult.data.status === 'error') {
              console.error(`IUCN API error for ${term}:`, searchResult.data.message);
              if (searchResult.data.statusCode === 401) {
                setError('IUCN API token is invalid. Please check your token and try again.');
              }
              continue;
            }

            const searchData = searchResult.data.data;

            if (!searchData.result || searchData.result.length === 0) {
              console.warn(`No IUCN species found for ${term}`);
              continue;
            }

            const speciesList = searchData.result;

            // For each species in the result, fetch comprehensive data
            const detailedSpecies = await Promise.all(
              speciesList.map(async (sp) => {
                try {
                  const [assessmentResult, habitatResult, threatsResult, historicalResult, countriesResult] = await Promise.all([
                    base44.functions.invoke('fetchIUCNData', {
                      endpoint: 'assessment',
                      term: String(sp.assessment_id || sp.taxonid)
                    }),
                    base44.functions.invoke('fetchIUCNData', {
                      endpoint: 'habitats',
                      term: String(sp.taxonid)
                    }),
                    base44.functions.invoke('fetchIUCNData', {
                      endpoint: 'threats',
                      term: String(sp.taxonid)
                    }),
                    base44.functions.invoke('fetchIUCNData', {
                      endpoint: 'scientific_name',
                      term: sp.scientific_name
                    }),
                    base44.functions.invoke('fetchIUCNData', {
                      endpoint: 'countries',
                      term: ''
                    })
                  ]);

                  const assessmentData = assessmentResult.data.status === 'success' ? assessmentResult.data.data : null;
                  const habitatData = habitatResult.data.status === 'success' ? habitatResult.data.data : null;
                  const threatsData = threatsResult.data.status === 'success' ? threatsResult.data.data : null;
                  const historicalData = historicalResult.data.status === 'success' ? historicalResult.data.data : null;
                  const countriesData = countriesResult.data.status === 'success' ? countriesResult.data.data : null;

                  const assessment = assessmentData?.result || {};
                  const narrative = assessment;
                  const habitats = habitatData?.result || [];
                  const threats = threatsData?.result || [];
                  const history = historicalData?.result || [];
                  const countries = countriesData?.result || [];

                  let searchSummaryFileUri = null;
                  let rangeGeoJsonFileUri = null;
                  let assessmentPdfFileUri = null;
                  let rangeShpFileUri = null;
                  let rangeCsvFileUri = null;
                  let rangeMapJpgFileUri = null;

                  let rangeDataGeoJSON = null;
                  let rangeDataPoints = null;
                  try {
                    const rangeResult = await base44.functions.invoke('fetchIUCNData', {
                      endpoint: 'range',
                      term: String(sp.taxonid || sp.assessment_id)
                    });
                    
                    if (rangeResult.data.status === 'success') {
                      rangeDataGeoJSON = rangeResult.data.data;
                      rangeDataPoints = rangeDataGeoJSON.result || [];
                    }
                  } catch (err) {
                    console.error('Error fetching range data:', err);
                  }

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

                  try {
                    const searchSummaryBlob = new Blob([JSON.stringify(searchSummary, null, 2)], { type: 'application/json' });
                    const searchSummaryFile = new File([searchSummaryBlob], `${sp.scientific_name.replace(/ /g, '_')}_search_summary.json`, { type: 'application/json' });
                    const { file_uri: summaryUri } = await base44.integrations.Core.UploadPrivateFile({ file: searchSummaryFile });
                    searchSummaryFileUri = summaryUri;
                  } catch (err) {
                    console.error('Error uploading search summary:', err);
                  }

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

            detailedSpecies.forEach(sp => {
              allSpeciesMap[sp.scientific_name] = sp;
            });

            // Save IUCN species to database
            for (const species of detailedSpecies) {
              try {
                const existing = await base44.entities.Species.filter({
                  scientific_name: species.scientific_name
                });

                if (existing.length > 0) {
                  const newDataFields = {};
                  
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

      // Continue with iNaturalist and GBIF... (truncated for brevity - will continue in next message)
      
      const allSpeciesFinal = Object.values(allSpeciesMap);

      if (allSpeciesFinal.length === 0) {
        setError('No species found for the search terms.');
        return;
      }
      
      setSpecies(allSpeciesFinal.map(sp => ({
        ...sp,
        is_new: !savedSpeciesScientificNames.has(sp.scientific_name)
      })));
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

  const enrichWithINaturalist = async (species) => {
    setIsLoading(true);
    setError(null);

    try {
      const taxonUrl = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(species.scientific_name)}&rank=species`;
      const taxonRes = await fetch(taxonUrl);
      
      if (!taxonRes.ok) {
        throw new Error('Failed to fetch iNaturalist data');
      }

      const taxonData = await taxonRes.json();
      if (!taxonData.results || taxonData.results.length === 0) {
        setError(`No iNaturalist data found for ${species.scientific_name}`);
        setIsLoading(false);
        return;
      }

      const taxon = taxonData.results[0];

      const obsUrl = `https://api.inaturalist.org/v1/observations?taxon_id=${taxon.id}&per_page=100&order=desc&order_by=created_at&photos=true&quality_grade=research`;
      const obsRes = await fetch(obsUrl);
      let observationData = null;
      if (obsRes.ok) {
        observationData = await obsRes.json();
      }

      const observations = observationData?.results || [];

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

      let inatObservationsCsvFileUri = null;
      if (observationsWithCoords.length > 0) {
        const csvContent = [
          'latitude,longitude,location,date,observer,photo_url',
          ...observationsWithCoords.map(obs => 
            `${obs.latitude},${obs.longitude},"${obs.location}",${obs.observed_on},${obs.user},"${obs.photo_url}"`
          )
        ].join('\n');
        
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        const csvFile = new File([csvBlob], `${species.scientific_name.replace(/ /g, '_')}_inat_observations.csv`, { type: 'text/csv' });
        const { file_uri: csvUri } = await base44.integrations.Core.UploadPrivateFile({ file: csvFile });
        inatObservationsCsvFileUri = csvUri;
      }

      const updateData = {
        inat_taxon_id: taxon.id,
        inat_wikipedia_url: taxon.wikipedia_url || null,
        observation_count: taxon.observations_count || 0,
        observations: observationsWithCoords,
        last_observed: observations[0]?.observed_on || null,
        inat_observations_csv_file_uri: inatObservationsCsvFileUri
      };

      if (!species.common_name && taxon.preferred_common_name) {
        updateData.common_name = taxon.preferred_common_name;
      }

      if (!species.image_url && taxon.default_photo?.medium_url) {
        updateData.image_url = taxon.default_photo.medium_url;
      }

      if (species.id && !species.id.startsWith('iucn-')) {
        await base44.entities.Species.update(species.id, updateData);
        
        setSpecies(prev => prev.map(sp => 
          sp.id === species.id ? { ...sp, ...updateData } : sp
        ));
      } else {
        setSpecies(prev => prev.map(sp => 
          sp.scientific_name === species.scientific_name ? { ...sp, ...updateData } : sp
        ));
      }

      setError(null);
    } catch (err) {
      console.error('Error enriching with iNaturalist:', err);
      setError(`Failed to enrich ${species.scientific_name} with iNaturalist data.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportMAXENT = () => {
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

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maxent_occurrences_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportArcGIS = () => {
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

    const geojson = {
      type: 'FeatureCollection',
      features
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arcgis_species_ranges_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
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

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => {
        const value = String(val || '').replace(/"/g, '""');
        return value.includes(',') || value.includes('"') ? `"${value}"` : value;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `species_database_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-bangor-sun/8 to-bangor-red/3">
      <header className="bg-gradient-to-r from-white via-bangor-sun/5 to-white/80 backdrop-blur-sm border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div onClick={() => setShowLogoSelector(true)} className="cursor-pointer opacity-90">
              <BangOnLogo size="sm" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-bangor-red">The DataWinder</h1>
              <p className="text-sm text-slate-600">b-Izzy on Data - Search & Management</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Search Interface */}
        <TaxonomicSearch onSearch={handleSearch} isLoading={isLoading} />

        {/* Info Banner when no results */}
        {!species.length && !isLoading && !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Alert className="bg-bangor-sun/10 border-bangor-sun/30">
              <Info className="h-4 w-4 text-bangor-sun" />
              <AlertTitle className="text-bangor-red">How It Works</AlertTitle>
              <AlertDescription className="text-slate-700">
                Search species data from multiple academic sources including IUCN Red List (conservation status), iNaturalist (citizen science observations), and GBIF (occurrence & specimen records). 
                Build comprehensive datasets with genomic references, distribution data, and specimen information. 
                Compare species, create custom lists, add personal notes, and export filtered data in CSV or JSON format.
              </AlertDescription>
            </Alert>

            <div className="mt-4 p-4 bg-gradient-to-r from-bangor-red/5 to-bangor-sun/5 rounded-lg border border-bangor-red/20 text-xs text-slate-600">
              <p className="mb-1 font-semibold text-slate-700">Academic Data Sources:</p>
              <p className="italic">• IUCN 2025. IUCN Red List of Threatened Species. Version 2025-2 www.iucnredlist.org</p>
              <p className="italic">• iNaturalist. Citizen science biodiversity observations. www.inaturalist.org</p>
              <p className="italic">• GBIF. Global Biodiversity Information Facility. www.gbif.org</p>
              <p className="text-slate-500 mt-2">Integrate conservation status, occurrence records, specimen data, and genomic references.</p>
            </div>

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

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Split Screen: Search Results + Database Management */}
        {species.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Search Results */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <Card className="shadow-lg border-bangor-sun/20">
                <CardHeader className="border-b border-bangor-sun/20 bg-gradient-to-r from-bangor-red/10 to-bangor-sun/10">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-bangor-red">Search Results ({species.length})</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className={viewMode === 'grid' ? 'bg-bangor-red text-white' : 'bg-slate-100 text-slate-700'}>
                        <Grid3x3 className="w-4 h-4 mr-1" />
                        Grid
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setViewMode('map')}
                        className={viewMode === 'map' ? 'bg-bangor-red text-white' : 'bg-slate-100 text-slate-700'}>
                        <Map className="w-4 h-4 mr-1" />
                        Map
                      </Button>
                    </div>
                  </div>
                  {searchInfo && (
                    <div className="text-sm text-slate-500 mt-2">
                      Showing species from <span className="font-medium text-slate-700">{searchInfo.level}</span>: <span className="font-medium text-bangor-red">{searchInfo.terms}</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
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

                  <div className="mt-4 max-h-[600px] overflow-y-auto">
                    {viewMode === 'grid' ? (
                      <SpeciesGrid
                        species={species}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        onEnrichWithINaturalist={enrichWithINaturalist}
                      />
                    ) : (
                      <MapView
                        species={species}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Right: Database Management Panel */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <Card className="shadow-lg border-bangor-sun/20">
              <CardHeader className="border-b border-bangor-sun/20 bg-gradient-to-r from-bangor-red/10 to-bangor-sun/10">
                <CardTitle className="flex items-center gap-2 text-bangor-red">
                  <Database className="w-5 h-5" />
                  Database Management
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Database Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-bangor-red/10 to-bangor-sun/10 rounded-lg p-4">
                    <div className="text-3xl font-bold text-bangor-red">{allSpecies.length}</div>
                    <div className="text-sm text-slate-600 mt-1">Total Species</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-600">
                      {allSpecies.filter(sp => sp.range_data_geojson).length}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">With Range Data</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-600">
                      {allSpecies.filter(sp => sp.observations?.length > 0 || sp.gbif_occurrences?.length > 0).length}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">With Occurrences</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-purple-600">
                      {[...new Set(allSpecies.map(sp => sp.family))].filter(Boolean).length}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">Families</div>
                  </div>
                </div>

                {/* Export Tools */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Export Data</h3>
                  <div className="space-y-2">
                    <Button
                      onClick={handleExportMAXENT}
                      className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={!allSpecies.some(sp => sp.observations?.length > 0 || sp.gbif_occurrences?.length > 0)}
                    >
                      <Layers className="w-4 h-4 mr-2" />
                      Export for MAXENT (Occurrence Data)
                    </Button>
                    
                    <Button
                      onClick={handleExportArcGIS}
                      className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={!allSpecies.some(sp => sp.range_data_geojson)}
                    >
                      <Map className="w-4 h-4 mr-2" />
                      Export for ArcGIS (GeoJSON Ranges)
                    </Button>
                    
                    <Button
                      onClick={handleExportExcel}
                      className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                      disabled={allSpecies.length === 0}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Export Complete Dataset (Excel/CSV)
                    </Button>
                  </div>
                </div>

                {/* Data Quality */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Data Quality</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Species with IUCN Data:</span>
                      <span className="font-semibold text-slate-900">
                        {allSpecies.filter(sp => sp.iucn_id).length} ({Math.round(allSpecies.filter(sp => sp.iucn_id).length / allSpecies.length * 100)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Species with iNaturalist Data:</span>
                      <span className="font-semibold text-slate-900">
                        {allSpecies.filter(sp => sp.inat_taxon_id).length} ({Math.round(allSpecies.filter(sp => sp.inat_taxon_id).length / allSpecies.length * 100)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Species with GBIF Data:</span>
                      <span className="font-semibold text-slate-900">
                        {allSpecies.filter(sp => sp.gbif_id).length} ({Math.round(allSpecies.filter(sp => sp.gbif_id).length / allSpecies.length * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Load Data Options */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Load Data</h3>
                  <div className="space-y-2">
                    {savedSearches.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-2">Load from Saved Searches:</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {savedSearches.map((search) => (
                            <Button
                              key={search.id}
                              onClick={async () => {
                                setIsLoadingSearch(true);
                                try {
                                  // Fetch species matching this search's taxonomy
                                  const filtered = allSpecies.filter(sp => {
                                    if (search.taxonomy_level === 'family') {
                                      return sp.family === search.search_term;
                                    } else if (search.taxonomy_level === 'genus') {
                                      return sp.genus === search.search_term;
                                    } else if (search.taxonomy_level === 'order') {
                                      return sp.order_name === search.search_term;
                                    } else if (search.taxonomy_level === 'class') {
                                      return sp.class_name === search.search_term;
                                    } else if (search.taxonomy_level === 'species') {
                                      return sp.scientific_name === search.search_term;
                                    }
                                    return false;
                                  });
                                  
                                  setSelectedSpecies(filtered);
                                  alert(`Loaded ${filtered.length} species from ${search.name}`);
                                } catch (error) {
                                  console.error('Error loading search:', error);
                                  alert('Error loading saved search');
                                } finally {
                                  setIsLoadingSearch(false);
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full justify-start text-xs"
                              disabled={isLoadingSearch}
                            >
                              <FolderOpen className="w-3 h-3 mr-2" />
                              {search.name} ({search.species_count})
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        setSelectedSpecies(allSpecies);
                        alert(`Loaded all ${allSpecies.length} species`);
                      }}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Database className="w-4 h-4 mr-2" />
                      Load All Species ({allSpecies.length})
                    </Button>

                    <Button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.csv,.json';
                        input.onchange = async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            alert('Import functionality coming soon!');
                          }
                        };
                        input.click();
                      }}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import Data File
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}