import React, { useState, useEffect } from 'react';
import { useSearchSounds } from '@/hooks/useSearchSounds';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Info, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchIUCNSpecies } from '@/hooks/useIUCNSearch';
import { createCommunityMember, completeOnboarding } from '@/lib/onboardingValidator';
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from 'framer-motion';
import DownloadPanel from '@/components/species/DownloadPanel';
import StatusBadge, { statusConfig } from '@/components/species/StatusBadge';
import CompareSpecies from '@/components/species/CompareSpecies';
import SpeciesListManager from '@/components/species/SpeciesListManager';
import SpeciesNotes from '@/components/species/SpeciesNotes';
import OnboardingWizard from '@/components/OnboardingWizard';
import LogoShowcase from '@/components/LogoShowcase';
import SaveSearchPanel from '@/components/SaveSearchPanel';
import DataSourceBadges from '@/components/DataSourceBadges';
import SearchPanel from '@/components/home/SearchPanel';
import DatabasePanel from '@/components/home/DatabasePanel';
import ResultsPanel from '@/components/home/ResultsPanel';

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
  const { playSuccess, playError, startTicking, stopTicking } = useSearchSounds();

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

  const handleOnboardingComplete = async (communityData) => {
    try {
      // Create/update CommunityMember record
      await createCommunityMember(base44, communityData);
      // Mark onboarding as complete in user profile
      await completeOnboarding(base44);
      setShowOnboarding(false);
      setOnboardingChecked(true);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast.error('Onboarding failed. Please try again.');
    }
  };

  const handleSearch = async (searchParams) => {
    const { level, terms, iucnToken, includeINaturalist = false, includeGBIF = false, includeSpeciesLink = false, speciesLinkApiKey = '' } = searchParams;

    if (!onboardingChecked) {
      setShowOnboarding(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSpecies([]);
    setSelectedIds([]);
    startTicking(4000);
    setSearchInfo({ 
      level, 
      terms: terms.join(', '),
      includeINaturalist,
      includeGBIF,
      includeSpeciesLink,
      iucnToken: !!iucnToken
    });

    try {
      // Fetch all species data from IUCN using refactored hook
      let allSpeciesMap = {};
      try {
        allSpeciesMap = await fetchIUCNSpecies(terms, level, false, iucnToken);
      } catch (err) {
        setError(err.message || 'Failed to fetch IUCN data');
        stopTicking();
        playError();
        setIsLoading(false);
        return;
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

              if (gbifResult?.data?.status === 'success') {
                const gbifSpeciesList = Array.isArray(gbifResult?.data?.data) 
                  ? gbifResult.data.data 
                  : [gbifResult?.data?.data];

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

              if (gbifResult?.data?.status === 'success') {
                const gbifData = gbifResult?.data?.data;

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

      if (!allSpecies || allSpecies.length === 0) {
        stopTicking();
        playError();
        setError('No species found for the search terms.');
        return;
      }
      
      setSpecies(allSpecies.map(sp => ({
        ...sp,
        is_new: !savedSpeciesScientificNames.has(sp.scientific_name)
      })));
      stopTicking();
      playSuccess();
    } catch (err) {
      console.error('Search error:', err);
      stopTicking();
      playError();
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

  const handleDeleteSpecies = async (sp) => {
    // Remove from local results immediately
    setSpecies(prev => prev.filter(s => (s.id || s.scientific_name) !== (sp.id || sp.scientific_name)));
    setSelectedIds(prev => prev.filter(id => id !== (sp.id || sp.scientific_name)));
    // If it has a DB record, delete it
    if (sp.id) {
      await base44.entities.Species.delete(sp.id);
      toast.success(`Deleted ${sp.scientific_name}`);
    } else {
      toast.success(`Removed ${sp.scientific_name} from results`);
    }
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
          {/* Left: Search & Results */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <SearchPanel onSearch={handleSearch} isLoading={isLoading} />
            
            {/* Search Results */}
            {species.length > 0 && (
              <ResultsPanel 
                species={species}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                searchInfo={searchInfo}
                onSelectAll={() => setSelectedIds(species.map(sp => sp.id || sp.scientific_name))}
                onDeselectAll={() => setSelectedIds([])}
                onDownload={() => setShowDownload(true)}
                onCompare={() => setShowCompare(true)}
                onManageLists={() => setShowListManager(true)}
                onAddNote={(sp) => { setNoteSpecies(sp); setShowNotes(true); }}
                onSaveSearch={() => setShowSaveSearch(true)}
                onEnrichWithINaturalist={enrichWithINaturalist}
                onDelete={handleDeleteSpecies}
              />
            )}

            {/* Info Banner when no results */}
            {!species.length && !isLoading && !error && (
              <div className="space-y-4">
                <Alert className="bg-bangor-red/5 border-bangor-red/20">
                  <Info className="h-4 w-4 text-bangor-red" />
                  <AlertTitle className="text-bangor-red">How It Works</AlertTitle>
                  <AlertDescription className="text-slate-700 space-y-2">
                    <p>DataWinder is a species distribution modelling toolkit built for ecological research. Use the workflow below to build, analyse, and model species data:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                       <li><span className="font-semibold">Search Multi-Source</span> — Query IUCN Red List, iNaturalist, GBIF, and SpeciesLink simultaneously by species, genus, family, order, or class.</li>
                       <li><span className="font-semibold">Aggregate & Enrich</span> — Automatically merge conservation status (IUCN), citizen observations (iNaturalist), specimen records (GBIF), museum collections (SpeciesLink), and geographic ranges into unified species records.</li>
                       <li><span className="font-semibold">Smart Import</span> — Upload any file type (CSV, Excel, GeoJSON, Shapefile, KML, TIF, ZIP). AI detects the content and routes tabular data to database or geospatial files to archives for spatial analysis.</li>
                       <li><span className="font-semibold">Review & Prepare</span> — Select, compare, map occurrences, flag outliers, organize into projects, add research notes, and export prepared datasets.</li>
                       <li><span className="font-semibold">Model & Analyze</span> — Run MAXENT species distribution models with curated occurrence data and climate scenarios. Interpret results, compare projections, and assess conservation threats.</li>
                     </ol>
                   </AlertDescription>
                </Alert>

                <div className="p-4 bg-gradient-to-r from-bangor-red/5 to-slate-50 rounded-lg border border-bangor-red/20 text-xs text-slate-600 space-y-3">
                   <div>
                     <p className="mb-1 font-semibold text-slate-700">Integrated Data Sources</p>
                     <ul className="space-y-1">
                       <li className="italic">• <strong>IUCN Red List</strong> — Conservation status, population trends, threats, habitats, assessments</li>
                       <li className="italic">• <strong>iNaturalist</strong> — Citizen-contributed observations, photos, occurrences with coordinates</li>
                       <li className="italic">• <strong>GBIF</strong> — Specimen records, museum/herbarium databases, research occurrences</li>
                       <li className="italic">• <strong>SpeciesLink</strong> — Brazilian & Latin American museum collections, herbarium specimens</li>
                       <li className="italic">• <strong>User Files</strong> — CSV, Excel, GeoJSON, Shapefiles, KML, TIF, ZIP archives (auto-routed)</li>
                     </ul>
                   </div>
                   <div className="pt-3 border-t border-bangor-red/10">
                     <p className="text-xs text-slate-500 mb-2 font-medium">Technology Partners:</p>
                     <DataSourceBadges size="xs" />
                   </div>
                 </div>

                <div className="p-4 bg-gradient-to-r from-bangor-red/5 to-slate-50 rounded-lg border border-bangor-red/10 flex items-start gap-3">
                  <Leaf className="w-4 h-4 text-bangor-red mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 italic">
                    Built by conservation researchers for conservation researchers. Supporting biodiversity science worldwide.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-6 shadow-sm">
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
              </div>
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
                  {searchInfo?.includeSpeciesLink && <p>• Fetching from speciesLink</p>}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right: Database Panel */}
          <DatabasePanel 
            allSpecies={allSpecies}
            savedSearches={savedSearches}
            onLoadSpecies={(filtered, label) => {
              setSpecies(filtered);
              setSelectedIds(filtered.map(sp => sp.id || sp.scientific_name));
              setSearchInfo(label ? { level: 'database', terms: label } : null);
              if (filtered.length === 0) {
                toast.warning('No species found matching that saved search in the database.');
              } else {
                toast.success(`Loaded ${filtered.length} species`);
              }
            }}
            onRefetch={refetchSpecies}
          />
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