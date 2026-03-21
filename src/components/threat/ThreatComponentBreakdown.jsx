import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ThreatComponentBreakdown({ breakdown }) {
  if (!breakdown) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Threat Components</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const components = [
    { name: 'Habitat Loss', value: breakdown.habitat_loss_score, max: 25, color: '#ef4444' },
    { name: 'Population Decline', value: breakdown.population_decline_score, max: 25, color: '#f97316' },
    { name: 'Climate Change', value: breakdown.climate_change_score, max: 25, color: '#eab308' },
    { name: 'Disease Risk', value: breakdown.disease_risk_score, max: 15, color: '#8b5cf6' },
    { name: 'Protection Gap', value: breakdown.protection_gap_score, max: 10, color: '#06b6d4' }
  ];

  const chartData = components.map(c => ({
    name: c.name,
    value: c.value,
    max: c.max,
    percent: (c.value / c.max * 100).toFixed(0)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Threat Components</CardTitle>
        <CardDescription>Breakdown of individual threat factors (max score per component shown)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={120}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
              formatter={(value, name) => {
                if (name === 'value') return [value.toFixed(1), 'Score'];
                return value;
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={components[index].color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Component details */}
        <div className="space-y-2 mt-6">
          {chartData.map((item, idx) => (
            <div key={item.name} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-900">{item.name}</span>
                <span className="text-sm font-bold text-slate-700">{item.value.toFixed(1)} / {item.max}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(item.value / item.max * 100)}%`,
                    backgroundColor: components[idx].color
                  }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {item.percent}% of max score
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}