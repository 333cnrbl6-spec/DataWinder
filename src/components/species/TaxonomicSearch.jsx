import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const taxonomyLevels = [
  { value: 'species', label: 'Species', placeholder: 'e.g., Callithrix aurita' },
  { value: 'genus', label: 'Genus', placeholder: 'e.g., Callithrix' },
  { value: 'family', label: 'Family', placeholder: 'e.g., Callitrichidae' },
  { value: 'order', label: 'Order', placeholder: 'e.g., Primates' },
  { value: 'class', label: 'Class', placeholder: 'e.g., Mammalia' }
];

export default function TaxonomicSearch({ onSearch, isLoading }) {
  const [level, setLevel] = useState('family');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    if (searchTerm.trim()) {
      onSearch({ level, term: searchTerm.trim() });
    }
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
      
      <p className="text-sm text-slate-500 mb-6">
        Search for species by taxonomic group. Data will be fetched individually for each species within the selected group.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-full sm:w-40">
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

        <div className="flex-1 relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={currentLevel?.placeholder}
            className="pr-10"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        <Button 
          onClick={handleSearch}
          disabled={isLoading || !searchTerm.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            'Search'
          )}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-xs text-slate-400">Quick examples:</span>
        {['Callitrichidae', 'Felidae', 'Psittacidae', 'Ursidae'].map(example => (
          <button
            key={example}
            onClick={() => {
              setLevel('family');
              setSearchTerm(example);
            }}
            className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
          >
            {example}
          </button>
        ))}
      </div>
    </motion.div>
  );
}