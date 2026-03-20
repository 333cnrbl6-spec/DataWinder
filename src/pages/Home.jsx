import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Info, Database, Map, FileSpreadsheet, Layers, Grid3x3, FolderOpen, Upload, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from 'framer-motion';
import TaxonomicSearch from '@/components/species/TaxonomicSearch';
import SpeciesGrid from '@/components/species/SpeciesGrid';
import MapView from '@/components/species/MapView';
import OccurrenceSourceMap from '@/components/species/OccurrenceSourceMap';
import SelectionBar from '@/components/species/SelectionBar';
import DownloadPanel from '@/components/species/DownloadPanel';
import StatusBadge, { statusConfig } from '@/components/species/StatusBadge';
import CompareSpecies from '@/components/species/CompareSpecies';
import SpeciesListManager from '@/components/species/SpeciesListManager';
import SpeciesNotes from '@/components/species/SpeciesNotes';
import OnboardingWizard from '@/components/OnboardingWizard';
import LogoShowcase from '@/components/LogoShowcase';
import SaveSearchPanel from '@/components/SaveSearchPanel';
import DataSourceBadges from '@/components/DataSourceBadges';

export default function Home() {
  const [species, setSpecies] = useState([]);
  const [savedSpeciesScientificNames, setSavedSpeciesScientificNames] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
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
        // User not logged in, redirect to login with next URL
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

  const handleSearch = async ({ level, terms, iucnToken, includeINaturalist = false, includeGBIF = false, includeSpeciesLink = false, speciesLinkApiKey = '' }) => {
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
      includeSpeciesLink,
      iucnToken: !!iucnToken
    });

    try {
      const allSpeciesMap = {};

      // Search IUCN for each term if token available
      if (iucnToken) {
        for (const term of terms) {
          try {
            const searchResult = await base44.functions.invoke('fetchIUCNData', {
              term,
              endpoint: 'taxa',
              level
            });

            if (searchResult.data.status === 'error') {
              console.error(`IUCN API error for ${term}:`, searchResult.data.message);
              if (searchResult.data.statusCode === 401) {
                setError('IUCN API token is invalid. Please check your token and try again.');
              }
              continue;
            }

            const searchData = searchResult.data.data;

            // v4 API: family/order/class returns {assessments:[]}, species returns {taxon:{...}}
            let speciesList = [];

            if (searchData.assessments && searchData.assessments.length > 0) {
              // Higher-taxon search: get latest assessment per unique taxon
              const latestMap = {};
              for (const a of searchData.assessments) {
                if (a.latest) latestMap[a.sis_taxon_id] = a;
              }
              // Fallback: most recent year per taxon
              if (Object.keys(latestMap).length === 0) {
                for (const a of searchData.assessments) {
                  if (!latestMap[a.sis_taxon_id] || a.year_published > latestMap[a.sis_taxon_id].year_published) {
                    latestMap[a.sis_taxon_id] = a;
                  }
                }
              }
              speciesList = Object.values(latestMap);
            } else if (searchData.taxon) {
              // Species-level search: response is {taxon:{...}, assessments:[...]}
              // assessments are at top level, not nested inside taxon
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
              } else {
                speciesList = [];
              }
            }

            // Enrich speciesList items with SIS assessment history for status_history
            // We batch fetch SIS records for all unique taxon IDs
            const uniqueSisIds = [...new Set(speciesList.map(sp => sp.sis_taxon_id).filter(Boolean))];
            const sisDataMap = {};
            // Batch in chunks of 5 to avoid overloading
            for (let i = 0; i < uniqueSisIds.length; i += 5) {
              const chunk = uniqueSisIds.slice(i, i + 5);
              await Promise.all(chunk.map(async (sisId) => {
                try {
                  const sisResult = await base44.functions.invoke('fetchIUCNData', {
                    endpoint: 'sis', term: String(sisId)
                  });
                  if (sisResult.data.status === 'success') {
                    sisDataMap[sisId] = sisResult.data.data;
                  }
                } catch (e) { /* non-critical */ }
              }));
            }
            // Attach SIS assessments to each species for status history
            speciesList = speciesList.map(sp => ({
              ...sp,
              _sisAssessments: sisDataMap[sp.sis_taxon_id]?.assessments || []
            }));

            if (speciesList.length === 0) {
              console.warn(`No IUCN species found for ${term}`);
              continue;
            }

            // For each species in the result, fetch comprehensive data
            const detailedSpecies = await Promise.all(
              speciesList.map(async (sp) => {
                try {
                  // v4 field names from assessment list items
                  const sisId = sp.sis_taxon_id;
                  const assessmentId = sp.assessment_id;
                  const scientificName = sp.taxon_scientific_name;

                  // v4: ONE call to /assessment/{id} returns EVERYTHING:
                  // habitats[], threats[], conservation_actions[], documentation{},
                  // population_trend{code}, red_list_category{code}, taxon{taxonomy}
                  // No separate sub-endpoints for habitats/threats/countries in v4.
                  const assessmentResult = assessmentId
                    ? await base44.functions.invoke('fetchIUCNData', {
                        endpoint: 'assessment',
                        term: String(assessmentId)
                      })
                    : { data: { status: 'error' } };

                  // v4 assessment is the data object directly (no .result wrapper)
                  const a = assessmentResult.data.status === 'success' ? assessmentResult.data.data : null;

                  // Extract all embedded arrays and nested objects from the single assessment
                  const habitats = a?.habitats || [];
                  const threats = a?.threats || [];
                  const conservationActionsArr = a?.conservation_actions || [];
                  // documentation contains free-text narrative fields
                  const doc = a?.documentation || {};
                  // population_trend is {code, description}
                  const populationTrendCode = (a?.population_trend?.code || 'unknown').toLowerCase();
                  // red_list_category is {code, description, version}
                  const redListCode = a?.red_list_category?.code || sp.red_list_category_code || 'NE';
                  // Taxonomy comes from the embedded taxon object
                  const taxonInfo = a?.taxon || sp._taxon || {};

                  // Download and upload files to backend storage
                  let searchSummaryFileUri = null;
                  let rangeGeoJsonFileUri = null;
                  let assessmentPdfFileUri = null;
                  let rangeShpFileUri = null;
                  let rangeCsvFileUri = null;
                  let rangeMapJpgFileUri = null;

                  // Range data not available via IUCN API v4 (bulk download only)
                  const rangeDataGeoJSON = null;
                  const rangeDataPoints = null;

                  // Fetch additional images via backend (keeps token server-side)
                  let allImages = [];
                  if (sisId && iucnToken) {
                    try {
                      const imagesRes = await base44.functions.invoke('fetchIUCNData', {
                        endpoint: 'sis',
                        term: String(sisId),
                        iucnToken
                      });
                      if (imagesRes.data?.status === 'success') {
                        const sisImgData = imagesRes.data.data;
                        allImages = (sisImgData?.taxon?.image_links || []).map(img => img.url).filter(Boolean);
                      }
                    } catch (err) {
                      console.error('Error fetching images:', err);
                    }
                  }

                  // Extract common name from taxon.common_names[]
                  const commonName = (taxonInfo.common_names || []).find(c => c.main && c.language === 'eng')?.name
                    || (taxonInfo.common_names || []).find(c => c.language === 'eng')?.name
                    || (taxonInfo.common_names || [])[0]?.name || '';

                  // v4 documentation fields contain free-text narrative
                  const populationDetails = doc.population || '';
                  const rangeDesc = doc.range || '';
                  const habitatDesc = doc.habitat || '';
                  const threatsDesc = doc.threats || '';
                  const conservationActionsText = doc.conservation_actions || '';

                  // conservation_actions array → joined string (each has {code, description})
                  const conservationActions = conservationActionsText || 
                    conservationActionsArr.map(ca => ca.description?.en || ca.title || '').filter(Boolean).join('; ');

                  // Countries are NOT embedded in the v4 assessment —
                  // We get them from the scopes or leave empty (they can be fetched separately via /countries/{code})
                  const countryNames = [];
                  const regions = (a?.scopes || []).map(s => s.description?.en || '').filter(Boolean);

                  // Build status history from the assessments list on the SIS taxon (available via sp._sisAssessments)
                  const statusHistory = (sp._sisAssessments || []).map(h => ({
                    year: parseInt(h.year_published),
                    status: h.red_list_category_code,
                    category: h.red_list_category_code
                  }));

                  const searchSummary = {
                    taxon_id: sisId,
                    scientific_name: scientificName,
                    common_name: commonName,
                    category: redListCode,
                    population_trend: populationTrendCode,
                    population: populationDetails,
                    assessment_date: a?.year_published,
                    countries: countryNames,
                    regions,
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
                    conservation_measures: conservationActions,
                    range_description: rangeDesc,
                    habitat_description: habitatDesc,
                    threats_description: threatsDesc,
                    use_and_trade: doc.use_trade || '',
                    range_data_points: rangeDataPoints,
                    assessment_id: assessmentId
                  };

                  // Upload search summary JSON to backend storage
                  try {
                    const searchSummaryBlob = new Blob([JSON.stringify(searchSummary, null, 2)], { type: 'application/json' });
                    const searchSummaryFile = new File([searchSummaryBlob], `${scientificName.replace(/ /g, '_')}_search_summary.json`, { type: 'application/json' });
                    const { file_uri: summaryUri } = await base44.integrations.Core.UploadPrivateFile({ file: searchSummaryFile });
                    searchSummaryFileUri = summaryUri;
                  } catch (err) {
                    console.error('Error uploading search summary:', err);
                  }

                  // Upload range GeoJSON to backend storage
                  if (rangeDataGeoJSON) {
                    try {
                      const rangeGeoJsonBlob = new Blob([JSON.stringify(rangeDataGeoJSON, null, 2)], { type: 'application/json' });
                      const rangeGeoJsonFile = new File([rangeGeoJsonBlob], `${scientificName.replace(/ /g, '_')}_range_data.geojson`, { type: 'application/json' });
                      const { file_uri: geoJsonUri } = await base44.integrations.Core.UploadPrivateFile({ file: rangeGeoJsonFile });
                      rangeGeoJsonFileUri = geoJsonUri;
                    } catch (err) {
                      console.error('Error uploading range GeoJSON:', err);
                    }
                  }

                  // Note: IUCN PDF/map downloads require browser session (not API-accessible)
                  // assessment_pdf_url and range_map_jpg_url are stored as reference links only

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
                      const csvFile = new File([csvBlob], `${scientificName.replace(/ /g, '_')}_range_points.csv`, { type: 'text/csv' });
                      const { file_uri: csvUri } = await base44.integrations.Core.UploadPrivateFile({ file: csvFile });
                      rangeCsvFileUri = csvUri;
                    } catch (err) {
                      console.error('Error uploading range CSV:', err);
                    }
                  }
                  
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
                    // v4: taxonomy is in assessment.taxon
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
                    range_data_csv_url: rangeDataPoints ? 'available' : null,
                    range_data_geojson: rangeDataGeoJSON,
                    search_summary_json: searchSummary,
                    search_results_csv_url: `https://www.iucnredlist.org/search/export?query=${encodeURIComponent(term)}&searchType=species`,
                    all_images_urls: allImages,
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
                  console.error(`Error fetching comprehensive details for ${sp.taxon_scientific_name || sp.scientific_name}:`, err);
                  const sisIdFallback = sp.sis_taxon_id || sp.taxonid;
                  return {
                    id: `iucn-${sisIdFallback}`,
                    scientific_name: sp.taxon_scientific_name || sp.scientific_name,
                    common_name: '',
                    iucn_status: sp.red_list_category_code || sp.category || 'NE',
                    iucn_id: sisIdFallback,
                    assessment_id: sp.assessment_id,
                    dataset_name: term,
                    data_source: 'IUCN Red List'
                    };
                    }
                    })
                    );

                    detailedSpecies.forEach(sp => {
                    allSpeciesMap[sp.scientific_name] = sp;
                  });

            // Attempt to download and store IUCN binary files (PDF, range map) for each species
            for (const species of detailedSpecies) {
              if (!species.iucn_id) continue;
              try {
                const dlResult = await base44.functions.invoke('downloadIUCNFiles', {
                  scientific_name: species.scientific_name,
                  assessment_id: species.assessment_id,
                  range_map_jpg_url: species.range_map_jpg_url,
                  range_data_shp_url: species.range_data_shp_url,
                  range_data_csv_url: species.range_data_csv_url && species.range_data_csv_url !== 'available' ? species.range_data_csv_url : null
                });
                if (dlResult.data?.status === 'success') {
                  if (dlResult.data.assessment_pdf_file_uri) species.assessment_pdf_file_uri = dlResult.data.assessment_pdf_file_uri;
                  if (dlResult.data.range_map_jpg_file_uri) species.range_map_jpg_file_uri = dlResult.data.range_map_jpg_file_uri;
                  if (dlResult.data.range_shp_file_uri) species.range_shp_file_uri = dlResult.data.range_shp_file_uri;
                  if (dlResult.data.range_csv_file_uri) species.range_csv_file_uri = dlResult.data.range_csv_file_uri;
                }
              } catch (e) {
                console.warn(`IUCN file download skipped for ${species.scientific_name}:`, e.message);
              }
            }

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

      // Search iNaturalist if enabled
      if (includeINaturalist) {
        for (const term of terms) {
          try {
            let iNatTaxa = [];

            // For higher-order searches, find the parent taxon first
            if (level !== 'species') {
              const parentUrl = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(term)}&rank=${level}&per_page=1`;
              const parentRes = await fetch(parentUrl);
              if (parentRes.ok) {
                const parentData = await parentRes.json();
                if (parentData.results?.[0]) {
                  const parentId = parentData.results[0].id;
                  // Get species within this taxon
                  const speciesUrl = `https://api.inaturalist.org/v1/taxa?taxon_id=${parentId}&rank=species&per_page=60`;
                  const speciesRes = await fetch(speciesUrl);
                  if (speciesRes.ok) {
                    const speciesData = await speciesRes.json();
                    iNatTaxa = speciesData.results || [];
                  }
                }
              }
            }
            
            // Fallback to text search if no results
            if (iNatTaxa.length === 0) {
              const taxonUrl = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(term)}&rank=species&per_page=300`;
              const taxonRes = await fetch(taxonUrl);
              if (taxonRes.ok) {
                const taxonData = await taxonRes.json();
                iNatTaxa = taxonData.results || [];
              }
            }

            if (iNatTaxa.length === 0) {
              console.warn(`No iNaturalist species found for ${term}`);
              continue;
            }

            // Process each species (up to 300)
            for (const taxon of iNatTaxa.slice(0, 300)) {
              const obsUrl = `https://api.inaturalist.org/v1/observations?taxon_id=${taxon.id}&per_page=200&order=desc&order_by=created_at&quality_grade=research`;

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
                const csvFile = new File([csvBlob], `${taxon.name.replace(/ /g, '_')}_inat_observations.csv`, { type: 'text/csv' });
                const { file_uri: csvUri } = await base44.integrations.Core.UploadPrivateFile({ file: csvFile });
                inatObservationsCsvFileUri = csvUri;
              }

              const inatSpeciesData = {
                id: `inat-${taxon.id}`,
                scientific_name: taxon.name,
                common_name: taxon.preferred_common_name || '',
                iucn_status: 'NE',
                inat_taxon_id: taxon.id,
                inat_wikipedia_url: taxon.wikipedia_url || null,
                observation_count: taxon.observations_count || 0,
                observations: observationsWithCoords,
                last_observed: observations[0]?.observed_on || null,
                inat_observations_csv_file_uri: inatObservationsCsvFileUri,
                data_source: 'iNaturalist',
                image_url: taxon.default_photo?.medium_url || null,
                dataset_name: term
              };

              if (allSpeciesMap[inatSpeciesData.scientific_name]) {
                const existing = allSpeciesMap[inatSpeciesData.scientific_name];
                allSpeciesMap[inatSpeciesData.scientific_name] = {
                  ...existing,
                  inat_taxon_id: inatSpeciesData.inat_taxon_id,
                  inat_wikipedia_url: inatSpeciesData.inat_wikipedia_url,
                  observation_count: inatSpeciesData.observation_count,
                  observations: inatSpeciesData.observations,
                  last_observed: inatSpeciesData.last_observed,
                  inat_observations_csv_file_uri: inatSpeciesData.inat_observations_csv_file_uri,
                  data_source: 'IUCN + iNaturalist',
                  image_url: existing.image_url || inatSpeciesData.image_url
                };
              } else {
                allSpeciesMap[inatSpeciesData.scientific_name] = inatSpeciesData;
              }
            }
          } catch (err) {
            console.error(`Error fetching iNaturalist data for ${term}:`, err);
          }
        }
      }

      // Search GBIF if enabled
      if (includeGBIF) {
        // For higher taxonomic searches, search once per term
        if (level && level !== 'species') {
          for (const term of terms) {
            try {
              const gbifResult = await base44.functions.invoke('fetchGBIFData', {
                scientificName: term.trim(),
                level: level
              });

              if (gbifResult.data.status === 'success') {
                const gbifSpeciesList = Array.isArray(gbifResult.data.data) 
                  ? gbifResult.data.data 
                  : [gbifResult.data.data];

                for (const gbifData of gbifSpeciesList) {
                  // Create CSV of GBIF occurrences
                  let gbifOccurrencesCsvFileUri = null;
                  if (gbifData.gbif_occurrences && gbifData.gbif_occurrences.length > 0) {
                    const csvContent = [
                      'latitude,longitude,location,date,basis_of_record,institution,catalog_number',
                      ...gbifData.gbif_occurrences.map(occ => 
                        `${occ.latitude},${occ.longitude},"${occ.location}",${occ.date},"${occ.basis_of_record}","${occ.institution}","${occ.catalog_number}"`
                      )
                    ].join('\n');

                    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
                    const csvFile = new File([csvBlob], `${gbifData.scientific_name.replace(/ /g, '_')}_gbif_occurrences.csv`, { type: 'text/csv' });
                    const { file_uri: csvUri } = await base44.integrations.Core.UploadPrivateFile({ file: csvFile });
                    gbifOccurrencesCsvFileUri = csvUri;
                  }

                  // Merge GBIF data with existing species or create new entry
                  if (allSpeciesMap[gbifData.scientific_name]) {
                    allSpeciesMap[gbifData.scientific_name] = {
                      ...allSpeciesMap[gbifData.scientific_name],
                      gbif_id: gbifData.gbif_id,
                      gbif_occurrence_count: gbifData.gbif_occurrence_count,
                      gbif_occurrences: gbifData.gbif_occurrences,
                      gbif_basis_of_record: gbifData.gbif_basis_of_record,
                      gbif_last_occurrence: gbifData.gbif_last_occurrence,
                      gbif_occurrences_csv_file_uri: gbifOccurrencesCsvFileUri,
                      data_source: allSpeciesMap[gbifData.scientific_name].data_source === 'IUCN + iNaturalist' ? 
                        'IUCN + iNaturalist + GBIF' : 
                        allSpeciesMap[gbifData.scientific_name].data_source ? 
                          `${allSpeciesMap[gbifData.scientific_name].data_source} + GBIF` : 
                          'GBIF'
                    };
                  } else {
                    // Create new species entry from GBIF data
                    allSpeciesMap[gbifData.scientific_name] = {
                      id: `gbif-${gbifData.gbif_id}`,
                      scientific_name: gbifData.scientific_name,
                      common_name: gbifData.common_name || '',
                      kingdom: gbifData.kingdom,
                      phylum: gbifData.phylum,
                      class_name: gbifData.class_name,
                      order_name: gbifData.order_name,
                      family: gbifData.family,
                      genus: gbifData.genus,
                      iucn_status: 'NE',
                      gbif_id: gbifData.gbif_id,
                      gbif_occurrence_count: gbifData.gbif_occurrence_count,
                      gbif_occurrences: gbifData.gbif_occurrences,
                      gbif_basis_of_record: gbifData.gbif_basis_of_record,
                      gbif_last_occurrence: gbifData.gbif_last_occurrence,
                      gbif_occurrences_csv_file_uri: gbifOccurrencesCsvFileUri,
                      data_source: 'GBIF',
                      dataset_name: terms.join(', ')
                    };
                  }
                }
              }
            } catch (err) {
              console.error(`Error fetching GBIF data for ${term}:`, err);
            }
          }
        } else {
          // For species-level searches, query each scientific name
          const scientificNames = Object.keys(allSpeciesMap).length > 0 
            ? Object.keys(allSpeciesMap)
            : terms.filter(t => t.trim());

          for (const scientificName of scientificNames) {
            try {
              const gbifResult = await base44.functions.invoke('fetchGBIFData', {
                scientificName: scientificName,
                level: 'species'
              });

              if (gbifResult.data.status === 'success') {
                const gbifData = gbifResult.data.data;

                // Create CSV of GBIF occurrences
                let gbifOccurrencesCsvFileUri = null;
                if (gbifData.gbif_occurrences && gbifData.gbif_occurrences.length > 0) {
                  const csvContent = [
                    'latitude,longitude,location,date,basis_of_record,institution,catalog_number',
                    ...gbifData.gbif_occurrences.map(occ => 
                      `${occ.latitude},${occ.longitude},"${occ.location}",${occ.date},"${occ.basis_of_record}","${occ.institution}","${occ.catalog_number}"`
                    )
                  ].join('\n');

                  const csvBlob = new Blob([csvContent], { type: 'text/csv' });
                  const csvFile = new File([csvBlob], `${scientificName.replace(/ /g, '_')}_gbif_occurrences.csv`, { type: 'text/csv' });
                  const { file_uri: csvUri } = await base44.integrations.Core.UploadPrivateFile({ file: csvFile });
                  gbifOccurrencesCsvFileUri = csvUri;
                }

                // Merge GBIF data with existing species or create new entry
                if (allSpeciesMap[scientificName]) {
                  allSpeciesMap[scientificName] = {
                    ...allSpeciesMap[scientificName],
                    gbif_id: gbifData.gbif_id,
                    gbif_occurrence_count: gbifData.gbif_occurrence_count,
                    gbif_occurrences: gbifData.gbif_occurrences,
                    gbif_basis_of_record: gbifData.gbif_basis_of_record,
                    gbif_last_occurrence: gbifData.gbif_last_occurrence,
                    gbif_occurrences_csv_file_uri: gbifOccurrencesCsvFileUri,
                    data_source: allSpeciesMap[scientificName].data_source === 'IUCN + iNaturalist' ? 
                      'IUCN + iNaturalist + GBIF' : 
                      allSpeciesMap[scientificName].data_source ? 
                        `${allSpeciesMap[scientificName].data_source} + GBIF` : 
                        'GBIF'
                  };
                } else {
                  // Create new species entry from GBIF data
                  allSpeciesMap[scientificName] = {
                    id: `gbif-${gbifData.gbif_id}`,
                    scientific_name: gbifData.scientific_name,
                    common_name: gbifData.common_name || '',
                    kingdom: gbifData.kingdom,
                    phylum: gbifData.phylum,
                    class_name: gbifData.class_name,
                    order_name: gbifData.order_name,
                    family: gbifData.family,
                    genus: gbifData.genus,
                    iucn_status: 'NE',
                    gbif_id: gbifData.gbif_id,
                    gbif_occurrence_count: gbifData.gbif_occurrence_count,
                    gbif_occurrences: gbifData.gbif_occurrences,
                    gbif_basis_of_record: gbifData.gbif_basis_of_record,
                    gbif_last_occurrence: gbifData.gbif_last_occurrence,
                    gbif_occurrences_csv_file_uri: gbifOccurrencesCsvFileUri,
                    data_source: 'GBIF',
                    dataset_name: terms.join(', ')
                  };
                }
              }
            } catch (err) {
              console.error(`Error fetching GBIF data for ${scientificName}:`, err);
            }
          }
        }
      }

      // Search speciesLink if enabled
      if (includeSpeciesLink && speciesLinkApiKey) {
        const namesToSearch = Object.keys(allSpeciesMap).length > 0
          ? Object.keys(allSpeciesMap)
          : terms.filter(t => t.trim());

        for (const scientificName of namesToSearch) {
          try {
            const slResult = await base44.functions.invoke('fetchSpeciesLinkData', {
              scientificName,
              apiKey: speciesLinkApiKey,
              limit: 200
            });

            if (slResult.data?.status === 'success') {
              const slData = slResult.data.data;

              // Build CSV file
              let slCsvFileUri = null;
              if (slData.specieslink_occurrences?.length > 0) {
                const csvContent = [
                  'latitude,longitude,location,date,basis_of_record,institution,collection,catalog_number,recorded_by,type_status',
                  ...slData.specieslink_occurrences.map(o =>
                    `${o.latitude},${o.longitude},"${o.location}",${o.date || ''},"${o.basis_of_record}","${o.institution}","${o.collection}","${o.catalog_number}","${o.recorded_by}","${o.type_status}"`
                  )
                ].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const file = new File([blob], `${scientificName.replace(/ /g, '_')}_specieslink.csv`, { type: 'text/csv' });
                const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
                slCsvFileUri = file_uri;
              }

              if (allSpeciesMap[scientificName]) {
                allSpeciesMap[scientificName] = {
                  ...allSpeciesMap[scientificName],
                  specieslink_occurrence_count: slData.specieslink_occurrence_count,
                  specieslink_occurrences: slData.specieslink_occurrences,
                  specieslink_last_collected: slData.specieslink_last_collected,
                  specieslink_occurrences_csv_file_uri: slCsvFileUri,
                  data_source: allSpeciesMap[scientificName].data_source
                    ? `${allSpeciesMap[scientificName].data_source} + speciesLink`
                    : 'speciesLink'
                };
              } else {
                allSpeciesMap[scientificName] = {
                  id: `specieslink-${scientificName}`,
                  scientific_name: scientificName,
                  common_name: '',
                  iucn_status: 'NE',
                  specieslink_occurrence_count: slData.specieslink_occurrence_count,
                  specieslink_occurrences: slData.specieslink_occurrences,
                  specieslink_last_collected: slData.specieslink_last_collected,
                  specieslink_occurrences_csv_file_uri: slCsvFileUri,
                  data_source: 'speciesLink',
                  dataset_name: terms.join(', ')
                };
              }
            }
          } catch (err) {
            console.error(`Error fetching speciesLink data for ${scientificName}:`, err);
          }
        }
      }

      // Persist all iNat-only and GBIF-only species to DB (IUCN ones are already saved above)
      for (const sp of Object.values(allSpeciesMap)) {
        if (sp.data_source === 'IUCN Red List') continue; // already saved
        try {
          const existing = await base44.entities.Species.filter({ scientific_name: sp.scientific_name });
          const dbFields = {
            scientific_name: sp.scientific_name,
            common_name: sp.common_name || '',
            kingdom: sp.kingdom || '',
            phylum: sp.phylum || '',
            class_name: sp.class_name || '',
            order_name: sp.order_name || '',
            family: sp.family || '',
            genus: sp.genus || '',
            iucn_status: sp.iucn_status || 'NE',
            inat_taxon_id: sp.inat_taxon_id || null,
            inat_wikipedia_url: sp.inat_wikipedia_url || null,
            observation_count: sp.observation_count || 0,
            observations: sp.observations || [],
            last_observed: sp.last_observed || null,
            inat_observations_csv_file_uri: sp.inat_observations_csv_file_uri || null,
            gbif_id: sp.gbif_id || null,
            gbif_occurrence_count: sp.gbif_occurrence_count || 0,
            gbif_occurrences: sp.gbif_occurrences || [],
            gbif_basis_of_record: sp.gbif_basis_of_record || null,
            gbif_last_occurrence: sp.gbif_last_occurrence || null,
            gbif_occurrences_csv_file_uri: sp.gbif_occurrences_csv_file_uri || null,
            specieslink_occurrence_count: sp.specieslink_occurrence_count || 0,
            specieslink_occurrences: sp.specieslink_occurrences || [],
            specieslink_last_collected: sp.specieslink_last_collected || null,
            specieslink_occurrences_csv_file_uri: sp.specieslink_occurrences_csv_file_uri || null,
            image_url: sp.image_url || null,
          };
          if (existing.length > 0) {
            // Merge new observation/occurrence data into existing IUCN record
            const updates = {};
            if (sp.inat_taxon_id && !existing[0].inat_taxon_id) { updates.inat_taxon_id = sp.inat_taxon_id; updates.observation_count = sp.observation_count; updates.observations = sp.observations; updates.last_observed = sp.last_observed; updates.inat_observations_csv_file_uri = sp.inat_observations_csv_file_uri; }
            if (sp.gbif_id && !existing[0].gbif_id) { updates.gbif_id = sp.gbif_id; updates.gbif_occurrence_count = sp.gbif_occurrence_count; updates.gbif_occurrences = sp.gbif_occurrences; updates.gbif_basis_of_record = sp.gbif_basis_of_record; updates.gbif_last_occurrence = sp.gbif_last_occurrence; updates.gbif_occurrences_csv_file_uri = sp.gbif_occurrences_csv_file_uri; }
            if (sp.specieslink_occurrence_count && !existing[0].specieslink_occurrence_count) { updates.specieslink_occurrence_count = sp.specieslink_occurrence_count; updates.specieslink_occurrences = sp.specieslink_occurrences; updates.specieslink_last_collected = sp.specieslink_last_collected; updates.specieslink_occurrences_csv_file_uri = sp.specieslink_occurrences_csv_file_uri; }
            if (!existing[0].image_url && sp.image_url) updates.image_url = sp.image_url;
            if (Object.keys(updates).length > 0) await base44.entities.Species.update(existing[0].id, updates);
          } else {
            await base44.entities.Species.create(dbFields);
          }
        } catch (e) {
          console.error(`Error persisting ${sp.scientific_name} to DB:`, e.message);
        }
      }

      const allSpecies = Object.values(allSpeciesMap);

      if (allSpecies.length === 0) {
        setError('No species found for the search terms.');
        return;
      }
      
      setSpecies(allSpecies.map(sp => ({
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
      // Fetch iNaturalist data for this specific species
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

      // Fetch observations
      const obsUrl = `https://api.inaturalist.org/v1/observations?taxon_id=${taxon.id}&per_page=100&order=desc&order_by=created_at&photos=true&quality_grade=research`;
      const obsRes = await fetch(obsUrl);
      let observationData = null;
      if (obsRes.ok) {
        observationData = await obsRes.json();
      }

      const observations = observationData?.results || [];

      // Store observations with coordinates
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

      // Create CSV of observations
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

      // Prepare update data
      const updateData = {
        inat_taxon_id: taxon.id,
        inat_wikipedia_url: taxon.wikipedia_url || null,
        observation_count: taxon.observations_count || 0,
        observations: observationsWithCoords,
        last_observed: observations[0]?.observed_on || null,
        inat_observations_csv_file_uri: inatObservationsCsvFileUri
      };

      // Add common name if missing
      if (!species.common_name && taxon.preferred_common_name) {
        updateData.common_name = taxon.preferred_common_name;
      }

      // Add image if missing
      if (!species.image_url && taxon.default_photo?.medium_url) {
        updateData.image_url = taxon.default_photo.medium_url;
      }

      // Check if saved in DB already
      const existing = await base44.entities.Species.filter({ scientific_name: species.scientific_name });
      if (existing.length > 0) {
        await base44.entities.Species.update(existing[0].id, updateData);
        setSpecies(prev => prev.map(sp =>
          sp.scientific_name === species.scientific_name ? { ...sp, ...updateData, id: existing[0].id } : sp
        ));
      } else {
        // Save to DB as new record then update local state
        const created = await base44.entities.Species.create({
          scientific_name: species.scientific_name,
          common_name: species.common_name,
          iucn_status: species.iucn_status,
          ...updateData
        });
        setSpecies(prev => prev.map(sp =>
          sp.scientific_name === species.scientific_name ? { ...sp, ...updateData, id: created.id } : sp
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

  return (
    <div className="bg-gradient-to-br from-slate-50 via-slate-100 to-bangor-red/5">
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Split Screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Search Panel */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <Card className="shadow-lg border-slate-200">
              <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-bangor-red/10 to-slate-100">
                <CardTitle className="text-bangor-red">Species Search</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <TaxonomicSearch onSearch={handleSearch} isLoading={isLoading} />
              </CardContent>
            </Card>

            {/* Search Results */}
            {species.length > 0 && (
              <Card className="shadow-lg border-slate-200">
                <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-bangor-red/10 to-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-bangor-red">Search Results ({species.length})</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className={viewMode === 'grid' ? 'bg-bangor-red text-white' : 'bg-slate-100 text-slate-800'}
                      >
                        <Grid3x3 className="w-4 h-4 mr-1" />
                        Grid
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setViewMode('map')}
                        className={viewMode === 'map' ? 'bg-bangor-red text-white' : 'bg-slate-100 text-slate-800'}
                      >
                        <Map className="w-4 h-4 mr-1" />
                        Map
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setViewMode('sources')}
                        className={viewMode === 'sources' ? 'bg-bangor-red text-white' : 'bg-slate-100 text-slate-800'}
                      >
                        <Layers className="w-4 h-4 mr-1" />
                        Sources
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
                    onSelectAll={() => setSelectedIds(species.map(sp => sp.id || sp.scientific_name))}
                    onDeselectAll={() => setSelectedIds([])}
                    onDownload={() => setShowDownload(true)}
                    onCompare={() => selectedSpecies.length >= 2 && setShowCompare(true)}
                    onManageLists={() => setShowListManager(true)}
                    onAddNote={(sp) => { setNoteSpecies(sp); setShowNotes(true); }}
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
                    ) : viewMode === 'map' ? (
                      <MapView
                        species={species}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                      />
                    ) : (
                      <OccurrenceSourceMap species={species} />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Banner when no results */}
            {!species.length && !isLoading && !error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Alert className="bg-bangor-red/5 border-bangor-red/20">
                  <Info className="h-4 w-4 text-bangor-red" />
                  <AlertTitle className="text-bangor-red">How It Works</AlertTitle>
                  <AlertDescription className="text-slate-700 space-y-2">
                    <p>DataWinder is a species distribution modelling toolkit built for ecological research at Bangor University. Use the workflow below to build, analyse, and model species data:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li><span className="font-semibold">Search</span> — Query by species, genus, family, order, or class across IUCN Red List, iNaturalist, and GBIF simultaneously.</li>
                      <li><span className="font-semibold">Enrich</span> — Pull conservation status, population trends, habitat & threat data from IUCN; citizen science observations from iNaturalist; and georeferenced occurrence records from GBIF.</li>
                      <li><span className="font-semibold">Review & Compare</span> — Select species, compare side-by-side, add personal research notes, and organise into custom lists.</li>
                      <li><span className="font-semibold">Export</span> — Download occurrence data formatted for MAXENT, GeoJSON ranges for ArcGIS, or a full species dataset as CSV.</li>
                      <li><span className="font-semibold">Model</span> — Use the MAXENT Modeller to configure and run habitat suitability models using your curated species and climate layer selections.</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <div className="mt-4 p-4 bg-gradient-to-r from-bangor-red/5 to-slate-50 rounded-lg border border-bangor-red/20 text-xs text-slate-600">
                  <p className="mb-1 font-semibold text-slate-700">Academic Data Sources:</p>
                  <p className="italic">• IUCN 2025. IUCN Red List of Threatened Species. Version 2025-2 www.iucnredlist.org</p>
                  <p className="italic">• iNaturalist. Citizen science biodiversity observations. www.inaturalist.org</p>
                  <p className="italic">• GBIF. Global Biodiversity Information Facility. www.gbif.org</p>
                  <p className="text-slate-500 mt-2">Integrate conservation status, occurrence records, specimen data, and genomic references.</p>
                  <div className="mt-3 pt-3 border-t border-bangor-red/10">
                    <p className="text-xs text-slate-500 mb-2 font-medium">Data & Tool Partners:</p>
                    <DataSourceBadges size="xs" />
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gradient-to-r from-bangor-red/5 to-slate-50 rounded-lg border border-bangor-red/10 flex items-start gap-3">
                  <Leaf className="w-4 h-4 text-bangor-red mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 italic">
                    Inspired by the pioneering work of <span className="font-semibold text-bangor-red not-italic">Dr. I.C. Winder</span>, whose research in ecological modelling has been instrumental in shaping this platform.
                  </p>
                </div>

                <div className="mt-6 bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-6 shadow-sm">
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

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-bangor-red/30 rounded-full animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-bangor-red animate-bounce" />
                  </div>
                </div>
                <p className="mt-4 text-slate-600 font-semibold">Downloading Species Data...</p>
                <div className="mt-2 text-sm text-slate-500 space-y-1">
                  {searchInfo?.iucnToken && <p>• Fetching from IUCN Red List</p>}
                  {searchInfo?.includeINaturalist && <p>• Fetching from iNaturalist</p>}
                  {searchInfo?.includeGBIF && <p>• Fetching from GBIF</p>}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right: Database Management Panel - Always Visible */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <Card className="shadow-lg border-slate-200">
              <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-bangor-red/10 to-slate-100">
                <CardTitle className="flex items-center gap-2 text-bangor-red">
                  <Database className="w-5 h-5" />
                  Database Management
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Database Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-bangor-red/10 to-bangor-cardinal/10 rounded-lg p-4">
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

                {/* ArcGIS Tools */}
                <div className="mb-4">
                  <Link to={createPageUrl('ArcGISTools')}>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-blue-200 hover:bg-blue-50"
                    >
                      <Map className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-blue-700 font-semibold">ArcGIS Tools & API</span>
                    </Button>
                  </Link>
                </div>

                {/* Export Tools */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Export Data</h3>
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
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
                      }}
                      className="w-full justify-start bg-emerald-600 hover:bg-emerald-700"
                      disabled={!allSpecies.some(sp => sp.observations?.length > 0 || sp.gbif_occurrences?.length > 0)}
                    >
                      <Layers className="w-4 h-4 mr-2" />
                      Export for MAXENT (Occurrence Data)
                    </Button>
                    
                    <Button
                      onClick={() => {
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
                      }}
                      className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                      disabled={!allSpecies.some(sp => sp.range_data_geojson)}
                    >
                      <Map className="w-4 h-4 mr-2" />
                      Export for ArcGIS (GeoJSON Ranges)
                    </Button>
                    
                    <Button
                      onClick={() => {
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
                      }}
                      className="w-full justify-start bg-green-600 hover:bg-green-700"
                      disabled={allSpecies.length === 0}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Export Complete Dataset (Excel/CSV)
                    </Button>
                  </div>
                </div>

                {/* Data Quality */}
                {allSpecies.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Data Quality</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Species with IUCN Data:</span>
                        <span className="font-semibold text-slate-900">
                          {allSpecies.filter(sp => sp.iucn_id).length} ({Math.round((allSpecies.filter(sp => sp.iucn_id).length / allSpecies.length) * 100)}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Species with iNaturalist Data:</span>
                        <span className="font-semibold text-slate-900">
                          {allSpecies.filter(sp => sp.inat_taxon_id).length} ({Math.round((allSpecies.filter(sp => sp.inat_taxon_id).length / allSpecies.length) * 100)}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Species with GBIF Data:</span>
                        <span className="font-semibold text-slate-900">
                          {allSpecies.filter(sp => sp.gbif_id).length} ({Math.round((allSpecies.filter(sp => sp.gbif_id).length / allSpecies.length) * 100)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

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
                                  
                                  setSpecies(filtered);
                                  setSelectedIds(filtered.map(sp => sp.id || sp.scientific_name));
                                } catch (error) {
                                  console.error('Error loading search:', error);
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
                        setSpecies(allSpecies);
                        setSelectedIds(allSpecies.map(sp => sp.id || sp.scientific_name));
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
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
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
                                  headers.forEach((h, i) => { obj[h] = (values[i] || '').replace(/^"|"$/g, '').trim(); });
                                  return obj;
                                });
                              }
                              let created = 0;
                              for (const record of records) {
                                if (!record.scientific_name) continue;
                                const existing = await base44.entities.Species.filter({ scientific_name: record.scientific_name });
                                if (existing.length === 0) {
                                  await base44.entities.Species.create(record);
                                  created++;
                                }
                              }
                              toast.success(`Import complete! ${created} new species added.`);
                              refetchSpecies();
                            } catch (err) {
                              toast.error('Import failed: ' + err.message);
                            }
                          };
                          reader.readAsText(file);
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

      {/* Download Panel */}
      {showDownload && selectedSpecies.length > 0 && (
        <DownloadPanel
          selectedSpecies={selectedSpecies}
          onClose={() => setShowDownload(false)}
          onSaveComplete={() => {
            toast.success('Data saved to database successfully!');
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
          setShowLogoSelector(false);
          toast.success(`Logo "${logoId}" selected.`);
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