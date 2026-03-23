import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function PendingUpdatesReview({ open, onClose }) {
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const queryClient = useQueryClient();

  const { data: pendingUpdates = [] } = useQuery({
    queryKey: ['pendingUpdates'],
    queryFn: () => base44.entities.PendingSpeciesUpdate.filter({ status: 'pending' }, '-created_date'),
    enabled: open
  });

  const acceptMutation = useMutation({
    mutationFn: async (update) => {
      await base44.entities.Species.update(update.species_id, update.new_data);
      await base44.entities.PendingSpeciesUpdate.update(update.id, { status: 'accepted' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUpdates'] });
      queryClient.invalidateQueries({ queryKey: ['allSpecies'] });
      setSelectedUpdate(null);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (updateId) => base44.entities.PendingSpeciesUpdate.update(updateId, { status: 'rejected' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUpdates'] });
      setSelectedUpdate(null);
    }
  });

  const acceptAllMutation = useMutation({
    mutationFn: async () => {
      for (const update of pendingUpdates) {
        await base44.entities.Species.update(update.species_id, update.new_data);
        await base44.entities.PendingSpeciesUpdate.update(update.id, { status: 'accepted' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUpdates'] });
      queryClient.invalidateQueries({ queryKey: ['allSpecies'] });
    }
  });

  const fieldLabels = {
    common_name: 'Common Name',
    kingdom: 'Kingdom',
    phylum: 'Phylum',
    class_name: 'Class',
    order_name: 'Order',
    family: 'Family',
    genus: 'Genus',
    iucn_status: 'IUCN Status',
    population_trend: 'Population Trend',
    population_details: 'Population Details',
    habitat: 'Habitat',
    range_description: 'Range Description',
    threats: 'Threats',
    conservation_actions: 'Conservation Actions',
    assessment_date: 'Assessment Date',
    image_url: 'Image URL',
    observation_count: 'Observation Count',
    last_observed: 'Last Observed'
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Review Pending Updates ({pendingUpdates.length})
          </DialogTitle>
          <p className="text-sm text-slate-600">Review and approve changes to existing species records</p>
        </DialogHeader>

        {pendingUpdates.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p>No pending updates to review</p>
          </div>
        ) : (
          <>
            {pendingUpdates.length > 1 && (
              <div className="flex justify-end">
                <Button
                  onClick={() => acceptAllMutation.mutate()}
                  disabled={acceptAllMutation.isPending || acceptMutation.isPending || rejectMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {acceptAllMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {acceptAllMutation.isPending ? 'Saving all…' : `Accept All ${pendingUpdates.length} Updates`}
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3">
              {pendingUpdates.map((update) => (
                <Card key={update.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">{update.scientific_name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {update.data_source}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {new Date(update.created_date).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Show field changes */}
                      <div className="space-y-2">
                        {Object.entries(update.new_data).map(([field, newValue]) => {
                          const currentValue = update.current_data?.[field];
                          const label = fieldLabels[field] || field;

                          // Skip complex objects in preview
                          if (typeof newValue === 'object' && !Array.isArray(newValue)) {
                            return null;
                          }

                          const displayNew = Array.isArray(newValue) ? JSON.stringify(newValue) : String(newValue || '—');
                          const displayCurrent = Array.isArray(currentValue) ? JSON.stringify(currentValue) : String(currentValue || '—');

                          return (
                            <div key={field} className="text-xs bg-slate-50 rounded p-2">
                              <div className="font-medium text-slate-700 mb-1">{label}</div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 line-through max-w-[200px] truncate">
                                  {displayCurrent}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="text-green-700 font-medium max-w-[200px] truncate">
                                  {displayNew}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptMutation.mutate(update)}
                        disabled={acceptMutation.isPending || rejectMutation.isPending || acceptAllMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                        title="Accept"
                      >
                        {acceptMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(update.id)}
                        disabled={rejectMutation.isPending || acceptMutation.isPending || acceptAllMutation.isPending}
                        title="Reject"
                      >
                        {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}