import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const TAXONOMY_LEVELS = [
  { value: 'species', label: 'Species' },
  { value: 'genus', label: 'Genus' },
  { value: 'family', label: 'Family' },
  { value: 'order', label: 'Order' },
  { value: 'class', label: 'Class' }
];

export default function TaxonomyLevelSelector({ species = [], onSelectionChange }) {
  const [selectedLevel, setSelectedLevel] = useState('species');
  const [selectedTaxon, setSelectedTaxon] = useState('');

  // Group species by selected taxonomy level
  const groupedByLevel = useMemo(() => {
    if (!species.length) return {};
    
    const groups = {};
    species.forEach(sp => {
      const fieldMap = {
        species: sp.id,
        genus: sp.genus || 'Unknown',
        family: sp.family || 'Unknown',
        order: sp.order_name || 'Unknown',
        class: sp.class_name || 'Unknown'
      };
      
      const taxonKey = fieldMap[selectedLevel];
      if (!groups[taxonKey]) {
        groups[taxonKey] = [];
      }
      groups[taxonKey].push(sp);
    });
    
    return groups;
  }, [species, selectedLevel]);

  // Get unique taxa names for the current level
  const uniqueTaxa = useMemo(() => {
    const taxa = Object.keys(groupedByLevel).sort();
    return selectedLevel === 'species' 
      ? taxa.map(id => {
          const sp = species.find(s => s.id === id);
          return {
            value: id,
            label: `${sp.common_name || sp.scientific_name} (${sp.iucn_status})`
          };
        })
      : taxa.map(taxon => ({
          value: taxon,
          label: `${taxon} (${groupedByLevel[taxon].length} species)`
        }));
  }, [groupedByLevel, selectedLevel, species]);

  const handleTaxonChange = (value) => {
    setSelectedTaxon(value);
    
    // If selecting species, pick the first one; if selecting higher taxon, pick first species in group
    if (selectedLevel === 'species') {
      const sp = species.find(s => s.id === value);
      onSelectionChange(sp);
    } else {
      const speciesInGroup = groupedByLevel[value];
      if (speciesInGroup && speciesInGroup.length > 0) {
        onSelectionChange(speciesInGroup[0]);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Taxonomy Level Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
            Taxonomy Level
          </label>
          <div className="flex gap-1 flex-wrap">
            {TAXONOMY_LEVELS.map(level => (
              <button
                key={level.value}
                onClick={() => {
                  setSelectedLevel(level.value);
                  setSelectedTaxon('');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedLevel === level.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        {/* Taxon/Species Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
            Select {TAXONOMY_LEVELS.find(l => l.value === selectedLevel)?.label}
          </label>
          <Select value={selectedTaxon} onValueChange={handleTaxonChange}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder={`Choose a ${selectedLevel}...`} />
            </SelectTrigger>
            <SelectContent>
              {uniqueTaxa.length > 0 ? (
                uniqueTaxa.map(taxon => (
                  <SelectItem key={taxon.value} value={taxon.value}>
                    {taxon.label}
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-xs text-slate-500">No data available</div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clear selection button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setSelectedTaxon('');
          onSelectionChange(null);
        }}
        className="w-full text-xs"
      >
        Clear Selection
      </Button>
    </div>
  );
}