import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Sparkles, Key, ExternalLink, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

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
  const [apiToken, setApiToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  React.useEffect(() => {
    const loadToken = async () => {
      try {
        const user = await base44.auth.me();
        if (user.iucn_api_token) {
          setApiToken(user.iucn_api_token);
        }
      } catch (e) {
        // Not logged in or no token
      }
    };
    loadToken();
  }, []);

  const saveToken = async () => {
    if (apiToken.trim()) {
      await base44.auth.updateMe({ iucn_api_token: apiToken.trim() });
      setShowTokenInput(false);
    }
  };

  const handleSearch = () => {
    const validTerms = searchTerms.filter(t => t.trim());
    if (validTerms.length > 0) {
      onSearch({ level, terms: validTerms, apiToken });
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

  const updateSearchTerm = (index, value) => {
    const newTerms = [...searchTerms];
    newTerms[index] = value;
    setSearchTerms(newTerms);
  };

  const currentLevel = taxonomyLevels.find(t => t.value === level);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-emerald-500" />
        <h2 className="text-lg font-semibold text-slate-900">Search IUCN Species Data</h2>
      </div>
      
      <p className="text-sm text-slate-500 mb-4">
        Search for species by taxonomic group. Data will be fetched from the IUCN Red List API and saved individually for each species.
      </p>

      {!apiToken ? (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-900 mb-1">IUCN API Token Required</h4>
              <p className="text-xs text-amber-700 mb-3">
                Get your free API token from the IUCN Red List website to access species data.
              </p>
              {!showTokenInput ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTokenInput(true)}
                    className="text-xs"
                  >
                    <Key className="w-3 h-3 mr-1" />
                    Add Token
                  </Button>
                  <a
                    href="https://apiv3.iucnredlist.org/api/v3/token"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-md border border-amber-300 bg-white hover:bg-amber-50 inline-flex items-center gap-1 transition-colors"
                  >
                    Get Token <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="Paste your IUCN API token"
                    className="text-xs h-8"
                  />
                  <Button size="sm" onClick={saveToken} className="text-xs h-8">
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowTokenInput(false)}
                    className="text-xs h-8"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-emerald-700">API token configured</span>
          </div>
          <button
            onClick={() => setShowTokenInput(true)}
            className="text-xs text-emerald-600 hover:underline"
          >
            Change
          </button>
        </div>
      )}

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
                className="text-slate-400 hover:text-red-600"
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

        <Button 
          onClick={handleSearch}
          disabled={isLoading || !searchTerms.some(t => t.trim()) || !apiToken}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching {searchTerms.filter(t => t.trim()).length} {currentLevel?.label}...
            </>
          ) : (
            <>
              Search {searchTerms.filter(t => t.trim()).length} {currentLevel?.label}
            </>
          )}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-xs text-slate-400">Quick load multiple:</span>
        <button
          onClick={() => {
            setLevel('family');
            setSearchTerms(['Callitrichidae', 'Cebidae', 'Atelidae']);
          }}
          className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
        >
          Primate Families
        </button>
        <button
          onClick={() => {
            setLevel('family');
            setSearchTerms(['Felidae', 'Canidae', 'Ursidae']);
          }}
          className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
        >
          Carnivore Families
        </button>
      </div>
    </motion.div>
  );
}