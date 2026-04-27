import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Zap, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';

export default function OutputVisualization({ sdmRun }) {
  if (!sdmRun || !sdmRun.metrics) {
    return (
      <Card className="bg-slate-50">
        <CardContent className="p-8 text-center">
          <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No model results available yet. Run the SDM pipeline to see outputs.</p>
        </CardContent>
      </Card>
    );
  }

  const { metrics, variable_importance = [], response_curves = [], prediction_grid = [] } = sdmRun;

  const statusColor = {
    auc: metrics.auc >= 0.8 ? 'text-green-600' : metrics.auc >= 0.7 ? 'text-blue-600' : 'text-yellow-600',
    tss: metrics.tss >= 0.6 ? 'text-green-600' : metrics.tss >= 0.4 ? 'text-blue-600' : 'text-yellow-600',
  };

  const performanceData = [
    { name: 'AUC', value: (metrics.auc * 100).toFixed(1), threshold: 70 },
    { name: 'TSS', value: (metrics.tss * 100).toFixed(1), threshold: 40 },
    { name: 'Sensitivity', value: (metrics.sensitivity * 100).toFixed(1), threshold: 50 },
    { name: 'Specificity', value: (metrics.specificity * 100).toFixed(1), threshold: 50 },
  ];

  // Prepare response curve data
  const responseCurveData = response_curves.map((curve, idx) => ({
    variable: curve.variable,
    points: curve.points || [],
  }));

  // Sample distribution for suitability map
  const suitabilityDistribution = prediction_grid
    .filter((p, idx) => idx < 1000) // Sample for performance
    .map(p => ({
      suitability: (p.suitability * 100).toFixed(1),
      latitude: p.latitude,
      longitude: p.longitude,
    }));

  return (
    <div className="space-y-4">
      
      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Model Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">AUC</p>
              <p className={`text-2xl font-bold ${statusColor.auc}`}>
                {metrics.auc?.toFixed(3)}
              </p>
              <p className="text-xs text-slate-600 mt-1">Area Under Curve</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">TSS</p>
              <p className={`text-2xl font-bold ${statusColor.tss}`}>
                {metrics.tss?.toFixed(3)}
              </p>
              <p className="text-xs text-slate-600 mt-1">True Skill Statistic</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Omission Rate</p>
              <p className="text-2xl font-bold text-slate-900">
                {(metrics.omission_rate * 100)?.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-600 mt-1">Test Points Excluded</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Training Data</p>
              <p className="text-lg font-bold text-slate-900">
                {metrics.n_train}
              </p>
              <p className="text-xs text-slate-600 mt-1">Points Used</p>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}
                  formatter={(value) => `${value}%`}
                />
                <Bar dataKey="value" fill="#7c3aed" radius={4} />
                <Bar dataKey="threshold" fill="#e2e8f0" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Variable Importance */}
      {variable_importance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Variable Importance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={variable_importance.slice(0, 10).map(v => ({
                    variable: v.variable,
                    importance: (v.importance * 100).toFixed(1),
                  }))}
                  layout="vertical"
                  margin={{ left: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis dataKey="variable" type="category" stroke="#64748b" style={{ fontSize: '11px' }} width={55} />
                  <Tooltip contentStyle={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }} />
                  <Bar dataKey="importance" fill="#f59e0b" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-600 mt-4">
              Variables are ranked by their contribution to predicting species distribution. Top variables have the strongest influence on the model.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Response Curves */}
      {responseCurveData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Response Curves (Sample)</CardTitle>
          </CardHeader>
          <CardContent>
            {responseCurveData.slice(0, 2).map((curve, idx) => (
              <div key={idx} className="mb-6">
                <p className="text-sm font-semibold text-slate-900 mb-3">{curve.variable}</p>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={curve.points}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }} />
                      <Line
                        type="monotone"
                        dataKey="y"
                        stroke="#0ea5e9"
                        dot={false}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Suitability Distribution */}
      {suitabilityDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Suitability Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" dataKey="longitude" stroke="#64748b" style={{ fontSize: '12px' }} name="Longitude" />
                  <YAxis type="number" dataKey="latitude" stroke="#64748b" style={{ fontSize: '12px' }} name="Latitude" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#f1f5f9' }} />
                  <Scatter name="Suitability" data={suitabilityDistribution} fill="#ec4899" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-600 mt-4">
              Scatter plot showing predicted suitability values across geographic space. Higher values indicate more suitable habitat.
            </p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}