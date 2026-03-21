import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ThreatGauge({ score, category }) {
  const getColor = (cat) => {
    switch (cat) {
      case 'Critical': return { bg: 'bg-red-500', text: 'text-red-900', light: 'bg-red-50', border: 'border-red-200' };
      case 'High': return { bg: 'bg-orange-500', text: 'text-orange-900', light: 'bg-orange-50', border: 'border-orange-200' };
      case 'Moderate': return { bg: 'bg-yellow-500', text: 'text-yellow-900', light: 'bg-yellow-50', border: 'border-yellow-200' };
      case 'Low': return { bg: 'bg-green-500', text: 'text-green-900', light: 'bg-green-50', border: 'border-green-200' };
      default: return { bg: 'bg-slate-500', text: 'text-slate-900', light: 'bg-slate-50', border: 'border-slate-200' };
    }
  };

  const colors = getColor(category);
  const percentage = (score / 100) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Overall Threat Level</CardTitle>
        <CardDescription>Composite conservation threat assessment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Large gauge display */}
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32 rounded-full border-8 border-slate-200 flex items-center justify-center" style={{
            background: `conic-gradient(${colors.bg.split('bg-')[1]} 0deg ${(percentage / 100) * 360}deg, #f1f5f9 ${(percentage / 100) * 360}deg)`
          }}>
            <div className="absolute inset-2 bg-white rounded-full flex flex-col items-center justify-center">
              <div className={`text-4xl font-bold ${colors.text}`}>
                {score.toFixed(0)}
              </div>
              <div className="text-xs text-slate-500">/ 100</div>
            </div>
          </div>
        </div>

        {/* Category badge */}
        <div className={`p-4 rounded-lg border-2 ${colors.light} ${colors.border} text-center`}>
          <div className="text-xs text-slate-600 uppercase font-semibold tracking-wide">Threat Category</div>
          <div className={`text-2xl font-bold ${colors.text} mt-2`}>
            {category}
          </div>
          <div className="text-xs text-slate-600 mt-2">
            {category === 'Critical' && 'Immediate conservation action required'}
            {category === 'High' && 'Urgent conservation intervention needed'}
            {category === 'Moderate' && 'Active monitoring and conservation planning recommended'}
            {category === 'Low' && 'Maintain current conservation efforts'}
          </div>
        </div>

        {/* Score interpretation */}
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong>Score Interpretation:</strong> Higher scores indicate greater extinction risk. 
          Scores are calculated from habitat loss, population decline, climate vulnerability, disease risk, and protection gaps.
        </div>
      </CardContent>
    </Card>
  );
}