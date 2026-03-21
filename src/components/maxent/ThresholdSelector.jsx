import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

export default function ThresholdSelector({ auc, testAuc }) {
  const [selectedThreshold, setSelectedThreshold] = useState('fixed_10');

  // Calculate thresholds based on AUC
  const thresholds = {
    fixed_10: {
      name: 'Fixed 10 Percentile',
      description: 'Most conservative - excludes lowest 10% of training presence probability',
      value: 10,
      use_case: 'Strict habitat identification'
    },
    fixed_5: {
      name: 'Fixed 5 Percentile',
      description: 'Conservative - excludes lowest 5% of training presence',
      value: 5,
      use_case: 'Core habitat mapping'
    },
    lpt: {
      name: 'Lowest Presence Threshold',
      description: 'Uses minimum suitability value where species was observed',
      value: 'Data-driven',
      use_case: 'All observed locations matter'
    },
    mtp: {
      name: 'Maximum Training Sensitivity + Specificity',
      description: 'Optimizes true positive vs false positive balance',
      value: 'Optimized',
      use_case: 'Balanced presence-absence prediction'
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Threshold Selection</CardTitle>
        <CardDescription>
          Choose a suitability threshold to convert continuous predictions to presence/absence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model performance metrics */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <span className="text-xs text-slate-600">Training AUC</span>
            <div className="font-bold text-lg text-blue-900">{auc?.toFixed(3) || 'N/A'}</div>
          </div>
          <div>
            <span className="text-xs text-slate-600">Test AUC</span>
            <div className="font-bold text-lg text-blue-900">{testAuc?.toFixed(3) || 'N/A'}</div>
          </div>
        </div>

        {/* Threshold options */}
        <div className="space-y-2">
          {Object.entries(thresholds).map(([key, threshold]) => (
            <div
              key={key}
              onClick={() => setSelectedThreshold(key)}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedThreshold === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm text-slate-900">
                    {threshold.name}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {threshold.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {threshold.use_case}
                    </Badge>
                  </div>
                </div>
                <input
                  type="radio"
                  checked={selectedThreshold === key}
                  onChange={() => setSelectedThreshold(key)}
                  className="mt-1"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Info box */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-3">
          <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <span className="font-semibold">Note:</span> Different thresholds create different habitat maps. 
            Lower thresholds = larger potential range, higher thresholds = core habitat only. 
            Choose based on your conservation question.
          </div>
        </div>

        {/* Apply button */}
        <Button className="w-full bg-blue-600 hover:bg-blue-700">
          Apply Threshold &amp; Generate Binary Map
        </Button>
      </CardContent>
    </Card>
  );
}