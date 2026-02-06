import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Circle, Download, Loader2 } from 'lucide-react';
import * as turf from '@turf/turf';
import { toast } from 'sonner';

export default function BufferAnalysis({ species, onResultReady }) {
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState([]);
  const [bufferDistance, setBufferDistance] = useState(50);
  const [bufferUnit, setBufferUnit] = useState('kilometers');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const speciesWithData = species.filter(sp => 
    sp.range_data_geojson || (sp.observations?.length > 0) || (sp.gbif_occurrences?.length > 0)
  );

  const runBufferAnalysis = () => {
    setIsProcessing(true);
    try {
      const selectedSpecies = speciesWithData.filter(sp => 
        selectedSpeciesIds.includes(sp.id)
      );

      if (selectedSpecies.length === 0) {
        toast.error('Please select at least one species');
        setIsProcessing(false);
        return;
      }

      const bufferedFeatures = [];

      selectedSpecies.forEach(sp => {
        // Buffer range data if available
        if (sp.range_data_geojson) {
          try {
            const geometry = sp.range_data_geojson.type === 'FeatureCollection' 
              ? sp.range_data_geojson.features[0]?.geometry 
              : sp.range_data_geojson.geometry;
            
            if (geometry) {
              const feature = turf.feature(geometry);
              const buffered = turf.buffer(feature, bufferDistance, { units: bufferUnit });
              bufferedFeatures.push({
                type: 'Feature',
                properties: {
                  species: sp.scientific_name,
                  common_name: sp.common_name,
                  iucn_status: sp.iucn_status,
                  buffer_distance: bufferDistance,
                  buffer_unit: bufferUnit,
                  data_type: 'range'
                },
                geometry: buffered.geometry
              });
            }
          } catch (err) {
            console.error(`Error buffering range for ${sp.scientific_name}:`, err);
          }
        }

        // Buffer occurrence points
        const allPoints = [
          ...(sp.observations || []).map(obs => ({ lon: obs.longitude, lat: obs.latitude, source: 'iNaturalist' })),
          ...(sp.gbif_occurrences || []).map(occ => ({ lon: occ.longitude, lat: occ.latitude, source: 'GBIF' }))
        ];

        if (allPoints.length > 0) {
          try {
            const pointFeatures = allPoints.map(pt => 
              turf.point([pt.lon, pt.lat])
            );
            
            pointFeatures.forEach(ptFeature => {
              const buffered = turf.buffer(ptFeature, bufferDistance, { units: bufferUnit });
              bufferedFeatures.push({
                type: 'Feature',
                properties: {
                  species: sp.scientific_name,
                  common_name: sp.common_name,
                  buffer_distance: bufferDistance,
                  buffer_unit: bufferUnit,
                  data_type: 'occurrence'
                },
                geometry: buffered.geometry
              });
            });
          } catch (err) {
            console.error(`Error buffering points for ${sp.scientific_name}:`, err);
          }
        }
      });

      const resultGeoJSON = {
        type: 'FeatureCollection',
        features: bufferedFeatures
      };

      setResult(resultGeoJSON);
      if (onResultReady) {
        onResultReady(resultGeoJSON);
      }
      toast.success(`Created ${bufferedFeatures.length} buffer zones`);
    } catch (err) {
      console.error('Buffer analysis error:', err);
      toast.error('Failed to complete buffer analysis');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportResult = () => {
    if (!result) return;
    
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buffer_analysis_${bufferDistance}${bufferUnit}_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Buffer analysis exported');
  };

  return (
    <Card className="shadow-lg border-indigo-200">
      <CardHeader className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardTitle className="text-indigo-700 flex items-center gap-2">
          <Circle className="w-5 h-5" />
          Buffer Analysis
        </CardTitle>
        <CardDescription>
          Create buffer zones around species ranges or occurrence points
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Species Selection */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Select Species ({selectedSpeciesIds.length} selected)
          </label>
          <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
            {speciesWithData.map(sp => (
              <label key={sp.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSpeciesIds.includes(sp.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSpeciesIds(prev => [...prev, sp.id]);
                    } else {
                      setSelectedSpeciesIds(prev => prev.filter(id => id !== sp.id));
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">{sp.common_name || sp.scientific_name}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setSelectedSpeciesIds(speciesWithData.map(sp => sp.id))}
            >
              Select All
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setSelectedSpeciesIds([])}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Buffer Parameters */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Distance</label>
            <Input
              type="number"
              value={bufferDistance}
              onChange={(e) => setBufferDistance(Number(e.target.value))}
              min="1"
              max="1000"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Unit</label>
            <Select value={bufferUnit} onValueChange={setBufferUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kilometers">Kilometers</SelectItem>
                <SelectItem value="miles">Miles</SelectItem>
                <SelectItem value="meters">Meters</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={runBufferAnalysis}
            disabled={isProcessing || selectedSpeciesIds.length === 0}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 mr-2" />
                Run Buffer Analysis
              </>
            )}
          </Button>
          {result && (
            <Button
              onClick={exportResult}
              variant="outline"
              className="border-green-200 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-sm font-medium text-indigo-900">
              ✓ Created {result.features.length} buffer zones
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Buffer distance: {bufferDistance} {bufferUnit}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}