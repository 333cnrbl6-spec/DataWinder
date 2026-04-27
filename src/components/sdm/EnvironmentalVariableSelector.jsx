import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Layers, Info } from 'lucide-react';

const BIOCLIM_VARIABLES = [
  { id: 'BIO1', name: 'Annual Mean Temperature', description: 'Average temperature throughout the year' },
  { id: 'BIO2', name: 'Mean Diurnal Range', description: 'Average difference between day & night temperatures' },
  { id: 'BIO3', name: 'Isothermality', description: 'Temperature variation relative to annual range' },
  { id: 'BIO4', name: 'Temperature Seasonality', description: 'Standard deviation of monthly temperatures' },
  { id: 'BIO5', name: 'Max Temperature of Warmest Month', description: 'Highest temperature in the warmest month' },
  { id: 'BIO6', name: 'Min Temperature of Coldest Month', description: 'Lowest temperature in the coldest month' },
  { id: 'BIO7', name: 'Temperature Annual Range', description: 'Difference between max and min temperatures' },
  { id: 'BIO12', name: 'Annual Precipitation', description: 'Total annual rainfall' },
  { id: 'BIO14', name: 'Precipitation of Driest Month', description: 'Rainfall in the driest month' },
  { id: 'BIO15', name: 'Precipitation Seasonality', description: 'Variation in monthly precipitation' },
  { id: 'BIO16', name: 'Precipitation of Wettest Quarter', description: 'Total rainfall in the wettest three months' },
  { id: 'BIO17', name: 'Precipitation of Driest Quarter', description: 'Total rainfall in the driest three months' },
];

const VARIABLE_CATEGORIES = {
  temperature: ['BIO1', 'BIO2', 'BIO3', 'BIO4', 'BIO5', 'BIO6', 'BIO7'],
  precipitation: ['BIO12', 'BIO14', 'BIO15', 'BIO16', 'BIO17'],
};

export default function EnvironmentalVariableSelector({ onVariablesChange, initialVariables = [] }) {
  const [selected, setSelected] = useState(new Set(initialVariables));

  const handleToggle = (varId) => {
    const updated = new Set(selected);
    if (updated.has(varId)) {
      updated.delete(varId);
    } else {
      updated.add(varId);
    }
    setSelected(updated);
    onVariablesChange?.(Array.from(updated));
  };

  const handleSelectCategory = (category) => {
    const vars = VARIABLE_CATEGORIES[category];
    const allSelected = vars.every(v => selected.has(v));
    const updated = new Set(selected);

    if (allSelected) {
      vars.forEach(v => updated.delete(v));
    } else {
      vars.forEach(v => updated.add(v));
    }
    setSelected(updated);
    onVariablesChange?.(Array.from(updated));
  };

  const isCategorySelected = (category) => {
    return VARIABLE_CATEGORIES[category].every(v => selected.has(v));
  };

  const isCategoryPartial = (category) => {
    const vars = VARIABLE_CATEGORIES[category];
    const selectedCount = vars.filter(v => selected.has(v)).length;
    return selectedCount > 0 && selectedCount < vars.length;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Environmental Variables
        </CardTitle>
        <p className="text-sm text-slate-600 mt-2">
          Select {selected.size} variable{selected.size !== 1 ? 's' : ''} (minimum 2 recommended)
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Temperature Variables */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isCategorySelected('temperature')}
              onClick={() => handleSelectCategory('temperature')}
              id="temp-select"
              className="w-5 h-5"
            />
            <label htmlFor="temp-select" className="font-semibold text-sm text-slate-900 cursor-pointer">
              Temperature Variables
            </label>
            <Badge variant="outline" className="text-xs">
              {VARIABLE_CATEGORIES.temperature.filter(v => selected.has(v)).length}/{VARIABLE_CATEGORIES.temperature.length}
            </Badge>
          </div>

          <div className="space-y-2 pl-6">
            {VARIABLE_CATEGORIES.temperature.map(varId => {
              const variable = BIOCLIM_VARIABLES.find(v => v.id === varId);
              return (
                <label key={varId} className="flex items-start gap-3 cursor-pointer group">
                  <Checkbox
                    checked={selected.has(varId)}
                    onClick={() => handleToggle(varId)}
                    className="w-4 h-4 mt-0.5 shrink-0"
                  />
                  <div className="flex-1 group-hover:bg-blue-50 p-2 rounded transition-colors">
                    <p className="text-sm font-medium text-slate-900">{variable.id}: {variable.name}</p>
                    <p className="text-xs text-slate-600">{variable.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Precipitation Variables */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isCategorySelected('precipitation')}
              onClick={() => handleSelectCategory('precipitation')}
              id="precip-select"
              className="w-5 h-5"
            />
            <label htmlFor="precip-select" className="font-semibold text-sm text-slate-900 cursor-pointer">
              Precipitation Variables
            </label>
            <Badge variant="outline" className="text-xs">
              {VARIABLE_CATEGORIES.precipitation.filter(v => selected.has(v)).length}/{VARIABLE_CATEGORIES.precipitation.length}
            </Badge>
          </div>

          <div className="space-y-2 pl-6">
            {VARIABLE_CATEGORIES.precipitation.map(varId => {
              const variable = BIOCLIM_VARIABLES.find(v => v.id === varId);
              return (
                <label key={varId} className="flex items-start gap-3 cursor-pointer group">
                  <Checkbox
                    checked={selected.has(varId)}
                    onClick={() => handleToggle(varId)}
                    className="w-4 h-4 mt-0.5 shrink-0"
                  />
                  <div className="flex-1 group-hover:bg-blue-50 p-2 rounded transition-colors">
                    <p className="text-sm font-medium text-slate-900">{variable.id}: {variable.name}</p>
                    <p className="text-xs text-slate-600">{variable.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Selection Info */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex gap-3">
          <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700">
            <p className="font-semibold mb-1">Selection Guide</p>
            <p>
              {selected.size < 2 && '⚠️ Select at least 2 variables for a meaningful model. '}
              {selected.size === 0 && 'Start with common variables like annual temperature and precipitation.'}
              {selected.size >= 2 && selected.size <= 5 && '✓ Good! This combination provides a balanced model.'}
              {selected.size > 5 && selected.size <= 8 && '✓ Comprehensive model with multiple environmental factors.'}
              {selected.size > 8 && '⚠️ Many variables may cause overfitting. Consider reducing selection.'}
            </p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}