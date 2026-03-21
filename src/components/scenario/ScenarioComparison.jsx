import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react';

export default function ScenarioComparison({ scenarios, rangeShiftTrend }) {
  if (!scenarios || Object.keys(scenarios).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scenario Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No scenario data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = Object.values(scenarios).map(s => ({
    period: s.period.charAt(0).toUpperCase() + s.period.slice(1),
    suitable_area: s.mean_suitable_area_km2,
    uncertainty: s.std_suitable_area_km2,
    auc: (s.mean_auc * 1000).toFixed(0) // Scale for visibility
  }));

  const getTrendIcon = () => {
    switch (rangeShiftTrend) {
      case 'Expanding':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'Contracting':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'Stable':
        return <Minus className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Climate Scenario Projections</CardTitle>
        <CardDescription>
          Ensemble predictions across current and future climate scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Range shift trend badge */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3">
          {getTrendIcon()}
          <div>
            <div className="text-sm font-semibold text-blue-900">Range Shift Trend</div>
            <div className="text-xs text-blue-700">
              {rangeShiftTrend === 'Expanding' && 'Projected suitable habitat increasing under future climate'}
              {rangeShiftTrend === 'Contracting' && 'Projected suitable habitat decreasing under future climate'}
              {rangeShiftTrend === 'Stable' && 'Projected suitable habitat relatively stable'}
              {rangeShiftTrend === 'Unknown' && 'Insufficient data for trend assessment'}
            </div>
          </div>
        </div>

        {/* Suitable area chart */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Projected Suitable Habitat Area</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" />
              <YAxis 
                yAxisId="left"
                label={{ value: 'Area (km²)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="suitable_area"
                fill="#3b82f6"
                name="Mean Suitable Area"
                radius={[8, 8, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Scenario table */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">Scenario Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-slate-700">Scenario</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700">Models</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700">Mean AUC</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700">Area (km²)</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700">Uncertainty</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(scenarios).map((s, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium text-slate-900 capitalize">{s.period}</td>
                    <td className="text-right py-2 px-3 text-slate-600">{s.n_runs}</td>
                    <td className="text-right py-2 px-3 font-semibold text-slate-900">{s.mean_auc}</td>
                    <td className="text-right py-2 px-3 text-slate-600">{s.mean_suitable_area_km2.toLocaleString()}</td>
                    <td className="text-right py-2 px-3 text-slate-500">±{s.std_suitable_area_km2.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Range change calculation */}
        {scenarios['2050'] && scenarios['current'] && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="text-sm font-semibold text-amber-900 mb-2">Projected Range Change (Current → 2050)</div>
            <div className="text-xs text-amber-800 space-y-1">
              <div>
                <span className="font-medium">Area change:</span> {
                  (((scenarios['2050'].mean_suitable_area_km2 - scenarios['current'].mean_suitable_area_km2) / 
                    scenarios['current'].mean_suitable_area_km2) * 100).toFixed(1)
                }%
              </div>
              <div>
                <span className="font-medium">Model agreement:</span> {scenarios['current'].n_runs} models in current, {scenarios['2050'].n_runs} models in 2050
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}