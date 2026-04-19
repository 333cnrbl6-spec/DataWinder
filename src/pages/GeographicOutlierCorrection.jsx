import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Loader2, MapPin, RefreshCw, Filter, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import OutlierCorrectionMap from '@/components/maps/OutlierCorrectionMap';

export default function GeographicOutlierCorrection() {
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [correctingOccurrence, setCorrectingOccurrence] = useState(null);
  const queryClient = useQueryClient();

  // Load species list
  const { data: speciesList = [] } = useQuery({
    queryKey: ['species-list'],
    queryFn: () => base44.entities.Species.list(),
  });

  // Run outlier detection
  const { data: outlierData, isLoading: isDetecting } = useQuery({
    queryKey: ['geographic-outliers', selectedSpecies],
    queryFn: async () => {
      const speciesIds = selectedSpecies === 'all' 
        ? null 
        : [selectedSpecies];
      const res = await base44.functions.invoke('detectGeographicOutliers', { species_ids: speciesIds });
      return res.data;
    },
    refetchOnWindowFocus: false,
  });

  // Load IUCN range data
  const { data: rangeDataList = [] } = useQuery({
    queryKey: ['iucn-ranges'],
    queryFn: () => base44.entities.IUCNRangeData.list(),
  });

  const rangeMap = useMemo(() => {
    const map = new Map();
    rangeDataList.forEach(range => {
      if (range.range_data_geojson) {
        map.set(range.species_id, range.range_data_geojson);
      }
    });
    return map;
  }, [rangeDataList]);

  // Update occurrence position mutation
  const updatePositionMutation = useMutation({
    mutationFn: async ({ occurrence_id, new_latitude, new_longitude, species_id }) => {
      const occ = await base44.entities.OccurrenceNote.get(occurrence_id);
      return base44.entities.OccurrenceNote.update(occurrence_id, {
        ...occ,
        latitude: new_latitude,
        longitude: new_longitude,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geographic-outliers'] });
      setCorrectingOccurrence(null);
      toast.success('Occurrence position updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update position: ${error.message}`);
    },
  });

  const handleUpdatePosition = ({ occurrence_id, new_latitude, new_longitude, species_id }) => {
    updatePositionMutation.mutate({
      occurrence_id,
      new_latitude,
      new_longitude,
      species_id,
    });
  };

  const handleCancelCorrection = () => {
    setCorrectingOccurrence(null);
  };

  const getRangeForSpecies = (speciesId) => {
    return rangeMap.get(speciesId) || null;
  };

  // Group outliers by species
  const outliersBySpecies = useMemo(() => {
    if (!outlierData?.outliers) return {};
    return outlierData.outliers.reduce((acc, occ) => {
      if (!acc[occ.species_id]) acc[occ.species_id] = [];
      acc[occ.species_id].push(occ);
      return acc;
    }, {});
  }, [outlierData]);

  const speciesOptions = useMemo(() => {
    const options = speciesList.map(s => ({
      id: s.id,
      name: `${s.scientific_name} (${s.common_name || 'No common name'})`,
      outlierCount: outliersBySpecies[s.id]?.length || 0,
    }));
    // Sort by outlier count (descending)
    return options.sort((a, b) => b.outlierCount - a.outlierCount);
  }, [speciesList, outliersBySpecies]);

  if (isDetecting) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-bangor-red mx-auto" />
          <p className="text-slate-600 font-medium">Detecting geographic outliers…</p>
          <p className="text-sm text-slate-400">Comparing occurrences against IUCN range polygons</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            Geographic Outlier Correction
          </h1>
          <p className="text-slate-600 mt-2">
            Automatically flagged occurrences outside IUCN known range polygons. Review and manually correct positions.
          </p>
        </div>

        {/* Summary Cards */}
        {outlierData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Checked</p>
                    <p className="text-2xl font-bold text-slate-900">{outlierData.summary.total}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Outliers Flagged</p>
                    <p className="text-2xl font-bold text-red-600">{outlierData.summary.outliers}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Within Range</p>
                    <p className="text-2xl font-bold text-green-600">{outlierData.summary.within_range}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">No Range Data</p>
                    <p className="text-2xl font-bold text-amber-600">{outlierData.summary.no_range_data}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter by Species
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select species" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Species ({outlierData?.summary.outliers || 0} outliers)</SelectItem>
                {speciesOptions
                  .filter(s => s.outlierCount > 0)
                  .map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.outlierCount} outlier{s.outlierCount !== 1 ? 's' : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Main content */}
        <Tabs defaultValue="map" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            {outlierData?.outliers && outlierData.outliers.length > 0 ? (
              <OutlierCorrectionMap
                outliers={outlierData.outliers}
                rangeData={selectedSpecies === 'all' ? null : getRangeForSpecies(selectedSpecies)}
                onUpdatePosition={handleUpdatePosition}
                onCancelCorrection={handleCancelCorrection}
                correctingOccurrence={correctingOccurrence}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-lg font-medium">No outliers detected</p>
                  <p className="text-sm mt-1">
                    {selectedSpecies === 'all' 
                      ? 'All occurrences are within their known IUCN ranges' 
                      : 'No outliers for this species'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Outlier Details</CardTitle>
              </CardHeader>
              <CardContent>
                {outlierData?.outliers && outlierData.outliers.length > 0 ? (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {outlierData.outliers.map((occ, idx) => (
                      <div
                        key={occ.id}
                        className="flex items-start justify-between gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 italic truncate">
                            {occ.species_name || 'Unknown Species'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>{occ.latitude?.toFixed(5)}, {occ.longitude?.toFixed(5)}</span>
                            {occ.source && <span>· {occ.source}</span>}
                            {occ.occurrence_date && <span>· {occ.occurrence_date}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {occ.outlier_reason === 'missing_coordinates' ? 'Missing Coords' : 'Outside Range'}
                            </Badge>
                            <span className="text-xs text-slate-600">{occ.message}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCorrectingOccurrence(occ)}
                          className="shrink-0"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          Correct
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p>No outliers to display</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info note */}
        {!outlierData && (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-lg font-medium">No occurrence data loaded</p>
              <p className="text-sm mt-1">Import or add occurrence records to detect geographic outliers</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}