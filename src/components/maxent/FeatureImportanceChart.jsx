import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function FeatureImportanceChart({ importance, title = "Feature Importance" }) {
  if (!importance || importance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No feature importance data available</p>
        </CardContent>
      </Card>
    );
  }

  const colors = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'
  ];

  const data = importance.map((item, idx) => ({
    ...item,
    display_name: item.variable.replace(/_/g, ' '),
    color: colors[idx % colors.length]
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>
          Relative importance of environmental variables in model ({importance.length} features)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="display_name" 
              angle={-45}
              textAnchor="end"
              height={150}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              label={{ value: 'Relative Importance (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
              formatter={(value) => [
                typeof value === 'number' ? value.toFixed(1) : value,
                value === data[0]?.color ? 'Importance' : 'Value'
              ]}
            />
            <Bar dataKey="relative_importance" fill="#3b82f6" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Top variables summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.slice(0, 3).map((item, idx) => (
            <div key={item.variable} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs font-semibold text-slate-500 uppercase">
                #{idx + 1}
              </div>
              <div className="font-semibold text-slate-900 mt-1 text-sm">
                {item.display_name}
              </div>
              <div className="text-lg font-bold text-slate-900 mt-2">
                {item.relative_importance}%
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}