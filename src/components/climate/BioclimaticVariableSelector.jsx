import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Droplets, Wind, Sun, Cloud, Waves } from 'lucide-react';

const BIOCLIM_VARS = [
  { id: 'bio1', label: 'Annual Mean Temp', group: 'Temperature', icon: Thermometer, desc: 'Average temperature year-round' },
  { id: 'bio2', label: 'Temp Range', group: 'Temperature', icon: Thermometer, desc: 'Max - Min temperature' },
  { id: 'bio4', label: 'Temp Seasonality', group: 'Temperature', icon: Wind, desc: 'Temperature variation across seasons' },
  { id: 'bio5', label: 'Max Temp', group: 'Temperature', icon: Sun, desc: 'Warmest month average' },
  { id: 'bio6', label: 'Min Temp', group: 'Temperature', icon: Cloud, desc: 'Coldest month average' },
  { id: 'bio12', label: 'Annual Precip', group: 'Precipitation', icon: Droplets, desc: 'Total yearly rainfall' },
  { id: 'bio13', label: 'Wettest Month', group: 'Precipitation', icon: Waves, desc: 'Precipitation in wettest month' },
  { id: 'bio14', label: 'Driest Month', group: 'Precipitation', icon: Droplets, desc: 'Precipitation in driest month' },
  { id: 'bio15', label: 'Precip Seasonality', group: 'Precipitation', icon: Waves, desc: 'Variation in monthly rainfall' },
];

export default function BioclimaticVariableSelector({ selected, onChange, disabled = false }) {
  const groups = {};
  BIOCLIM_VARS.forEach(v => {
    if (!groups[v.group]) groups[v.group] = [];
    groups[v.group].push(v);
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          Bioclimatic Variable
          {selected && <Badge className="bg-bangor-red text-white text-xs">{selected.toUpperCase()}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(groups).map(([group, vars]) => (
            <div key={group}>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{group}</p>
              <div className="space-y-1.5">
                {vars.map(v => {
                  const Icon = v.icon;
                  const isSelected = selected === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => onChange(v.id)}
                      disabled={disabled}
                      className={`w-full text-left p-2.5 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-bangor-red bg-red-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800">{v.label}</p>
                          <p className="text-xs text-slate-400 leading-tight mt-0.5">{v.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}