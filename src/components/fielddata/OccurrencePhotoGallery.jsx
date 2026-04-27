import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function OccurrencePhotoGallery({ occurrenceId }) {
  const { data: attachments = [] } = useQuery({
    queryKey: ['occurrencePhotos', occurrenceId],
    queryFn: () =>
      base44.entities.OccurrenceImageAttachment.filter({
        occurrence_id: occurrenceId,
      }),
  });

  if (attachments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Attached Photos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachments.map(attachment => (
            <div
              key={attachment.id}
              className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Image */}
              <div className="aspect-square bg-slate-100 overflow-hidden">
                <img
                  src={attachment.image_url}
                  alt="Observation photo"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                {/* Species */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3 h-3 text-amber-600" />
                    <span className="text-xs font-medium text-slate-600">
                      AI Identified
                    </span>
                    {attachment.manual_verified && (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-900">
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

                {/* GPS & Timestamp */}
                <div className="space-y-1 text-xs">
                  {attachment.extracted_latitude && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {attachment.extracted_latitude.toFixed(4)}, 
                        {attachment.extracted_longitude.toFixed(4)}
                      </span>
                    </div>
                  )}
                  {attachment.extracted_timestamp && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(new Date(attachment.extracted_timestamp), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Verification Status */}
                {attachment.manual_verified && (
                  <div className="bg-green-50 border border-green-200 rounded p-1.5 text-center">
                    <p className="text-xs text-green-700 font-medium">
                      ✓ Verified
                    </p>
                    {attachment.verified_by && (
                      <p className="text-xs text-green-600">
                        by {attachment.verified_by}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}