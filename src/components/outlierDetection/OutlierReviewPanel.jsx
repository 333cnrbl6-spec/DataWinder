import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MapPin, Calendar, User, Loader, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function OutlierReviewPanel({ speciesIds, onComplete }) {
  const [outlierResults, setOutlierResults] = useState(null);
  const [selectedOutliers, setSelectedOutliers] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const detectOutliersMutation = useMutation({
    mutationFn: () => base44.functions.invoke('detectGeographicOutliers', {
      species_ids: speciesIds,
      z_threshold: 2.5
    }),
    onSuccess: (response) => {
      setOutlierResults(response.data);
    },
    onError: (error) => {
      toast.error('Failed to detect outliers');
      console.error(error);
    }
  });

  const handleDetectOutliers = () => {
    setLoading(true);
    detectOutliersMutation.mutate();
  };

  const handleToggleOutlier = (occurrenceId) => {
    const updated = new Set(selectedOutliers);
    if (updated.has(occurrenceId)) {
      updated.delete(occurrenceId);
    } else {
      updated.add(occurrenceId);
    }
    setSelectedOutliers(updated);
  };

  const handleRemoveSelected = async () => {
    if (selectedOutliers.size === 0) return;

    try {
      // Delete selected outliers
      for (const occurrenceId of selectedOutliers) {
        await base44.entities.Occurrence.delete(occurrenceId);
      }
      toast.success(`Removed ${selectedOutliers.size} outlier(s)`);
      setSelectedOutliers(new Set());
      onComplete?.();
    } catch (error) {
      toast.error('Failed to remove outliers');
      console.error(error);
    }
  };

  if (!outlierResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Outlier Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Analyze {speciesIds.length} species for geographic and temporal outliers using Z-score filtering.
          </p>
          <Button
            onClick={handleDetectOutliers}
            disabled={detectOutliersMutation.isPending}
            className="w-full"
          >
            {detectOutliersMutation.isPending ? (
              <>
                <Loader className="w-4 h-4 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              'Detect Outliers'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { summary, results } = outlierResults;

  return (
    <div className="space-y-4">
      
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Detection Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600">Total Records</p>
              <p className="text-2xl font-bold text-slate-900">{summary.total_records}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600">Outliers Found</p>
              <p className="text-2xl font-bold text-amber-600">{summary.total_outliers}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600">Clean Records</p>
              <p className="text-2xl font-bold text-green-600">
                {summary.total_records - summary.total_outliers}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Species Results */}
      {results.map((speciesResult) => (
        speciesResult.outliers.length > 0 && (
          <Card key={speciesResult.species_id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{speciesResult.outliers[0]?.species_name}</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    {speciesResult.outliers_count} outliers ({speciesResult.outlier_percentage}%)
                  </p>
                </div>
                <Badge variant="outline" className="text-amber-700 bg-amber-50">
                  {speciesResult.outliers_count} issues
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {speciesResult.outliers.map((outlier) => (
                <div
                  key={outlier.occurrence_id}
                  className="p-3 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                  onClick={() => handleToggleOutlier(outlier.occurrence_id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedOutliers.has(outlier.occurrence_id)}
                      onChange={() => {}}
                      className="w-4 h-4 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex gap-2 flex-wrap mb-2">
                        {outlier.outlier_flags.map((flag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {flag.type.replace('_', ' ')} (Z={flag.z_score})
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-slate-700 space-y-1">
                        {outlier.latitude && outlier.longitude && (
                          <p className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {outlier.latitude.toFixed(4)}, {outlier.longitude.toFixed(4)}
                          </p>
                        )}
                        {outlier.observation_date && (
                          <p className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(outlier.observation_date).toLocaleDateString()}
                          </p>
                        )}
                        {outlier.observer_name && (
                          <p className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {outlier.observer_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      ))}

      {/* Action Buttons */}
      {summary.total_outliers > 0 && (
        <div className="flex gap-3 sticky bottom-0 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <Button
            onClick={handleRemoveSelected}
            disabled={selectedOutliers.size === 0}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            Remove {selectedOutliers.size > 0 ? `(${selectedOutliers.size})` : 'Selected'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setOutlierResults(null)}
            className="flex-1"
          >
            Done Reviewing
          </Button>
        </div>
      )}

    </div>
  );
}