import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X, Edit2, Archive, Calendar, MapPin, Tag, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectDetailView({ project, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: speciesLists = [] } = useQuery({
    queryKey: ['speciesLists'],
    queryFn: () => base44.entities.SpeciesList.list()
  });

  const { data: climateDatasets = [] } = useQuery({
    queryKey: ['climateDatasets'],
    queryFn: () => base44.entities.ClimateDataset.list()
  });

  const { data: maxentRuns = [] } = useQuery({
    queryKey: ['maxentRuns'],
    queryFn: () => base44.entities.MaxentRun.list()
  });

  const linkedLists = speciesLists.filter(sl => project.species_lists_ids?.includes(sl.id));
  const linkedDatasets = climateDatasets.filter(cd => project.climate_dataset_ids?.includes(cd.id));
  const linkedRuns = maxentRuns.filter(mr => project.maxent_run_ids?.includes(mr.id));

  const handleArchive = async () => {
    if (window.confirm('Archive this project?')) {
      setLoading(true);
      try {
        await base44.entities.Project.update(project.id, { status: 'archived' });
        toast.success('Project archived');
        onUpdate();
        onClose();
      } catch (err) {
        toast.error('Failed to archive project');
      } finally {
        setLoading(false);
      }
    }
  };

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-slate-100 text-slate-600'
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-start justify-between">
          <div className="flex-1">
            <DialogTitle className="text-2xl">{project.name}</DialogTitle>
            {project.research_area && (
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {project.research_area}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>

        <div className="space-y-6 pr-4">
          {/* Header Info */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={statusColors[project.status]}>{project.status}</Badge>
            {project.start_date && (
              <div className="flex items-center gap-1 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                Started {new Date(project.start_date).toLocaleDateString()}
              </div>
            )}
            {project.target_completion_date && (
              <div className="flex items-center gap-1 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                Due {new Date(project.target_completion_date).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Description */}
          {project.description && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-slate-600 text-sm">{project.description}</p>
            </div>
          )}

          {/* Tags */}
          {project.tags?.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {project.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" /> {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Linked Data */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Associated Data</h3>
            
            {/* Species Lists */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-bangor-red" />
                  Species Lists ({linkedLists.length})
                </CardTitle>
              </CardHeader>
              {linkedLists.length > 0 ? (
                <CardContent>
                  <ul className="space-y-2">
                    {linkedLists.map(list => (
                      <li key={list.id} className="text-sm text-slate-600 flex items-center justify-between">
                        <span>{list.name}</span>
                        <Badge variant="outline" className="text-xs">{list.species_ids?.length || 0} species</Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              ) : (
                <CardContent>
                  <p className="text-sm text-slate-500 italic">No species lists linked yet</p>
                </CardContent>
              )}
            </Card>

            {/* Climate Datasets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                  Climate Datasets ({linkedDatasets.length})
                </CardTitle>
              </CardHeader>
              {linkedDatasets.length > 0 ? (
                <CardContent>
                  <ul className="space-y-2">
                    {linkedDatasets.map(ds => (
                      <li key={ds.id} className="text-sm text-slate-600">
                        {ds.name} <span className="text-xs text-slate-400">({ds.source})</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              ) : (
                <CardContent>
                  <p className="text-sm text-slate-500 italic">No datasets linked yet</p>
                </CardContent>
              )}
            </Card>

            {/* Model Runs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600" />
                  Model Runs ({linkedRuns.length})
                </CardTitle>
              </CardHeader>
              {linkedRuns.length > 0 ? (
                <CardContent>
                  <ul className="space-y-2">
                    {linkedRuns.map(run => (
                      <li key={run.id} className="text-sm text-slate-600 flex items-center justify-between">
                        <span>{run.name}</span>
                        <Badge variant="outline" className="text-xs capitalize">{run.status}</Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              ) : (
                <CardContent>
                  <p className="text-sm text-slate-500 italic">No model runs linked yet</p>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Notes */}
          {project.notes && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Notes</h3>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">{project.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            {project.status !== 'archived' && (
              <Button 
                variant="outline" 
                onClick={handleArchive} 
                disabled={loading}
                className="text-slate-600"
              >
                <Archive className="w-4 h-4 mr-2" /> Archive
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}