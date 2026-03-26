import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, Download, Loader2, AlertTriangle } from 'lucide-react';
import * as turf from '@turf/turf';
import { toast } from 'sonner';
import RangeOverlayBackendExtractor from '@/components/RangeOverlayBackendExtractor';

export default function RangeOverlayAnalysis({ species, onResultReady }) {
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overlaps, setOverlaps] = useState(null);

  const speciesWithRanges = species.filter(sp => sp.range_data_geojson);

  const runOverlayAnalysis = () => {
    setIsProcessing(true);
    try {
      const selectedSpecies = speciesWithRanges.filter(sp => 
        selectedSpeciesIds.includes(sp.id)
      );

      if (selectedSpecies.length < 2) {
        toast.error('Please select at least 2 species to find overlaps');
        setIsProcessing(false);
        return;
      }

      const overlapResults = [];
      
      // Compare each pair of species
      for (let i = 0; i < selectedSpecies.length; i++) {
        for (let j = i + 1; j < selectedSpecies.length; j++) {
          const sp1 = selectedSpecies[i];
          const sp2 = selectedSpecies[j];

          try {
            const geom1 = sp1.range_data_geojson.type === 'FeatureCollection' 
              ? sp1.range_data_geojson.features[0]?.geometry 
              : sp1.range_data_geojson.geometry;
            
            const geom2 = sp2.range_data_geojson.type === 'FeatureCollection' 
              ? sp2.range_data_geojson.features[0]?.geometry 
              : sp2.range_data_geojson.geometry;

            if (geom1 && geom2) {
              const feature1 = turf.feature(geom1);
              const feature2 = turf.feature(geom2);

              // Calculate intersection
              const intersection = turf.intersect(
                turf.featureCollection([feature1, feature2])
              );

              if (intersection) {
                const area = turf.area(intersection) / 1000000; // Convert to km²
                
                overlapResults.push({
                  type: 'Feature',
                  properties: {
                    species_1: sp1.scientific_name,
                    species_2: sp2.scientific_name,
                    common_name_1: sp1.common_name,
                    common_name_2: sp2.common_name,
                    status_1: sp1.iucn_status,
                    status_2: sp2.iucn_status,
                    overlap_area_km2: Math.round(area),
                    analysis_type: 'range_overlap'
                  },
                  geometry: intersection.geometry
                });
              }
            }
          } catch (err) {
            console.error(`Error calculating overlap between ${sp1.scientific_name} and ${sp2.scientific_name}:`, err);
          }
        }
      }

      const resultGeoJSON = {
        type: 'FeatureCollection',
        features: overlapResults
      };

      setOverlaps(resultGeoJSON);
      if (onResultReady) {
        onResultReady(resultGeoJSON);
      }
      
      if (overlapResults.length > 0) {
        toast.success(`Found ${overlapResults.length} overlapping regions`);
      } else {
        toast.warning('No overlapping ranges found');
      }
    } catch (err) {
      console.error('Overlay analysis error:', err);
      toast.error('Failed to complete overlay analysis');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportResult = () => {
    if (!overlaps) return;
    
    const blob = new Blob([JSON.stringify(overlaps, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `range_overlaps_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Overlap analysis exported');
  };

  return (
    <Card className="shadow-lg border-purple-200">
      <CardHeader className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardTitle className="text-purple-700 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Range Overlay Analysis
        </CardTitle>
        <CardDescription>
          Identify overlapping areas between species ranges
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Backend Extraction */}
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Backend Processing</p>
          <RangeOverlayBackendExtractor
            species={species}
            onResultReady={onResultReady}
          />
        </div>

        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Frontend Analysis</p>
        </div>

        {/* Species Selection */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Select Species to Compare ({selectedSpeciesIds.length} selected)
          </label>
          <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
            {speciesWithRanges.map(sp => (
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
              onClick={() => setSelectedSpeciesIds(speciesWithRanges.map(sp => sp.id))}
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

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={runOverlayAnalysis}
            disabled={isProcessing || selectedSpeciesIds.length < 2}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Layers className="w-4 h-4 mr-2" />
                Find Overlaps
              </>
            )}
          </Button>
          {overlaps && (
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
        {overlaps && (
          <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm font-medium text-purple-900">
              {overlaps.features.length > 0 ? (
                <>✓ Found {overlaps.features.length} overlapping regions</>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  No overlaps detected
                </>
              )}
            </p>
            {overlaps.features.length > 0 && (
              <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                {overlaps.features.slice(0, 10).map((feature, idx) => (
                  <div key={idx} className="text-xs text-slate-700 bg-white p-2 rounded">
                    <span className="font-medium">{feature.properties.species_1}</span> ⊗{' '}
                    <span className="font-medium">{feature.properties.species_2}</span>
                    {feature.properties.overlap_area_km2 && (
                      <span className="text-slate-500"> · {feature.properties.overlap_area_km2.toLocaleString()} km²</span>
                    )}
                  </div>
                ))}
                {overlaps.features.length > 10 && (
                  <p className="text-xs text-slate-500 italic">...and {overlaps.features.length - 10} more</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}