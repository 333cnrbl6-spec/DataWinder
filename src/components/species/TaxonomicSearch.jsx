import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Sparkles, Key, ExternalLink, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import StatusBadge from './StatusBadge';

const taxonomyLevels = [
  { value: 'species', label: 'Species', placeholder: 'e.g., Callithrix aurita' },
  { value: 'genus', label: 'Genus', placeholder: 'e.g., Callithrix' },
  { value: 'family', label: 'Family', placeholder: 'e.g., Callitrichidae' },
  { value: 'order', label: 'Order', placeholder: 'e.g., Primates' },
  { value: 'class', label: 'Class', placeholder: 'e.g., Mammalia' }
];

export default function TaxonomicSearch({ onSearch, isLoading }) {
  const [level, setLevel] = useState('family');
  const [searchTerms, setSearchTerms] = useState(['']);
  const [iucnToken, setIucnToken] = useState('');
  const [showIucnInput, setShowIucnInput] = useState(false);
  const [familySpecies, setFamilySpecies] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState([]);
  const [loadingSpecies, setLoadingSpecies] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [includeINat, setIncludeINat] = useState(true);
  const [includeGBIF, setIncludeGBIF] = useState(true);
  const [includeSpeciesLink, setIncludeSpeciesLink] = useState(false);
  const [speciesLinkApiKey, setSpeciesLinkApiKey] = useState('');
  const [showSpeciesLinkInput, setShowSpeciesLinkInput] = useState(false);

  React.useEffect(() => {
    const loadCredentials = async () => {
      try {
        const user = await base44.auth.me();
        if (user.iucn_api_token) setIucnToken(user.iucn_api_token);
        if (user.specieslink_api_key) {
          setSpeciesLinkApiKey(user.specieslink_api_key);
          setIncludeSpeciesLink(true);
        }
      } catch (e) {
        // Not logged in or no credentials
      }
    };
    loadCredentials();
  }, []);

  const saveSpeciesLinkKey = async () => {
    if (speciesLinkApiKey.trim()) {
      await base44.auth.updateMe({ specieslink_api_key: speciesLinkApiKey.trim() });
      setShowSpeciesLinkInput(false);
      setIncludeSpeciesLink(true);
    }
  };

  const saveIucnToken = async () => {
    if (iucnToken.trim()) {
      await base44.auth.updateMe({ iucn_api_token: iucnToken.trim() });
      setShowIucnInput(false);
    }
  };

  const handleSearch = () => {
    setShowConfirmDialog(true);
  };

  const confirmSearch = () => {
    setShowConfirmDialog(false);
    // If not species level with selected species, search those specific species
    if (level !== 'species' && selectedSpecies.length > 0) {
      onSearch({ 
        level: 'species', 
        terms: selectedSpecies, 
        iucnToken,
        includeINaturalist: includeINat
      });
    } else {
      const validTerms = searchTerms.filter(t => t.trim());
      if (validTerms.length > 0) {
        onSearch({ 
          level, 
          terms: validTerms, 
          iucnToken,
          includeINaturalist: includeINat
        });
      }
    }
  };

  const addSearchTerm = () => {
    setSearchTerms([...searchTerms, '']);
  };

  const removeSearchTerm = (index) => {
    if (searchTerms.length > 1) {
      setSearchTerms(searchTerms.filter((_, i) => i !== index));
    }
  };

  const updateSearchTerm = async (index, value) => {
    const newTerms = [...searchTerms];
    newTerms[index] = value;
    setSearchTerms(newTerms);

    // If not species level and term entered, fetch species list
    if (level !== 'species' && value.trim() && iucnToken) {
      setLoadingSpecies(true);
      setFamilySpecies([]);
      setSelectedSpecies([]);
      try {
        const result = await base44.functions.fetchIUCNData({
          level: level,
          term: value.trim(),
          endpoint: 'taxa',
          iucnToken: iucnToken
        });

        if (result.status === 'success' && result.data?.result && result.data.result.length > 0) {
          setFamilySpecies(result.data.result);
        }
      } catch (err) {
        console.error('Error fetching species:', err);
      }
      setLoadingSpecies(false);
    } else if (level === 'species') {
      setFamilySpecies([]);
      setSelectedSpecies([]);
    }
  };

  const toggleSpecies = (scientificName) => {
    setSelectedSpecies(prev => 
      prev.includes(scientificName) 
        ? prev.filter(s => s !== scientificName)
        : [...prev, scientificName]
    );
  };

  const selectAllSpecies = () => {
    setSelectedSpecies(familySpecies.map(sp => sp.scientific_name));
  };

  const deselectAllSpecies = () => {
    setSelectedSpecies([]);
  };

  const currentLevel = taxonomyLevels.find(t => t.value === level);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-bangor-red" />
        <h2 className="text-lg font-semibold text-slate-900">Search Multiple Data Sources</h2>
      </div>
      
      <p className="text-sm text-slate-500 mb-4">
        Search for species by taxonomic group. Data will be fetched from IUCN Red List and iNaturalist.
      </p>

      {/* IUCN Credentials */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-700 mb-2">IUCN Red List API</h3>
        {!iucnToken ? (
          <div className="p-4 bg-bangor-sun/10 border border-bangor-sun/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-bangor-sun mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-bangor-sun mb-1">API Token Required</h4>
                <p className="text-xs text-bangor-sun/80 mb-3">
                  To access IUCN data, you need a free API token. Sign up or log in to get yours.
                </p>
                {!showIucnInput ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href="https://www.iucnredlist.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-md bg-bangor-red text-white inline-flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Sign Up (Free)
                      </a>
                      <button
                        onClick={() => setShowIucnInput(true)}
                        className="text-xs px-3 py-1.5 rounded-md border border-bangor-sun/30 bg-bangor-sun/10 text-bangor-sun inline-flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Log In & Get Token
                      </button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowIucnInput(true)}
                      className="text-xs w-full"
                    >
                      <Key className="w-3 h-3 mr-1" />
                      I Have My Token - Add It Now
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-bangor-sun/80 mb-2">
                       After logging in, find your token on your account page and paste it below:
                    </p>
                    <div className="flex gap-2">
                      <Input
                        id="iucn-api-token"
                        name="iucn-api-token"
                        value={iucnToken}
                        onChange={(e) => setIucnToken(e.target.value)}
                        placeholder="Paste your IUCN API token here"
                        className="text-xs h-8"
                      />
                      <Button size="sm" onClick={saveIucnToken} className="text-xs h-8 bg-bangor-red text-white font-medium rounded-md">
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setShowIucnInput(false)}
                        className="text-xs h-8"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-bangor-sun/10 border border-bangor-sun/30 rounded-lg flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Key className="w-4 h-4 text-bangor-sun" />
               <span className="text-xs text-bangor-sun font-medium">IUCN Token Configured</span>
             </div>
             <button
               onClick={() => setShowIucnInput(true)}
               className="text-xs text-bangor-sun underline font-medium"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* iNaturalist */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-700 mb-2">iNaturalist</h3>
        <div className="p-3 bg-bangor-sun/10 border border-bangor-sun/30 rounded-lg flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-bangor-sun" />
          <span className="text-xs text-bangor-sun font-medium">Public API - No Credentials Required</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taxonomyLevels.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-500">to search for:</span>
        </div>

        {searchTerms.map((term, index) => (
          <div key={index} className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                id={`search-term-${index}`}
                name={`search-term-${index}`}
                value={term}
                onChange={(e) => updateSearchTerm(index, e.target.value)}
                placeholder={currentLevel?.placeholder}
                className="pr-10"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            {searchTerms.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSearchTerm(index)}
                className="text-red-600"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addSearchTerm}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Another {currentLevel?.label}
          </Button>
        </div>

        {/* Species Selection for non-species levels */}
        {level !== 'species' && familySpecies.length > 0 && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-700">
                {familySpecies.length} species found in {currentLevel?.label} "{searchTerms[0]}"
              </h4>
              <div className="flex gap-2">
                <button 
                  onClick={selectAllSpecies}
                  className="text-xs text-bangor-red underline font-medium"
                  >
                   Select All
                </button>
                <span className="text-slate-300">|</span>
                <button 
                  onClick={deselectAllSpecies}
                  className="text-xs text-slate-500 underline font-medium"
                  >
                   Deselect All
                </button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {familySpecies.map((sp) => (
                <label 
                  key={sp.taxonid}
                  className="flex items-start gap-2 p-2 bg-white rounded cursor-pointer"
                >
                  <input
                    id={`species-${sp.taxonid}`}
                    name={`species-${sp.taxonid}`}
                    type="checkbox"
                    checked={selectedSpecies.includes(sp.scientific_name)}
                    onChange={() => toggleSpecies(sp.scientific_name)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{sp.scientific_name}</div>
                    {sp.main_common_name && (
                      <div className="text-xs text-slate-500">{sp.main_common_name}</div>
                    )}
                  </div>
                  <StatusBadge status={sp.category} size="sm" />
                </label>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              {selectedSpecies.length} species selected
            </div>
          </div>
        )}

        {loadingSpecies && (
          <div className="flex items-center justify-center py-4 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading species list...
          </div>
        )}

        <Button 
          onClick={handleSearch}
          disabled={isLoading || (level !== 'species' && selectedSpecies.length === 0 && familySpecies.length > 0) || (!searchTerms.some(t => t.trim()) && selectedSpecies.length === 0)}
          className="w-full bg-bangor-red text-white font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Fetching data...
            </>
          ) : (
            <>
              Search {level !== 'species' && selectedSpecies.length > 0 ? selectedSpecies.length : searchTerms.filter(t => t.trim()).length} {level !== 'species' && selectedSpecies.length > 0 ? 'species' : currentLevel?.label}
            </>
          )}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowConfirmDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Add Species to Dataset?</h3>
            <p className="text-sm text-slate-600 mb-4">
              You're about to fetch data for {level !== 'species' && selectedSpecies.length > 0 ? selectedSpecies.length : searchTerms.filter(t => t.trim()).length} {level !== 'species' && selectedSpecies.length > 0 ? 'species' : currentLevel?.label}. 
              This will download comprehensive data from IUCN Red List{includeINat ? ' and iNaturalist' : ''}.
            </p>
            
            <label className="flex items-center gap-2 mb-4 p-3 bg-bangor-sun/10 rounded-lg cursor-pointer border border-bangor-sun/20">
               <input
                 id="include-inat"
                 name="include-inat"
                 type="checkbox"
                 checked={includeINat}
                 onChange={(e) => setIncludeINat(e.target.checked)}
                 className="w-4 h-4"
               />
               <span className="text-sm text-slate-700 font-medium">Also Include iNaturalist Observation Data</span>
             </label>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmSearch}
                className="flex-1 bg-bangor-red text-white font-semibold"
              >
                Fetch Data
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-xs text-slate-400">Quick load multiple:</span>

        {/* Primates */}
        <button
          onClick={() => {
            setLevel('family');
            setSearchTerms(['Callitrichidae', 'Cebidae', 'Atelidae', 'Cercopithecidae', 'Hominoidea']);
            setFamilySpecies([]);
            setSelectedSpecies([]);
            setTimeout(handleSearch, 0);
          }}
          className="text-xs px-2 py-1 rounded-full bg-bangor-sun/20 text-bangor-sun font-medium hover:bg-bangor-sun/30"
        >
          Primates
        </button>

        {/* Carnivores */}
        <button
          onClick={() => {
            setLevel('family');
            setSearchTerms(['Felidae', 'Canidae', 'Ursidae', 'Mustelidae', 'Phocidae']);
            setFamilySpecies([]);
            setSelectedSpecies([]);
            setTimeout(handleSearch, 0);
          }}
          className="text-xs px-2 py-1 rounded-full bg-bangor-sun/20 text-bangor-sun font-medium hover:bg-bangor-sun/30"
        >
          Carnivores
        </button>

        {/* Marine Mammals */}
        <button
          onClick={() => {
            setLevel('family');
            setSearchTerms(['Cetaceae', 'Sirenia', 'Odobenidae']);
            setFamilySpecies([]);
            setSelectedSpecies([]);
            setTimeout(handleSearch, 0);
          }}
          className="text-xs px-2 py-1 rounded-full bg-bangor-sun/20 text-bangor-sun font-medium hover:bg-bangor-sun/30"
        >
          Marine Mammals
        </button>

        {/* Birds of Prey */}
        <button
          onClick={() => {
            setLevel('family');
            setSearchTerms(['Accipitridae', 'Falconidae', 'Strigidae']);
            setFamilySpecies([]);
            setSelectedSpecies([]);
            setTimeout(handleSearch, 0);
          }}
          className="text-xs px-2 py-1 rounded-full bg-bangor-sun/20 text-bangor-sun font-medium hover:bg-bangor-sun/30"
        >
          Birds of Prey
        </button>

        {/* Reptiles */}
        <button
          onClick={() => {
            setLevel('family');
            setSearchTerms(['Colubridae', 'Pythonidae', 'Boidae', 'Chelonidae', 'Crocodylidae']);
            setFamilySpecies([]);
            setSelectedSpecies([]);
            setTimeout(handleSearch, 0);
          }}
          className="text-xs px-2 py-1 rounded-full bg-bangor-sun/20 text-bangor-sun font-medium hover:bg-bangor-sun/30"
        >
          Reptiles
        </button>

        {/* Amphibians */}
        <button
          onClick={() => {
            setLevel('family');
            setSearchTerms(['Bufonidae', 'Ranidae', 'Salamandridae']);
            setFamilySpecies([]);
            setSelectedSpecies([]);
            setTimeout(handleSearch, 0);
          }}
          className="text-xs px-2 py-1 rounded-full bg-bangor-sun/20 text-bangor-sun font-medium hover:bg-bangor-sun/30"
        >
          Amphibians
        </button>

        {/* Fish */}
        <button
          onClick={() => {
            setLevel('family');
            setSearchTerms(['Salmonidae', 'Cichlidae', 'Serranidae']);
            setFamilySpecies([]);
            setSelectedSpecies([]);
            setTimeout(handleSearch, 0);
          }}
          className="text-xs px-2 py-1 rounded-full bg-bangor-sun/20 text-bangor-sun font-medium hover:bg-bangor-sun/30"
        >
          Fish
        </button>

        {/* Invertebrates */}
        <button
          onClick={() => {
            setLevel('family');
            setSearchTerms(['Hominidae', 'Drosophilidae', 'Apidae']);
            setFamilySpecies([]);
            setSelectedSpecies([]);
            setTimeout(handleSearch, 0);
          }}
          className="text-xs px-2 py-1 rounded-full bg-bangor-sun/20 text-bangor-sun font-medium hover:bg-bangor-sun/30"
        >
          Insects
        </button>
      </div>
    </motion.div>
  );
}