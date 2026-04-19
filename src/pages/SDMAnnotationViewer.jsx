import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import SDMAnnotationMap from '@/components/sdm/SDMAnnotationMap';
import AnnotationCreator from '@/components/sdm/AnnotationCreator';
import { Search, Zap, MessageSquare, Flag, CheckCircle2, ArrowRight } from 'lucide-react';

export default function SDMAnnotationViewer() {
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creatorCoords, setCreatorCoords] = useState(null);
  const [resolvingAnnotation, setResolvingAnnotation] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const queryClient = useQueryClient();

  // Fetch SDM runs
  const { data: sdmRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ['sdm-runs'],
    queryFn: () => base44.entities.SDMRun.list('-created_date', 50)
  });

  // Fetch annotations for selected run
  const { data: annotations = [] } = useQuery({
    queryKey: ['sdm-annotations', selectedRun?.id],
    queryFn: () =>
      selectedRun
        ? base44.entities.SDMAnnotation.filter({ sdm_run_id: selectedRun.id }, '-created_date')
        : Promise.resolve([]),
    enabled: !!selectedRun
  });

  const handleResolveAnnotation = async () => {
    if (!resolvingAnnotation) return;

    await base44.functions.invoke('resolveSDMAnnotation', {
      annotation_id: resolvingAnnotation.id,
      resolution_notes: resolutionNotes
    });

    queryClient.invalidateQueries({ queryKey: ['sdm-annotations', selectedRun?.id] });
    setResolvingAnnotation(null);
    setResolutionNotes('');
  };

  if (runsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!selectedRun) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">SDM Annotation Tool</h1>
            <p className="text-slate-600">Collaborate on distribution models: flag issues, discuss results, request re-runs.</p>
          </div>

          <div className="grid gap-4">
            {sdmRuns.map((run) => (
              <Card
                key={run.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedRun(run)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{run.name}</CardTitle>
                      <div className="text-sm text-slate-600 mt-1">
                        {run.species_names?.join(', ')} • {run.species_ids?.length || 0} species
                      </div>
                    </div>
                    <Badge
                      className={`${
                        run.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {run.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Created {new Date(run.created_date).toLocaleDateString()}
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => setSelectedRun(null)} className="mb-4">
              ← Back to Runs
            </Button>
            <h1 className="text-3xl font-bold text-slate-900">{selectedRun.name}</h1>
            <p className="text-slate-600">
              {selectedRun.species_names?.join(', ')} • Status: {selectedRun.status}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-slate-900">{annotations.length}</div>
              <div className="text-sm text-slate-600">Total Annotations</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{annotations.filter(a => a.annotation_type === 'comment').length}</div>
              <div className="text-sm text-slate-600">Comments</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{annotations.filter(a => a.annotation_type === 'flag').length}</div>
              <div className="text-sm text-slate-600">Flags</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{annotations.filter(a => a.resolved).length}</div>
              <div className="text-sm text-slate-600">Resolved</div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <SDMAnnotationMap
          sdmRun={selectedRun}
          annotations={annotations}
          onCreateAnnotation={(coords) => {
            setCreatorCoords(coords);
            setCreatorOpen(true);
          }}
          canEdit={true}
        />

        {/* Annotation Creator */}
        <AnnotationCreator
          sdmRun={selectedRun}
          species={{ id: selectedRun.species_ids?.[0], scientific_name: selectedRun.species_names?.[0] }}
          isOpen={creatorOpen}
          onClose={() => setCreatorOpen(false)}
          coords={creatorCoords || { lat: 0, lon: 0 }}
        />

        {/* Resolve Dialog */}
        {resolvingAnnotation && (
          <AlertDialog open={!!resolvingAnnotation}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resolve Annotation</AlertDialogTitle>
                <AlertDialogDescription>
                  {resolvingAnnotation.title}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <textarea
                placeholder="How was this annotation addressed?"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                rows={4}
              />
              <div className="flex gap-2 justify-end">
                <AlertDialogCancel onClick={() => setResolvingAnnotation(null)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleResolveAnnotation}>
                  Mark Resolved
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}