import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter } from 'lucide-react';

const CATEGORIES = ['All', 'Bioclimatic', 'Temperature', 'Precipitation', 'Vegetation/NDVI', 'Land Cover', 'Aridity', 'Compound'];
const SCENARIOS = ['All', 'Historical/Baseline', 'SSP1-2.6', 'SSP2-4.5', 'SSP3-7.0', 'SSP5-8.5', 'Multiple SSPs', 'All SSPs'];

const scenarioBg = {
  'All': 'bg-slate-100 text-slate-700',
  'Historical/Baseline': 'bg-slate-200 text-slate-700',
  'SSP1-2.6': 'bg-green-100 text-green-800',
  'SSP2-4.5': 'bg-yellow-100 text-yellow-800',
  'SSP3-7.0': 'bg-orange-100 text-orange-800',
  'SSP5-8.5': 'bg-red-100 text-red-800',
  'Multiple SSPs': 'bg-purple-100 text-purple-800',
  'All SSPs': 'bg-blue-100 text-blue-800',
};

export default function ClimateFilters({ activeCategory, activeScenario, onCategoryChange, onScenarioChange }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <Filter className="w-3 h-3" /> Variable Category
        </div>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`text-xs px-2 py-1 rounded-full border font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-bangor-red text-white border-bangor-red'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-bangor-sun'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <Filter className="w-3 h-3" /> Emissions Scenario
        </div>
        <div className="flex flex-wrap gap-1">
          {SCENARIOS.map(sc => (
            <button
              key={sc}
              onClick={() => onScenarioChange(sc)}
              className={`text-xs px-2 py-1 rounded-full border font-medium transition-colors ${
                activeScenario === sc
                  ? `${scenarioBg[sc]} border-current font-bold ring-2 ring-offset-1 ring-current`
                  : `${scenarioBg[sc]} border-transparent hover:border-current`
              }`}
            >
              {sc}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}