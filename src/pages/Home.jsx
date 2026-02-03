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

  const handleSearch = async ({ level, term }) => {
    setIsLoading(true);
    setError(null);
    setSpecies([]);
    setSelectedIds([]);
    setSearchInfo({ level, term });

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the IUCN Red List for species data. I need information about all species in the ${level}: "${term}".

For EACH individual species in this ${level}, provide the following data:
- scientific_name (required, e.g., "Callithrix aurita")
- common_name (if available)
- iucn_status (one of: LC, NT, VU, EN, CR, EW, EX, DD, NE)
- population_trend (one of: increasing, stable, decreasing, unknown)
- kingdom
- phylum
- class_name (taxonomic class)
- order_name (taxonomic order)
- family
- genus
- habitat (brief description)
- range_description (geographic range)
- threats (main threats, brief)
- conservation_actions (current actions, brief)
- iucn_id (numeric IUCN species ID if known)

IMPORTANT: Return data for EACH species separately - do NOT aggregate or pool the data. Each species should be its own object in the array.

Return a JSON array with data for each species. If searching for a single species, still return an array with one object.
Include as many species as you can find for the given ${level}.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            species: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  scientific_name: { type: "string" },
                  common_name: { type: "string" },
                  iucn_status: { type: "string" },
                  population_trend: { type: "string" },
                  kingdom: { type: "string" },
                  phylum: { type: "string" },
                  class_name: { type: "string" },
                  order_name: { type: "string" },
                  family: { type: "string" },
                  genus: { type: "string" },
                  habitat: { type: "string" },
                  range_description: { type: "string" },
                  threats: { type: "string" },
                  conservation_actions: { type: "string" },
                  iucn_id: { type: "number" }
                },
                required: ["scientific_name"]
              }
            }
          }
        }
      });

      if (result?.species && result.species.length > 0) {
        // Add unique IDs to each species
        const speciesWithIds = result.species.map((sp, idx) => ({
          ...sp,
          id: `${sp.scientific_name.replace(/\s+/g, '_')}_${idx}`
        }));
        setSpecies(speciesWithIds);
      } else {
        setError('No species found for the given search. Try a different taxonomic group.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch species data. Please try again.');
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
                Search for a taxonomic group (family, genus, order, etc.) to retrieve IUCN Red List data for all species within that group. 
                Each species is listed separately—you can select specific species to download their data individually.
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