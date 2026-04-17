import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SpeciesOccurrenceMap from '@/components/maps/SpeciesOccurrenceMap';
import SpeciesRangeMap from '@/components/maps/SpeciesRangeMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function SpeciesMapViewer() {
  const [species, setSpecies] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeData, setRangeData] = useState(null);

  useEffect(() => {
    loadSpecies();
  }, []);

  const loadSpecies = async () => {
    try {
      const data = await base44.entities.Species.list();
      setSpecies(data);
      if (data.length > 0) setSelectedSpecies(data[0]);
    } catch (error) {
      toast.error('Failed to load species');
    } finally {
      setLoading(false);
    }
  };

  const loadRangeData = async (speciesId) => {
    try {
      const ranges = await base44.entities.IUCNRangeData.list();
      const range = ranges.find(r => r.species_id === speciesId);
      if (range && range.range_data_geojson) {
        setRangeData(range.range_data_geojson);
      } else {
        setRangeData(null);
      }
    } catch (error) {
      setRangeData(null);
    }
  };

  useEffect(() => {
    if (selectedSpecies) {
      loadRangeData(selectedSpecies.id);
    }
  }, [selectedSpecies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const observations = [
    ...(selectedSpecies?.observations || []),
    ...(selectedSpecies?.gbif_occurrences || []),
    ...(selectedSpecies?.specieslink_occurrences || [])
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Species Map Viewer</h1>
          <p className="text-slate-600 mt-1">Interactive distribution and occurrence visualizations</p>
        </div>

        {/* Species Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Species</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedSpecies?.id || ''}
              onChange={(e) => {
                const sp = species.find(s => s.id === e.target.value);
                setSelectedSpecies(sp);
              }}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {species.map(s => (
                <option key={s.id} value={s.id}>
                  {s.scientific_name} ({s.common_name || 'No common name'}) - {s.iucn_status}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Species Info */}
        {selectedSpecies && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedSpecies.scientific_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Common Name</p>
                  <p className="font-semibold text-slate-900">{selectedSpecies.common_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500">IUCN Status</p>
                  <p className="font-semibold text-slate-900">{selectedSpecies.iucn_status}</p>
                </div>
                <div>
                  <p className="text-slate-500">Population Trend</p>
                  <p className="font-semibold text-slate-900">{selectedSpecies.population_trend || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Observations</p>
                  <p className="font-semibold text-slate-900">{observations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Maps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {selectedSpecies && (
            <>
              <SpeciesOccurrenceMap
                species={selectedSpecies}
                observations={observations}
              />
              <SpeciesRangeMap
                species={selectedSpecies}
                rangeGeoJSON={rangeData}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}