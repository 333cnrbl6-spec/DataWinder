import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, User, Zap } from 'lucide-react';
import { format } from 'date-fns';

export default function SharedObservations({ projectId }) {
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.get(projectId),
  });

  const { data: occurrences = [] } = useQuery({
    queryKey: ['projectObservations', projectId],
    queryFn: () => {
      if (!project?.occurrence_ids?.length) return [];
      return Promise.all(
        project.occurrence_ids.map(id => base44.entities.Occurrence.get(id))
      );
    },
    enabled: !!project?.occurrence_ids,
  });

  const threatLevelColor = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Project Observations</CardTitle>
      </CardHeader>
      <CardContent>
        {occurrences.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No observations yet. Start logging field data.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {occurrences.map(occ => (
              <div
                key={occ.id}
                className="border border-slate-200 rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">
                      {occ.species_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      by {occ.observer_name || 'Unknown'}
                    </p>
                  </div>
                  {occ.threat_level && (
                    <Badge className={threatLevelColor[occ.threat_level]}>
                      {occ.threat_level}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {occ.latitude && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3 h-3" />
                      <span>{occ.latitude.toFixed(3)}, {occ.longitude.toFixed(3)}</span>
                    </div>
                  )}
                  {occ.observation_date && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(occ.observation_date), 'MMM d, yy')}</span>
                    </div>
                  )}
                </div>

                {occ.ai_identified && (
                  <div className="mt-2 flex items-center gap-1 text-xs bg-blue-50 p-1.5 rounded">
                    <Zap className="w-3 h-3 text-blue-600" />
                    <span className="text-blue-700">
                      AI identified ({(occ.ai_confidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                )}

                {occ.notes && (
                  <p className="text-xs text-slate-600 mt-2 italic">
                    "{occ.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}