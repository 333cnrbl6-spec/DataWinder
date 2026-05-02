import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProFeatureGate from '@/components/ProFeatureGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import FieldPhotoUploader from '@/components/fielddata/FieldPhotoUploader';
import OccurrencePhotoGallery from '@/components/fielddata/OccurrencePhotoGallery';

function FieldPhotoProcessorContent() {
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: occurrences = [] } = useQuery({
    queryKey: ['occurrences'],
    queryFn: () => base44.entities.Occurrence.list('-observation_date', 50),
  });

  const filteredOccurrences = occurrences.filter(occ =>
    occ.species_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedOccurrence = occurrences.find(o => o.id === selectedOccurrenceId);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Field Photo Processor</h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload field photos with automatic GPS, timestamp, and AI species identification
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Observation Selector */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Observation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search species..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredOccurrences.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">
                      No observations found
                    </p>
                  ) : (
                    filteredOccurrences.map(occ => (
                      <button
                        key={occ.id}
                        onClick={() => setSelectedOccurrenceId(occ.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedOccurrenceId === occ.id
                            ? 'border-bangor-red bg-bangor-red/5'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="font-medium text-sm text-slate-900">
                          {occ.species_name}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {occ.latitude?.toFixed(3)}, {occ.longitude?.toFixed(3)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upload & Gallery */}
          <div className="lg:col-span-2 space-y-6">
            {selectedOccurrence ? (
              <>
                <FieldPhotoUploader
                  occurrenceId={selectedOccurrenceId}
                  onPhotoAdded={() => {
                    // Refresh gallery after upload
                  }}
                />
                <OccurrencePhotoGallery occurrenceId={selectedOccurrenceId} />
              </>
            ) : (
              <Card className="bg-slate-50 border-dashed">
                <CardContent className="pt-12 pb-12 text-center">
                  <p className="text-slate-400">
                    Select an observation to upload photos
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

export default function FieldPhotoProcessor() {
  return (
    <ProFeatureGate featureName="Field Photo Processing">
      <FieldPhotoProcessorContent />
    </ProFeatureGate>
  );
}