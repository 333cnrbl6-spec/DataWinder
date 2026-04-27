import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function SharedMediaGallery({ projectId }) {
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.get(projectId),
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['projectMedia', projectId],
    queryFn: async () => {
      if (!project?.occurrence_ids?.length) return [];
      
      // Fetch all image attachments across project occurrences
      const allAttachments = [];
      for (const occId of project.occurrence_ids) {
        const atts = await base44.entities.OccurrenceImageAttachment.filter({
          occurrence_id: occId,
        });
        allAttachments.push(...atts);
      }
      return allAttachments;
    },
    enabled: !!project?.occurrence_ids,
  });

  if (attachments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Project Media Gallery
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachments.map(attachment => (
            <div
              key={attachment.id}
              className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Image */}
              <div className="aspect-square bg-slate-100 overflow-hidden relative group">
                <img
                  src={attachment.image_url}
                  alt={attachment.ai_identified_species}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                {attachment.manual_verified && (
                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <div>
                  <p className="font-semibold text-sm text-slate-900">
                    {attachment.verified_species || attachment.ai_identified_species}
                  </p>
                  {!attachment.manual_verified && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${attachment.ai_confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {(attachment.ai_confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  {attachment.extracted_latitude && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3 h-3" />
                      <span>{attachment.extracted_latitude.toFixed(3)}, {attachment.extracted_longitude.toFixed(3)}</span>
                    </div>
                  )}
                  {attachment.extracted_timestamp && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(attachment.extracted_timestamp), 'MMM d, HH:mm')}</span>
                    </div>
                  )}
                </div>

                {attachment.uploaded_by_name && (
                  <p className="text-xs text-slate-500">
                    Uploaded by {attachment.uploaded_by_name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}