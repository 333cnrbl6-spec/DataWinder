import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Leaf, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from 'framer-motion';
import TaxonomicSearch from '@/components/species/TaxonomicSearch';
import SpeciesGrid from '@/components/species/SpeciesGrid';
import SelectionBar from '@/components/species/SelectionBar';
import DownloadPanel from '@/components/species/DownloadPanel';
import StatusBadge, { statusConfig } from '@/components/species/StatusBadge';

export default function Home() {
  const [species, setSpecies] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDownload, setShowDownload] = useState(false);
  const [searchInfo, setSearchInfo] = useState(null);

  const handleSearch = async ({ level, term, apiToken }) => {
    setIsLoading(true);
    setError(null);
    setSpecies([]);
    setSelectedIds([]);
    setSearchInfo({ level, term });

    try {
      // First, search for species by the taxonomic level
      const searchUrl = `https://apiv3.iucnredlist.org/api/v3/species/${level}/${encodeURIComponent(term)}?token=${apiToken}`;
      const searchResponse = await fetch(searchUrl);
      
      if (!searchResponse.ok) {
        throw new Error(`IUCN API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      if (!searchData.result || searchData.result.length === 0) {
        setError('No species found for the given search. Check the spelling and try again.');
        return;
      }

      // For each species, fetch detailed information
      const detailedSpecies = await Promise.all(
        searchData.result.map(async (sp) => {
          try {
            // Fetch narrative data (habitat, threats, etc.)
            const narrativeUrl = `https://apiv3.iucnredlist.org/api/v3/species/narrative/${sp.taxonid}?token=${apiToken}`;
            const narrativeRes = await fetch(narrativeUrl);
            const narrativeData = narrativeRes.ok ? await narrativeRes.json() : null;
            const narrative = narrativeData?.result?.[0] || {};

            return {
              id: `${sp.taxonid}`,
              scientific_name: sp.scientific_name,
              common_name: sp.main_common_name || '',
              iucn_status: sp.category || 'NE',
              population_trend: narrative.populationtrend?.toLowerCase() || 'unknown',
              kingdom: sp.kingdom || '',
              phylum: sp.phylum || '',
              class_name: sp.class || '',
              order_name: sp.order || '',
              family: sp.family || '',
              genus: sp.genus || '',
              habitat: narrative.habitat || '',
              range_description: narrative.range || '',
              threats: narrative.threats || '',
              conservation_actions: narrative.conservationmeasures || '',
              assessment_date: sp.published_year ? `${sp.published_year}-01-01` : null,
              iucn_id: sp.taxonid
            };
          } catch (err) {
            console.error(`Error fetching details for ${sp.scientific_name}:`, err);
            // Return basic data if detailed fetch fails
            return {
              id: `${sp.taxonid}`,
              scientific_name: sp.scientific_name,
              common_name: sp.main_common_name || '',
              iucn_status: sp.category || 'NE',
              kingdom: sp.kingdom || '',
              phylum: sp.phylum || '',
              class_name: sp.class || '',
              order_name: sp.order || '',
              family: sp.family || '',
              genus: sp.genus || '',
              iucn_id: sp.taxonid
            };
          }
        })
      );

      setSpecies(detailedSpecies);
    } catch (err) {
      console.error('Search error:', err);
      if (err.message.includes('401')) {
        setError('Invalid API token. Please check your token and try again.');
      } else if (err.message.includes('404')) {
        setError('No data found for this taxonomic group. Try a different search term.');
      } else {
        setError('Failed to fetch data from IUCN API. Please check your connection and try again.');
      }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Leaf className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">IUCN Species Explorer</h1>
              <p className="text-sm text-slate-500">Search and download species conservation data</p>
            </div>
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
            <Alert className="bg-emerald-50 border-emerald-200">
              <Info className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-800">How it works</AlertTitle>
              <AlertDescription className="text-emerald-700">
                This app connects directly to the IUCN Red List API to download species conservation data. 
                Search by taxonomic group (family, genus, order, etc.) to retrieve all species data separately. 
                Select species and download as CSV or JSON files to your computer.
              </AlertDescription>
            </Alert>

            {/* Status Legend */}
            <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">IUCN Red List Categories</h3>
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
            {searchInfo && (
              <div className="text-sm text-slate-500">
                Showing species in <span className="font-medium text-slate-700">{searchInfo.level}</span>: <span className="font-medium text-emerald-600">{searchInfo.term}</span>
              </div>
            )}
            
            <SelectionBar
              totalCount={species.length}
              selectedCount={selectedIds.length}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
              onDownload={() => setShowDownload(true)}
            />
            
            <SpeciesGrid
              species={species}
              selectedIds={selectedIds}
              onSelect={handleSelect}
            />
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-200 rounded-full animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Leaf className="w-6 h-6 text-emerald-500 animate-bounce" />
              </div>
            </div>
            <p className="mt-4 text-slate-600">Searching IUCN database...</p>
            <p className="text-sm text-slate-400">This may take a moment for large taxonomic groups</p>
          </div>
        )}
      </main>

      {/* Download Panel */}
      {showDownload && selectedSpecies.length > 0 && (
        <DownloadPanel
          selectedSpecies={selectedSpecies}
          onClose={() => setShowDownload(false)}
        />
      )}
    </div>
  );
}