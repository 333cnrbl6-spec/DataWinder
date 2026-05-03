import React from 'react';
import { X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SpeciesFilterPanel({
  filters,
  setFilters,
  allSpecies,
  onClose
}) {
  const threatLevels = ['critical', 'high', 'medium', 'low'];

  const handleThreatChange = (level) => {
    const updated = filters.threatLevel.includes(level)
      ? filters.threatLevel.filter(t => t !== level)
      : [...filters.threatLevel, level];
    setFilters({ ...filters, threatLevel: updated });
  };

  const handleSpeciesChange = (speciesId) => {
    const updated = filters.speciesIds.includes(speciesId)
      ? filters.speciesIds.filter(s => s !== speciesId)
      : [...filters.speciesIds, speciesId];
    setFilters({ ...filters, speciesIds: updated });
  };

  const handleDateChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
        <h2 className="font-bold text-slate-900">Filters</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Threat Level */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Threat Level</h3>
          <div className="space-y-2">
            {threatLevels.map(level => (
              <label key={level} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.threatLevel.includes(level)}
                  onCheckedChange={() => handleThreatChange(level)}
                />
                <span className="text-sm text-slate-700 capitalize">{level}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Observation Date</h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-600">From</label>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">To</label>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleDateChange('dateTo', e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Status</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.verified === true}
                onCheckedChange={() => setFilters({ ...filters, verified: filters.verified === true ? null : true })}
              />
              <span className="text-sm text-slate-700">Verified Only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.verified === false}
                onCheckedChange={() => setFilters({ ...filters, verified: filters.verified === false ? null : false })}
              />
              <span className="text-sm text-slate-700">Unverified</span>
            </label>
          </div>
        </div>

        {/* Species Selection */}
        {allSpecies.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Species</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allSpecies.slice(0, 20).map(species => (
                <label key={species.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.speciesIds.includes(species.id)}
                    onCheckedChange={() => handleSpeciesChange(species.id)}
                  />
                  <span className="text-sm text-slate-700 truncate">
                    {species.scientific_name || species.common_name}
                  </span>
                </label>
              ))}
              {allSpecies.length > 20 && (
                <div className="text-xs text-slate-500 italic">
                  +{allSpecies.length - 20} more species
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}