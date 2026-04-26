import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, X, AlertCircle, CheckCircle2, Flag, MessageSquare, Sliders, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AnnotationDrawer({ sdmRunId, existingAnnotations = [] }) {
  const [annotationType, setAnnotationType] = useState('flag');
  const [notes, setNotes] = useState('');
  const [suitabilityOverride, setSuitabilityOverride] = useState('');
  const queryClient = useQueryClient();

  const saveAnnotationMutation = useMutation({
    mutationFn: async (annotationData) => {
      return base44.functions.invoke('saveAnnotation', annotationData);
    },
    onSuccess: () => {
      toast.success('Annotation saved successfully');
      setNotes('');
      setSuitabilityOverride('');
      setAnnotationType('flag');
      queryClient.invalidateQueries({ queryKey: ['sdm-annotations', sdmRunId] });
    },
    onError: (error) => {
      toast.error('Failed to save annotation: ' + error.message);
    }
  });

  const handleSaveAnnotation = async () => {
    if (!notes.trim()) {
      toast.error('Please add notes for this annotation');
      return;
    }

    const overrideValue = suitabilityOverride ? parseFloat(suitabilityOverride) : null;
    if (overrideValue !== null && (overrideValue < 0 || overrideValue > 1)) {
      toast.error('Suitability score must be between 0 and 1');
      return;
    }

    const geometry = {
      type: 'Point',
      coordinates: [0, 0]
    };

    await saveAnnotationMutation.mutateAsync({
      sdm_run_id: sdmRunId,
      annotation_type: annotationType,
      geometry,
      notes,
      suitability_override: overrideValue,
      severity: annotationType === 'critical' ? 'critical' : 'info'
    });
  };

  const handleClear = () => {
    setNotes('');
    setSuitabilityOverride('');
  };

  const annotationTypeConfig = {
    flag: { icon: Flag, color: 'bg-red-100 text-red-700', label: 'Region Flag' },
    comment: { icon: MessageSquare, color: 'bg-blue-100 text-blue-700', label: 'Comment' },
    override: { icon: Sliders, color: 'bg-purple-100 text-purple-700', label: 'Score Override' },
    critical: { icon: AlertCircle, color: 'bg-orange-100 text-orange-700', label: 'Critical Issue' }
  };

  const config = annotationTypeConfig[annotationType];
  const Icon = config.icon;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Map Annotations</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4">
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="list">
              List
              {existingAnnotations.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5">{existingAnnotations.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Create Tab */}
          <TabsContent value="create" className="space-y-4 mt-4">
            {/* Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Annotate regions</strong> with expert knowledge to flag areas for validation or override suitability scores.
              </p>
            </div>

            {/* Annotation Type */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(annotationTypeConfig).map(([key, val]) => {
                  const TypeIcon = val.icon;
                  return (
                    <Button
                      key={key}
                      variant={annotationType === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAnnotationType(key)}
                      className={`text-xs gap-1 ${annotationType === key ? '' : 'text-slate-600'}`}
                    >
                      <TypeIcon className="w-3 h-3" />
                      {val.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add expert observations or concerns..."
                className="w-full p-2 border border-slate-200 rounded-lg text-xs h-20 resize-none"
              />
            </div>

            {/* Suitability Override */}
            {annotationType === 'override' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Override Score (0.0 - 1.0)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={suitabilityOverride}
                    onChange={(e) => setSuitabilityOverride(e.target.value)}
                    placeholder="0.0"
                    className="h-8 text-xs"
                  />
                  {suitabilityOverride && (
                    <span className="text-xs font-semibold text-slate-700 flex items-center">
                      {(parseFloat(suitabilityOverride) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveAnnotation}
                disabled={!notes || saveAnnotationMutation.isPending}
                className="flex-1 gap-2 bg-bangor-red hover:bg-bangor-red/90 text-white"
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
              <Button
                onClick={handleClear}
                variant="outline"
                className="flex-1 gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
            </div>
          </TabsContent>

          {/* List Tab */}
          <TabsContent value="list" className="mt-4">
            {existingAnnotations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-600">No annotations yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {existingAnnotations.map(annotation => {
                  const typeConfig = annotationTypeConfig[annotation.annotation_type];
                  const TypeIcon = typeConfig?.icon || Flag;
                  return (
                    <div
                      key={annotation.id}
                      className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4 text-slate-600" />
                          <Badge className={`text-xs ${typeConfig?.color}`}>
                            {typeConfig?.label}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-700 mb-1">{annotation.content}</p>
                      <p className="text-xs text-slate-500">
                        {annotation.created_by_name}
                      </p>
                      {annotation.rerun_parameters?.suitability_override !== undefined && (
                        <p className="text-xs text-purple-600 mt-1 font-medium">
                          Override: {(annotation.rerun_parameters.suitability_override * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}