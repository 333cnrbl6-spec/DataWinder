import React, { useState, useEffect } from 'react';
import { useSearchSounds } from '@/hooks/useSearchSounds';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Info, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchIUCNSpecies } from '@/hooks/useIUCNSearch';
import { createCommunityMember, completeOnboarding } from '@/lib/onboardingValidator';
import {
  enrichWithINaturalist,
  enrichWithGBIF,
  enrichWithSpeciesLink,
  persistNonIUCNSpecies,
  enrichSingleSpeciesWithINat,
} from '@/hooks/useDataSources';
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

  // Derive saved scientific names from the already-loaded allSpecies — no second fetch
  const savedSpeciesScientificNamesSet = new Set(allSpecies.map(sp => sp.scientific_name));

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = base44.entities.Species.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['allSpecies'] });
    });
    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const user = await base44.auth.me();
        if (!user || !user.email) {
          base44.auth.redirectToLogin(window.location.pathname);
          return;
        }
        setOnboardingChecked(!user.onboarding_completed);
        if (!user.onboarding_completed) setShowOnboarding(true);
      } catch (err) {
        console.error('Auth check failed:', err);
        base44.auth.redirectToLogin(window.location.pathname);
      }
    };
    checkOnboarding();
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
    if (!searchParams || !searchParams.terms || searchParams.terms.length === 0) {
      setError('Please enter at least one search term.');
      return;
    }

    if (!onboardingChecked) {
      setShowOnboarding(true);
      return;
    }

    const { level, terms, iucnToken, includeINaturalist = false, includeGBIF = false, includeSpeciesLink = false, speciesLinkApiKey = '' } = searchParams;

    setIsLoading(true);
    setError(null);
    setSpecies([]);
    setSelectedIds([]);
    startTicking(4000);
    setSearchInfo({ level, terms: terms.join(', '), includeINaturalist, includeGBIF, includeSpeciesLink, iucnToken: !!iucnToken });

    try {
      let allSpeciesMap = {};
      
      // IUCN is mandatory for search
      try {
        allSpeciesMap = await fetchIUCNSpecies(terms, level, false, iucnToken);
      } catch (err) {
        const errorMsg = err?.message || 'Failed to fetch IUCN Red List data. Please check your API key or try again.';
        setError(errorMsg);
        stopTicking();
        playError();
        return;
      }

      // Optional enrichment sources
      try {
        if (includeINaturalist) await enrichWithINaturalist(null, level, terms, allSpeciesMap);
      } catch (err) {
        console.warn('iNaturalist enrichment partial failure:', err);
        toast.warning('iNaturalist data partially unavailable');
      }

      try {
        if (includeGBIF) await enrichWithGBIF(level, terms, allSpeciesMap);
      } catch (err) {
        console.warn('GBIF enrichment partial failure:', err);
        toast.warning('GBIF data partially unavailable');
      }

      try {
        if (includeSpeciesLink && speciesLinkApiKey) await enrichWithSpeciesLink(speciesLinkApiKey, terms, allSpeciesMap);
      } catch (err) {
        console.warn('SpeciesLink enrichment partial failure:', err);
        toast.warning('SpeciesLink data partially unavailable');
      }

      // Persist new species
      try {
        await persistNonIUCNSpecies(allSpeciesMap);
      } catch (err) {
        console.warn('Species persistence partial failure:', err);
      }

      const allSpecies = Object.values(allSpeciesMap);

      if (!allSpecies || allSpecies.length === 0) {
        setError(`No species found matching "${terms.join(', ')}" at the ${level} level.`);
        stopTicking();
        playError();
        return;
      }

      setSpecies(allSpecies.map(sp => ({
        ...sp,
        is_new: !savedSpeciesScientificNamesSet.has(sp.scientific_name),
      })));
      stopTicking();
      playSuccess();
      toast.success(`Found ${allSpecies.length} species`);
    } catch (err) {
      console.error('Search error:', err);
      stopTicking();
      playError();
      setError('Search failed. Please check your connection and try again.');
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
    if (!sp || !sp.scientific_name) return;

    setSpecies(prev => prev.filter(s => (s.id || s.scientific_name) !== (sp.id || sp.scientific_name)));
    setSelectedIds(prev => prev.filter(id => id !== (sp.id || sp.scientific_name)));

    if (sp.id) {
      try {
        await base44.entities.Species.delete(sp.id);
        toast.success(`Deleted ${sp.scientific_name}`);
      } catch (err) {
        console.error('Delete failed:', err);
        toast.error(`Failed to delete ${sp.scientific_name}`);
        // Refetch to restore state
        refetchSpecies();
      }
    } else {
      toast.success(`Removed ${sp.scientific_name} from results`);
    }
  };

  const handleEnrichWithINaturalist = async (species) => {
    if (!species || !species.scientific_name) return;

    setIsLoading(true);
    setError(null);
    try {
      const updateData = await enrichSingleSpeciesWithINat(species);
      if (!updateData || Object.keys(updateData).length === 0) {
        toast.warning(`No additional iNaturalist data found for ${species.scientific_name}`);
        return;
      }

      const existing = await base44.entities.Species.filter({ scientific_name: species.scientific_name });
      
      if (existing.length > 0) {
        await base44.entities.Species.update(existing[0].id, updateData);
        setSpecies(prev => prev.map(sp =>
          sp.scientific_name === species.scientific_name ? { ...sp, ...updateData, id: existing[0].id } : sp
        ));
        toast.success(`${species.scientific_name} enriched with iNaturalist data`);
      } else {
        const created = await base44.entities.Species.create({
          scientific_name: species.scientific_name,
          common_name: species.common_name,
          iucn_status: species.iucn_status,
          ...updateData,
        });
        setSpecies(prev => prev.map(sp =>
          sp.scientific_name === species.scientific_name ? { ...sp, ...updateData, id: created.id } : sp
        ));
        toast.success(`${species.scientific_name} created with iNaturalist data`);
      }
    } catch (err) {
      console.error('Error enriching with iNaturalist:', err);
      toast.error(`Failed to enrich ${species.scientific_name}. Please try again.`);
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
                onEnrichWithINaturalist={handleEnrichWithINaturalist}
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