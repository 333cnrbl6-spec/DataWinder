import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ProcessingFeedback from '@/components/ui/ProcessingFeedback';
import { ArrowLeft, MapPin, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import SDMEditingMap from '@/components/sdm/SDMEditingMap';
import SDMRefinementControls from '@/components/sdm/SDMRefinementControls';

export default function SDMMapEditor() {
  const { sdmRunId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [threshold, setThreshold] = useState(0.5);
  const [excludeZones, setExcludeZones] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalThreshold, setOriginalThreshold] = useState(0.5);
  const [originalZones, setOriginalZones] = useState([]);

  // Fetch SDM run
  const { data: sdmRun, isLoading, error } = useQuery({
    queryKey: ['sdmRun', sdmRunId],
    queryFn: () => base44.entities.SDMRun.get(sdmRunId),
    enabled: !!sdmRunId
  });

  // Initialize from SDM run
  useEffect(() => {
    if (sdmRun) {
      const refinements = sdmRun.manual_refinements || {};
      setThreshold(refinements.threshold ?? 0.5);
      setExcludeZones(refinements.exclude_zones ?? []);
      setOriginalThreshold(refinements.threshold ?? 0.5);
      setOriginalZones(refinements.exclude_zones ?? []);
      setHasChanges(false);
    }
  }, [sdmRun]);

  // Track changes
  useEffect(() => {
    const thresholdChanged = threshold !== originalThreshold;
    const zonesChanged = JSON.stringify(excludeZones) !== JSON.stringify(originalZones);
    setHasChanges(thresholdChanged || zonesChanged);
  }, [threshold, excludeZones, originalThreshold, originalZones]);

  // Save refinements
  const saveMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.SDMRun.update(sdmRunId, {
        manual_refinements: {
          threshold,
          exclude_zones: excludeZones,
          refined_at: new Date().toISOString(),
          refined_by: (await base44.auth.me()).email
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdmRun', sdmRunId] });
      toast.success('SDM refinements saved successfully');
      setOriginalThreshold(threshold);
      setOriginalZones(excludeZones);
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error(`Failed to save refinements: ${error.message}`);
    }
  });

  const handleReset = () => {
    setThreshold(originalThreshold);
    setExcludeZones(originalZones);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !sdmRun) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="outline" onClick={() => navigate(-1)} className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">SDM Run Not Found</p>
                  <p className="text-sm text-red-800 mt-1">
                    Unable to load the specified SDM run. It may have been deleted or you don't have access to it.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Button variant="outline" onClick={() => navigate(-1)} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to SDM Pipeline
          </Button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">SDM Map Editor</h1>
              <p className="text-slate-600 mt-1">Refine {sdmRun.species_names?.join(', ') || 'species'} distribution predictions</p>
              {sdmRun.manual_refinements?.refined_at && (
                <p className="text-xs text-slate-500 mt-2">
                  Last refined: {new Date(sdmRun.manual_refinements.refined_at).toLocaleDateString()}
                </p>
              )}
            </div>
            {hasChanges && (
              <div className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 text-sm font-semibold text-amber-800">
                ⚠️ Unsaved changes
              </div>
            )}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map */}
          <div className="lg:col-span-3">
            <Card className="h-screen lg:h-96 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Interactive Prediction Map
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden rounded-b-xl">
                {sdmRun.prediction_grid ? (
                  <SDMEditingMap
                    predictionGrid={sdmRun.prediction_grid}
                    occurrences={sdmRun.occurrence_points}
                    threshold={threshold}
                    excludeZones={excludeZones}
                    onZonesChange={setExcludeZones}
                    center={sdmRun.center || [20, 0]}
                    zoom={sdmRun.zoom || 3}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50">
                    <p className="text-slate-500">No prediction data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="lg:col-span-1">
            {saveMutation.isPending ? (
              <ProcessingFeedback
                label="Saving refinements…"
                detail="Applying threshold and exclusion zones to SDM model."
                tips={[
                  'Your changes are being saved to the database.',
                  'Refinements will be reflected in all exports and visualizations.',
                ]}
              />
            ) : (
              <SDMRefinementControls
                threshold={threshold}
                onThresholdChange={setThreshold}
                excludeZoneCount={excludeZones.length}
                onReset={handleReset}
                onSave={() => saveMutation.mutate()}
                onClearZones={() => setExcludeZones([])}
                isSaving={saveMutation.isPending}
                hasChanges={hasChanges}
                originalMetrics={{
                  estimatedArea: sdmRun.metrics?.estimated_area || '—'
                }}
              />
            )}
          </div>
        </div>

        {/* Help Section */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-900 space-y-2">
            <p>
              <strong>1. Adjust Threshold:</strong> Move the suitability slider to show only regions with higher ecological potential. Higher values = stricter predictions.
            </p>
            <p>
              <strong>2. Draw Exclusion Zones:</strong> Use the drawing tools (top-left) to sketch polygons over unsuitable areas (urban zones, water bodies, etc.). Excluded areas will not be considered viable habitat.
            </p>
            <p>
              <strong>3. Review:</strong> Green points show confirmed occurrences. Red areas indicate high suitability. Check that your refinements align with known field observations.
            </p>
            <p>
              <strong>4. Save:</strong> Click "Apply Changes" to save your refinements to the model. Changes are immediately reflected in exports and reports.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}