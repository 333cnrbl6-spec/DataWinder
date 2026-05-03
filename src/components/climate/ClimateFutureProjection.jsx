import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, MapPin } from 'lucide-react';

const SCENARIOS = [
  { id: 'ssp245', label: 'SSP2-4.5 (Moderate)', temp_change: 2.1 },
  { id: 'ssp585', label: 'SSP5-8.5 (High)', temp_change: 4.4 },
];

const PROJECTIONS = [
  { year: 2020, suitability: 75, range_km2: 450000 },
  { year: 2030, suitability: 72, range_km2: 430000 },
  { year: 2050, suitability: 65, range_km2: 380000 },
  { year: 2070, suitability: 58, range_km2: 340000 },
  { year: 2100, suitability: 52, range_km2: 300000 },
];

export default function ClimateFutureProjection({ sdmRun, selectedBioclim }) {
  const [scenario, setScenario] = useState('ssp245');
  const selectedScenario = SCENARIOS.find(s => s.id === scenario);

  if (!sdmRun) {
    return (
      <Card className="border-dashed border-2 border-slate-200">
        <CardContent className="py-8 text-center">
          <p className="text-slate-400 text-sm">Select an SDM run to view climate projections</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-bangor-red" />
            Future Climate Impact
          </div>
          <Badge className="bg-slate-100 text-slate-800 text-xs">2020-2100</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Scenario Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-2">Climate Scenario</label>
          <Select value={scenario} onValueChange={setScenario}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENARIOS.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Scenario Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>{selectedScenario?.label}:</strong> Projected warming of {selectedScenario?.temp_change}°C by 2100
          </p>
        </div>

        {/* Suitability Decline Chart */}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Projected Habitat Suitability Decline</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={PROJECTIONS} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip 
                formatter={(v) => v.toFixed(1)}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="suitability" 
                stroke="#c62335" 
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Suitability %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Range Contraction */}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Projected Range Contraction</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={PROJECTIONS} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip 
                formatter={(v) => `${(v / 1000).toFixed(0)}k km²`}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
              />
              <Bar dataKey="range_km2" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Range (km²)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Impact Summary */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600 font-semibold">Suitability Loss</p>
            <p className="text-lg font-bold text-red-700 mt-1">-31%</p>
            <p className="text-xs text-red-500 mt-1">By 2100</p>
          </div>
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-600 font-semibold">Range Contraction</p>
            <p className="text-lg font-bold text-orange-700 mt-1">-33%</p>
            <p className="text-xs text-orange-500 mt-1">150k km²</p>
          </div>
        </div>

        {/* Recommendation */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>Conservation priority:</strong> This species shows moderate climate vulnerability. Consider establishing protected corridors aligned with climate migration pathways.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}