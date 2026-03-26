import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Layers, Download, MapPin, AlertCircle } from 'lucide-react';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';

const BASEMAPS = [
  { id: 'satellite', label: '🛰 Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
  { id: 'light', label: '🗺 Light', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}' },
  { id: 'topo', label: '🏔 Topo', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}' },
];

export default function TwoSpeciesOverlay({ species = [] }) {
  const [species1Id, setSpecies1Id] = useState('');
  const [species2Id, setSpecies2Id] = useState('');
  const [basemap, setBasemap] = useState('satellite');
  const [showAnalysis, setShowAnalysis] = useState(false);

  const speciesWithRange = useMemo(() => {
    return species.filter(sp => sp.range_data_geojson);
  }, [species]);

  const selectedSpecies1 = useMemo(() => {
    return speciesWithRange.find(sp => sp.id === species1Id);
  }, [species1Id, speciesWithRange]);

  const selectedSpecies2 = useMemo(() => {
    return speciesWithRange.find(sp => sp.id === species2Id);
  }, [species2Id, speciesWithRange]);

  // Calculate intersection area
  const analysisResults = useMemo(() => {
    if (!selectedSpecies1 || !selectedSpecies2 || !showAnalysis) {
      return null;
    }

    try {
      const geom1 = selectedSpecies1.range_data_geojson;
      const geom2 = selectedSpecies2.range_data_geojson;

      if (!geom1 || !geom2) return null;

      // Convert to FeatureCollections if needed
      const feature1 = geom1.type === 'FeatureCollection' 
        ? geom1.features[0] 
        : { type: 'Feature', geometry: geom1, properties: {} };
      
      const feature2 = geom2.type === 'FeatureCollection' 
        ? geom2.features[0] 
        : { type: 'Feature', geometry: geom2, properties: {} };

      if (!feature1?.geometry || !feature2?.geometry) return null;

      // Calculate intersection
      let intersection = null;
      try {
        intersection = turf.intersect(feature1, feature2);
      } catch (e) {
        console.log('Intersection calculation failed:', e);
        return null;
      }

      if (!intersection) {
        return {
          intersectionArea: 0,
          intersectionGeometry: null,
          species1Area: selectedSpecies1.area_km2 || 0,
          species2Area: selectedSpecies2.area_km2 || 0,
          overlapPercentage1: 0,
          overlapPercentage2: 0,
          hasIntersection: false
        };
      }

      // Calculate areas
      const intersectionArea = turf.area(intersection.geometry) / 1e6; // Convert to km²
      const species1Area = selectedSpecies1.area_km2 || turf.area(feature1) / 1e6;
      const species2Area = selectedSpecies2.area_km2 || turf.area(feature2) / 1e6;

      const overlapPercentage1 = species1Area > 0 ? (intersectionArea / species1Area) * 100 : 0;
      const overlapPercentage2 = species2Area > 0 ? (intersectionArea / species2Area) * 100 : 0;

      return {
        intersectionArea,
        intersectionGeometry: intersection,
        species1Area,
        species2Area,
        overlapPercentage1,
        overlapPercentage2,
        hasIntersection: intersectionArea > 0
      };
    } catch (error) {
      console.error('Analysis error:', error);
      return null;
    }
  }, [selectedSpecies1, selectedSpecies2, showAnalysis]);

  const handleExportOverlay = () => {
    if (!analysisResults?.intersectionGeometry) {
      alert('No intersection to export');
      return;
    }

    const geojson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          name: `${selectedSpecies1.scientific_name} ∩ ${selectedSpecies2.scientific_name}`,
          area_km2: analysisResults.intersectionArea,
          species1: selectedSpecies1.scientific_name,
          species2: selectedSpecies2.scientific_name
        },
        geometry: analysisResults.intersectionGeometry?.geometry || analysisResults.intersectionGeometry
      }]
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `species_overlap_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-lg border-blue-200">
        <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-blue-700 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Two-Species Range Overlay
          </CardTitle>
          <CardDescription>
            Compare and analyze the habitat overlap between two species
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {speciesWithRange.length < 2 && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                At least 2 species with range data are required for this analysis
              </AlertDescription>
            </Alert>
          )}

          {/* Species selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Species 1</label>
              <Select value={species1Id} onValueChange={setSpecies1Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first species" />
                </SelectTrigger>
                <SelectContent>
                  {speciesWithRange.map(sp => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.scientific_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Species 2</label>
              <Select value={species2Id} onValueChange={setSpecies2Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second species" />
                </SelectTrigger>
                <SelectContent>
                  {speciesWithRange.map(sp => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.scientific_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedSpecies1 && selectedSpecies2 && (
            <Button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {showAnalysis ? 'Hide Analysis' : 'Calculate Overlap'}
            </Button>
          )}

          {/* Analysis results */}
          {showAnalysis && analysisResults && (
            <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded border-l-4 border-red-500">
                  <p className="text-xs text-slate-600">{selectedSpecies1.scientific_name}</p>
                  <p className="text-lg font-bold text-red-600">{analysisResults.species1Area.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
                  <p className="text-xs text-slate-500">km²</p>
                </div>

                <div className="bg-white p-3 rounded border-l-4 border-blue-500">
                  <p className="text-xs text-slate-600">{selectedSpecies2.scientific_name}</p>
                  <p className="text-lg font-bold text-blue-600">{analysisResults.species2Area.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
                  <p className="text-xs text-slate-500">km²</p>
                </div>
              </div>

              {analysisResults.hasIntersection ? (
                <>
                  <div className="bg-white p-3 rounded border-2 border-purple-300 bg-purple-50">
                    <p className="text-sm font-semibold text-purple-900">Total Overlap Area</p>
                    <p className="text-2xl font-bold text-purple-600">{analysisResults.intersectionArea.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {analysisResults.overlapPercentage1.toFixed(1)}% of {selectedSpecies1.scientific_name} · {analysisResults.overlapPercentage2.toFixed(1)}% of {selectedSpecies2.scientific_name}
                    </p>
                  </div>

                  <Button
                    onClick={handleExportOverlay}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Overlap as GeoJSON
                  </Button>
                </>
              ) : (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    These species have no range overlap
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map visualization */}
      {showAnalysis && selectedSpecies1 && selectedSpecies2 && analysisResults && (
        <Card className="shadow-lg border-blue-200">
          <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-blue-700 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Overlay Visualization
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 m-3 w-fit">
              <Layers className="w-3.5 h-3.5 text-slate-500 ml-1 mr-0.5" />
              {BASEMAPS.map(bm => (
                <button
                  key={bm.id}
                  onClick={() => setBasemap(bm.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    basemap === bm.id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {bm.label}
                </button>
              ))}
            </div>

            <MapContainer 
              center={[20, 0]} 
              zoom={2} 
              style={{ height: '500px', width: '100%' }}
              className="rounded-b-xl"
            >
              <TileLayer 
                url={BASEMAPS.find(b => b.id === basemap)?.url || BASEMAPS[0].url}
                attribution="&copy; Esri"
              />

              {/* Species 1 range */}
              <GeoJSON 
                data={selectedSpecies1.range_data_geojson}
                style={{
                  color: '#ef4444',
                  weight: 2,
                  opacity: 0.5,
                  fillOpacity: 0.15
                }}
              />

              {/* Species 2 range */}
              <GeoJSON 
                data={selectedSpecies2.range_data_geojson}
                style={{
                  color: '#3b82f6',
                  weight: 2,
                  opacity: 0.5,
                  fillOpacity: 0.15
                }}
              />

              {/* Intersection overlay */}
              {analysisResults.intersectionGeometry && (
                <GeoJSON 
                  data={analysisResults.intersectionGeometry}
                  style={{
                    color: '#a855f7',
                    weight: 3,
                    opacity: 0.8,
                    fillOpacity: 0.4
                  }}
                />
              )}
            </MapContainer>

            <div className="p-3 bg-slate-50 border-t flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>{selectedSpecies1.scientific_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>{selectedSpecies2.scientific_name}</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span className="font-semibold">Overlap Zone</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}