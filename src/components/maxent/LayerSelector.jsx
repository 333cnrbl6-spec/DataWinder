import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Info, Layers, CloudRain } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CATEGORY_STYLES = {
  'Bioclimatic':    'bg-green-100 text-green-800 border-green-200',
  'Temperature':    'bg-orange-100 text-orange-800 border-orange-200',
  'Precipitation':  'bg-blue-100 text-blue-800 border-blue-200',
  'Vegetation/NDVI':'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Land Cover':     'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Aridity':        'bg-amber-100 text-amber-800 border-amber-200',
  'Compound':       'bg-purple-100 text-purple-800 border-purple-200',
};

export default function LayerSelector({ selectedLayers, onSelectionChange }) {
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ['climateDatasets'],
    queryFn: () => base44.entities.ClimateDataset.list('-created_date', 200),
  });

  const toggle = (ds) => {
    const isSelected = selectedLayers.some(l => l.id === ds.id);
    onSelectionChange(
      isSelected ? selectedLayers.filter(l => l.id !== ds.id) : [...selectedLayers, ds]
    );
  };

  const categories = ['all', ...new Set(datasets.map(d => d.variable_category).filter(Boolean))];
  const filtered = datasets.filter(d =>
    categoryFilter === 'all' || d.variable_category === categoryFilter
  );

  const grouped = filtered.reduce((acc, ds) => {
    const cat = ds.variable_category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ds);
    return acc;
  }, {});

  return (
    <Card className="shadow-lg border-slate-200">
      <CardHeader className="bg-gradient-to-r from-bangor-red/8 to-bangor-sun/8 border-b border-slate-200">
        <CardTitle className="text-bangor-red text-lg">Select Environmental Layers</CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          These are the climate and environment variables MAXENT uses to predict where your species can survive.
          Aim for 5–15 layers. Avoid choosing very similar ones (e.g. don't pick both mean and max temperature).
        </p>
      </CardHeader>
      <CardContent className="p-6">

        {/* Tip */}
        <div className="mb-4 flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
          <span>
            <strong>Recommended starting point:</strong> Select the 19 WorldClim Bioclimatic variables (BIO1–BIO19).
            They cover temperature and precipitation patterns globally and work well for most species.
          </span>
        </div>

        {/* Selected chips */}
        {selectedLayers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-bangor-red/5 border border-bangor-red/20 rounded-xl">
            <span className="text-xs font-bold text-bangor-red self-center shrink-0">
              {selectedLayers.length} selected:
            </span>
            {selectedLayers.map(l => (
              <button
                key={l.id}
                onClick={() => toggle(l)}
                className="text-xs bg-white border border-bangor-red/30 text-bangor-red px-2 py-0.5 rounded-full hover:bg-bangor-red hover:text-white transition-colors"
              >
                {l.name} ✕
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-10 text-slate-400 text-sm">Loading datasets…</div>
        )}

        {!isLoading && datasets.length === 0 && (
          <div className="text-center py-14 text-slate-400">
            <CloudRain className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-semibold">No climate datasets saved yet.</p>
            <p className="text-xs mt-1">
              Visit the{' '}
              <Link to={createPageUrl('ClimateProjections')} className="text-bangor-red underline">
                Climate Data
              </Link>{' '}
              page to browse and save datasets first.
            </p>
          </div>
        )}

        {!isLoading && datasets.length > 0 && (
          <>
            {/* Category filter tabs */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-xs px-3 py-1 rounded-full font-semibold border transition-all capitalize ${
                    categoryFilter === cat
                      ? 'bg-bangor-red text-white border-bangor-red'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-bangor-red/40'
                  }`}
                >
                  {cat === 'all' ? `All (${datasets.length})` : cat}
                </button>
              ))}
            </div>

            <div className="space-y-5 max-h-[460px] overflow-y-auto pr-1">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${CATEGORY_STYLES[category] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {category}
                    </span>
                    <span className="text-xs text-slate-400">{items.length} datasets</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {items.map(ds => {
                      const isSelected = selectedLayers.some(l => l.id === ds.id);
                      return (
                        <button
                          key={ds.id}
                          onClick={() => toggle(ds)}
                          className={`text-left rounded-xl border-2 p-3 transition-all ${
                            isSelected
                              ? 'border-bangor-red bg-bangor-red/5 shadow-sm'
                              : 'border-slate-200 hover:border-bangor-red/40 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-slate-900 truncate">{ds.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {ds.source}{ds.resolution ? ` · ${ds.resolution}` : ''}
                              </div>
                              {ds.scenario && ds.scenario !== 'Historical/Baseline' && (
                                <div className="text-xs text-slate-400 mt-0.5 italic">{ds.scenario}</div>
                              )}
                            </div>
                            {isSelected && <CheckCircle className="w-4 h-4 text-bangor-red shrink-0 mt-0.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}