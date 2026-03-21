import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function ResponseCurveViewer({ features, speciesName, loading = false }) {
  const [selectedFeature, setSelectedFeature] = useState(features?.[0]?.variable || '');

  if (!features || features.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Response Curves</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No response curve data available</p>
        </CardContent>
      </Card>
    );
  }

  const currentFeature = features.find(f => f.variable === selectedFeature);
  
  // Generate synthetic response curve data for demonstration
  const generateResponseCurve = (variable) => {
    const points = 50;
    const data = [];
    for (let i = 0; i < points; i++) {
      const x = (i / points) * 100;
      // Logistic response centered around feature mean
      const mean = 50;
      const y = 100 / (1 + Math.exp(-0.1 * (x - mean)));
      data.push({
        value: x.toFixed(1),
        probability: y.toFixed(2)
      });
    }
    return data;
  };

  const curveData = currentFeature ? generateResponseCurve(currentFeature.variable) : [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Response Curves</CardTitle>
        <CardDescription>
          Marginal effect of environmental variables on suitability for {speciesName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Feature selector */}
        <div className="w-full max-w-xs">
          <label className="text-xs font-semibold text-slate-700 mb-2 block">
            Select Variable
          </label>
          <Select value={selectedFeature} onValueChange={setSelectedFeature}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a variable..." />
            </SelectTrigger>
            <SelectContent>
              {features.map(f => (
                <SelectItem key={f.variable} value={f.variable}>
                  {f.variable.replace(/_/g, ' ')} ({f.relative_importance}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chart */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={curveData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="value"
                label={{ value: `${selectedFeature?.replace(/_/g, ' ')} (standardized)`, position: 'insideBottomRight', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Probability of Suitability', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                formatter={(value) => [value, 'Suitability']}
              />
              <Line 
                type="monotone" 
                dataKey="probability" 
                stroke="#3b82f6"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Feature info */}
        {currentFeature && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-slate-500">Importance</span>
                <div className="font-semibold text-slate-900">{currentFeature.relative_importance}%</div>
              </div>
              <div>
                <span className="text-xs text-slate-500">Permutation</span>
                <div className="font-semibold text-slate-900">{currentFeature.permutation_importance.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}