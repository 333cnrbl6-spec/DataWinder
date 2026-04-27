import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, AlertCircle } from 'lucide-react';

export default function ParameterConfigurator({ onParametersChange, initialParams = {} }) {
  const [params, setParams] = useState({
    regularization: initialParams.regularization || 1.0,
    test_fraction: initialParams.test_fraction || 0.25,
    auc_threshold: initialParams.auc_threshold || 0.7,
    tss_threshold: initialParams.tss_threshold || 0.4,
    outlier_handling: initialParams.outlier_handling || 'remove',
    thinning_km: initialParams.thinning_km || 10,
  });

  const handleChange = (key, value) => {
    const updated = { ...params, [key]: value };
    setParams(updated);
    onParametersChange?.(updated);
  };

  const performanceInterpretation = (metric, value) => {
    if (metric === 'auc') {
      if (value >= 0.9) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
      if (value >= 0.8) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
      if (value >= 0.7) return { label: 'Fair', color: 'bg-yellow-100 text-yellow-800' };
      return { label: 'Poor', color: 'bg-red-100 text-red-800' };
    }
    if (metric === 'tss') {
      if (value >= 0.6) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
      if (value >= 0.4) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
      if (value >= 0.2) return { label: 'Fair', color: 'bg-yellow-100 text-yellow-800' };
      return { label: 'Poor', color: 'bg-red-100 text-red-800' };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Model Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Regularization */}
        <div>
          <label className="text-sm font-semibold text-slate-900 mb-2 block">
            Regularization
            <span className="text-xs text-slate-500 font-normal ml-1">
              (higher = more penalization)
            </span>
          </label>
          <div className="space-y-2">
            <Slider
              min={0.1}
              max={10}
              step={0.1}
              value={[params.regularization]}
              onValueChange={(val) => handleChange('regularization', val[0])}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">λ = {params.regularization.toFixed(2)}</span>
              <Badge variant="outline" className="text-xs">
                {params.regularization <= 1 ? 'Low' : params.regularization <= 5 ? 'Medium' : 'High'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Test Fraction */}
        <div>
          <label className="text-sm font-semibold text-slate-900 mb-2 block">
            Test Fraction
            <span className="text-xs text-slate-500 font-normal ml-1">
              (proportion for validation)
            </span>
          </label>
          <div className="space-y-2">
            <Slider
              min={0.1}
              max={0.5}
              step={0.05}
              value={[params.test_fraction]}
              onValueChange={(val) => handleChange('test_fraction', val[0])}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">
                {(params.test_fraction * 100).toFixed(0)}% test
              </span>
              <span className="text-sm text-slate-600">
                {((1 - params.test_fraction) * 100).toFixed(0)}% train
              </span>
            </div>
          </div>
        </div>

        {/* AUC Threshold */}
        <div>
          <label className="text-sm font-semibold text-slate-900 mb-2 block">
            AUC Threshold
            <span className="text-xs text-slate-500 font-normal ml-1">
              (minimum acceptable performance)
            </span>
          </label>
          <div className="space-y-2">
            <Slider
              min={0.5}
              max={1}
              step={0.05}
              value={[params.auc_threshold]}
              onValueChange={(val) => handleChange('auc_threshold', val[0])}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">
                AUC ≥ {params.auc_threshold.toFixed(2)}
              </span>
              <Badge className={performanceInterpretation('auc', params.auc_threshold)?.color}>
                {performanceInterpretation('auc', params.auc_threshold)?.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* TSS Threshold */}
        <div>
          <label className="text-sm font-semibold text-slate-900 mb-2 block">
            TSS Threshold
            <span className="text-xs text-slate-500 font-normal ml-1">
              (True Skill Statistic)
            </span>
          </label>
          <div className="space-y-2">
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[params.tss_threshold]}
              onValueChange={(val) => handleChange('tss_threshold', val[0])}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">
                TSS ≥ {params.tss_threshold.toFixed(2)}
              </span>
              <Badge className={performanceInterpretation('tss', params.tss_threshold)?.color}>
                {performanceInterpretation('tss', params.tss_threshold)?.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Spatial Thinning */}
        <div>
          <label className="text-sm font-semibold text-slate-900 mb-2 block">
            Spatial Thinning
            <span className="text-xs text-slate-500 font-normal ml-1">
              (minimum distance between points in km)
            </span>
          </label>
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            value={params.thinning_km}
            onChange={(e) => handleChange('thinning_km', parseFloat(e.target.value) || 0)}
            className="w-full"
          />
          <p className="text-xs text-slate-600 mt-2">
            Reduces spatial autocorrelation and improves model generalization
          </p>
        </div>

        {/* Outlier Handling */}
        <div>
          <label className="text-sm font-semibold text-slate-900 mb-2 block">
            Outlier Handling
          </label>
          <Select value={params.outlier_handling} onValueChange={(val) => handleChange('outlier_handling', val)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="remove">Remove outliers</SelectItem>
              <SelectItem value="flag">Flag outliers</SelectItem>
              <SelectItem value="keep">Keep all points</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex gap-3">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800">
            <p className="font-semibold mb-1">Parameter Tips</p>
            <p>Higher regularization prevents overfitting. Increase test fraction for smaller datasets. Spatial thinning reduces bias from clustered observations.</p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}