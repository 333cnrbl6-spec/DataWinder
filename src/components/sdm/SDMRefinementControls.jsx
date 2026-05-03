import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RotateCcw, Save, Trash2, Eye } from 'lucide-react';

export default function SDMRefinementControls({
  threshold,
  onThresholdChange,
  excludeZoneCount,
  onReset,
  onSave,
  onClearZones,
  isSaving = false,
  hasChanges = false,
  originalMetrics,
  predictedAreaChange
}) {
  return (
    <div className="space-y-4">
      {/* Threshold Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Suitability Threshold</span>
            <Badge className="bg-blue-100 text-blue-700 text-xs">{threshold.toFixed(2)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Slider
            value={[threshold]}
            onValueChange={(val) => onThresholdChange(val[0])}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>0.0 (Include all)</span>
            <span>1.0 (Only high suitability)</span>
          </div>
          <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
            Regions with suitability ≥ {threshold.toFixed(2)} will be displayed. Adjust to refine habitat predictions.
          </p>
        </CardContent>
      </Card>

      {/* Exclusion Zones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Exclusion Zones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-slate-800">{excludeZoneCount}</p>
              <p className="text-xs text-slate-500">zones drawn</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onClearZones}
              disabled={excludeZoneCount === 0}
              className="text-xs h-8"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          </div>
          <p className="text-xs text-slate-600 bg-amber-50 border border-amber-200 p-2 rounded">
            💡 Draw polygons on the map to exclude unsuitable regions (e.g., urban areas, water bodies, unsuitable habitats).
          </p>
        </CardContent>
      </Card>

      {/* Impact Summary */}
      {originalMetrics && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Refinement Impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Original habitat area:</span>
              <span className="font-semibold text-slate-800">{originalMetrics.estimatedArea || '—'}</span>
            </div>
            {predictedAreaChange && (
              <div className="flex justify-between">
                <span className="text-slate-600">Refined habitat area:</span>
                <span className={`font-semibold ${predictedAreaChange < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {predictedAreaChange.toFixed(1)}% {predictedAreaChange < 0 ? 'decrease' : 'increase'}
                </span>
              </div>
            )}
            <p className="text-slate-500 mt-2">
              Threshold and exclusion zones refine the ecological accuracy of your model.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          onClick={onSave}
          disabled={!hasChanges || isSaving}
          className="w-full bg-bangor-red hover:bg-bangor-red/90 text-white font-semibold gap-2 h-10"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving refinements…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Apply Changes
            </>
          )}
        </Button>

        <Button
          onClick={onReset}
          variant="outline"
          disabled={!hasChanges}
          className="w-full gap-2 h-9"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Original
        </Button>
      </div>

      {/* Warning */}
      {excludeZoneCount > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-700" />
          <AlertDescription className="text-xs text-yellow-800">
            {excludeZoneCount} exclusion zone{excludeZoneCount !== 1 ? 's' : ''} will be applied. Review before saving.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}