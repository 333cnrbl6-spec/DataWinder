import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Download, Loader2, Upload } from 'lucide-react';
import * as turf from '@turf/turf';
import { toast } from 'sonner';

export default function SpatialJoinAnalysis({ species, onResultReady }) {
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState([]);
  const [environmentalLayer, setEnvironmentalLayer] = useState(null);
  const [layerName, setLayerName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const speciesWithData = species.filter(sp => 
    sp.range_data_geojson || (sp.observations?.length > 0) || (sp.gbif_occurrences?.length > 0)
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const geojson = JSON.parse(text);
      
      if (geojson.type !== 'FeatureCollection' && geojson.type !== 'Feature') {
        toast.error('Invalid GeoJSON file');
        return;
      }

      setEnvironmentalLayer(geojson);
      setLayerName(file.name.replace('.geojson', '').replace('.json', ''));
      toast.success('Environmental layer loaded');
    } catch (err) {
      console.error('Error loading file:', err);
      toast.error('Failed to load environmental layer');
    }
  };

  const runSpatialJoin = () => {
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

      if (!environmentalLayer) {
        toast.error('Please upload an environmental layer');
        setIsProcessing(false);
        return;
      }

      const joinedFeatures = [];
      const envFeatures = environmentalLayer.type === 'FeatureCollection' 
        ? environmentalLayer.features 
        : [environmentalLayer];

      selectedSpecies.forEach(sp => {
        // Handle range data
        if (sp.range_data_geojson) {
          const geometry = sp.range_data_geojson.type === 'FeatureCollection' 
            ? sp.range_data_geojson.features[0]?.geometry 
            : sp.range_data_geojson.geometry;
          
          if (geometry) {
            const rangeFeature = turf.feature(geometry);
            
            // Find all environmental features that intersect with this range
            envFeatures.forEach(envFeature => {
              try {
                const intersects = turf.booleanIntersects(rangeFeature, envFeature);
                if (intersects) {
                  const intersection = turf.intersect(
                    turf.featureCollection([rangeFeature, envFeature])
                  );
                  
                  if (intersection) {
                    const area = turf.area(intersection) / 1000000; // km²
                    joinedFeatures.push({
                      type: 'Feature',
                      properties: {
                        species: sp.scientific_name,
                        common_name: sp.common_name,
                        iucn_status: sp.iucn_status,
                        environmental_layer: layerName,
                        intersection_area_km2: Math.round(area),
                        ...envFeature.properties
                      },
                      geometry: intersection.geometry
                    });
                  }
                }
              } catch (err) {
                console.error('Error in spatial join:', err);
              }
            });
          }
        }

        // Handle occurrence points
        const allPoints = [
          ...(sp.observations || []).map(obs => ({ lon: obs.longitude, lat: obs.latitude, source: 'iNaturalist' })),
          ...(sp.gbif_occurrences || []).map(occ => ({ lon: occ.longitude, lat: occ.latitude, source: 'GBIF' }))
        ];

        allPoints.forEach(pt => {
          const point = turf.point([pt.lon, pt.lat]);
          
          // Find which environmental feature contains this point
          envFeatures.forEach(envFeature => {
            try {
              const contains = turf.booleanPointInPolygon(point, envFeature);
              if (contains) {
                joinedFeatures.push({
                  type: 'Feature',
                  properties: {
                    species: sp.scientific_name,
                    common_name: sp.common_name,
                    source: pt.source,
                    environmental_layer: layerName,
                    data_type: 'occurrence_point',
                    ...envFeature.properties
                  },
                  geometry: point.geometry
                });
              }
            } catch (err) {
              console.error('Error checking point containment:', err);
            }
          });
        });
      });

      const resultGeoJSON = {
        type: 'FeatureCollection',
        features: joinedFeatures
      };

      setResult(resultGeoJSON);
      if (onResultReady) {
        onResultReady(resultGeoJSON);
      }
      
      if (joinedFeatures.length > 0) {
        toast.success(`Found ${joinedFeatures.length} spatial associations`);
      } else {
        toast.warning('No spatial associations found');
      }
    } catch (err) {
      console.error('Spatial join error:', err);
      toast.error('Failed to complete spatial join');
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
    a.download = `spatial_join_${layerName}_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Spatial join results exported');
  };

  return (
    <Card className="shadow-lg border-emerald-200">
      <CardHeader className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardTitle className="text-emerald-700 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Spatial Join Analysis
        </CardTitle>
        <CardDescription>
          Associate species with environmental or climate layers
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Environmental Layer Upload */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Environmental Layer (GeoJSON)
          </label>
          <div className="flex gap-2">
            <Input
              type="file"
              accept=".geojson,.json"
              onChange={handleFileUpload}
              className="flex-1"
            />
            {environmentalLayer && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-medium">{layerName}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Upload climate zones, habitat types, protected areas, or other environmental data
          </p>
        </div>

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

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={runSpatialJoin}
            disabled={isProcessing || selectedSpeciesIds.length === 0 || !environmentalLayer}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Run Spatial Join
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
          <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="text-sm font-medium text-emerald-900">
              {result.features.length > 0 ? (
                <>✓ Found {result.features.length} spatial associations</>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  No associations found
                </>
              )}
            </p>
            {result.features.length > 0 && (
              <div className="mt-2 text-xs text-slate-600">
                {result.features.filter(f => f.properties.data_type === 'occurrence_point').length} occurrence points matched
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}