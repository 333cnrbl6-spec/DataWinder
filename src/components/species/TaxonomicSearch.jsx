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
  const [iucnToken, setIucnToken] = useState('');
  const [showIucnInput, setShowIucnInput] = useState(false);
  const [inatUsername, setInatUsername] = useState('');
  const [inatPassword, setInatPassword] = useState('');
  const [showInatInput, setShowInatInput] = useState(false);

  React.useEffect(() => {
    const loadCredentials = async () => {
      try {
        const user = await base44.auth.me();
        if (user.iucn_api_token) {
          setIucnToken(user.iucn_api_token);
        }
        if (user.inat_username) {
          setInatUsername(user.inat_username);
        }
        if (user.inat_password) {
          setInatPassword(user.inat_password);
        }
      } catch (e) {
        // Not logged in or no credentials
      }
    };
    loadCredentials();
  }, []);

  const autoFetchIucnCredentials = async () => {
    try {
      // Attempt to auto-fetch token from IUCN credential system
      const response = await fetch('https://apiv3.iucnredlist.org/api/v3/token/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          setIucnToken(data.token);
          await base44.auth.updateMe({ iucn_api_token: data.token });
          setShowIucnInput(false);
        }
      }
    } catch (err) {
      console.error('Auto-fetch failed:', err);
      alert('Could not automatically fetch token. Please add manually.');
    }
  };

  const saveIucnToken = async () => {
    if (iucnToken.trim()) {
      await base44.auth.updateMe({ iucn_api_token: iucnToken.trim() });
      setShowIucnInput(false);
    }
  };

  const saveInatCredentials = async () => {
    if (inatUsername.trim()) {
      await base44.auth.updateMe({ 
        inat_username: inatUsername.trim(),
        inat_password: inatPassword.trim()
      });
      setShowInatInput(false);
    }
  };

  const handleSearch = () => {
    const validTerms = searchTerms.filter(t => t.trim());
    if (validTerms.length > 0) {
      onSearch({ 
        level, 
        terms: validTerms, 
        iucnToken,
        inatUsername,
        inatPassword
      });
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
        <h2 className="text-lg font-semibold text-slate-900">Search Multiple Data Sources</h2>
      </div>
      
      <p className="text-sm text-slate-500 mb-4">
        Search for species by taxonomic group. Data will be fetched from IUCN Red List and iNaturalist.
      </p>

      {/* IUCN Credentials */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-700 mb-2">IUCN Red List API</h3>
        {!iucnToken ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-900 mb-1">API Token Required</h4>
                <p className="text-xs text-amber-700 mb-3">
                  Get your free API token from the IUCN Red List website.
                </p>
                {!showIucnInput ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={autoFetchIucnCredentials}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Auto-Fetch Credentials
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowIucnInput(true)}
                      className="text-xs"
                    >
                      <Key className="w-3 h-3 mr-1" />
                      Add Manually
                    </Button>
                    <a
                      href="https://apiv3.iucnredlist.org/"
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
                      value={iucnToken}
                      onChange={(e) => setIucnToken(e.target.value)}
                      placeholder="Paste your IUCN API token"
                      className="text-xs h-8"
                    />
                    <Button size="sm" onClick={saveIucnToken} className="text-xs h-8">
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
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-emerald-700">IUCN token configured</span>
            </div>
            <button
              onClick={() => setShowIucnInput(true)}
              className="text-xs text-emerald-600 hover:underline"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* iNaturalist Credentials */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-700 mb-2">iNaturalist</h3>
        {!inatUsername ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Account Credentials (Optional)</h4>
                <p className="text-xs text-blue-700 mb-3">
                  Add your iNaturalist credentials to access observation data.
                </p>
                {!showInatInput ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowInatInput(true)}
                      className="text-xs"
                    >
                      <Key className="w-3 h-3 mr-1" />
                      Add Credentials
                    </Button>
                    <a
                      href="https://www.inaturalist.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-md border border-blue-300 bg-white hover:bg-blue-50 inline-flex items-center gap-1 transition-colors"
                    >
                      Sign Up <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={inatUsername}
                      onChange={(e) => setInatUsername(e.target.value)}
                      placeholder="Username"
                      className="text-xs h-8"
                    />
                    <Input
                      type="password"
                      value={inatPassword}
                      onChange={(e) => setInatPassword(e.target.value)}
                      placeholder="Password"
                      className="text-xs h-8"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveInatCredentials} className="text-xs h-8">
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setShowInatInput(false)}
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
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-700">iNaturalist: {inatUsername}</span>
            </div>
            <button
              onClick={() => setShowInatInput(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              Change
            </button>
          </div>
        )}
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
          disabled={isLoading || !searchTerms.some(t => t.trim()) || !iucnToken}
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