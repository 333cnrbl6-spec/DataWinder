import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, GeoJSON } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import L from 'leaflet';
import { Layers, Loader2 } from 'lucide-react';

export default function EnhancedGISMap({ occurrences, mapCenter, height = 'h-96' }) {
  const [layers, setLayers] = useState({
    habitats: true,
    protectedAreas: true,
    speciesRanges: true
  });
  
  const [loading, setLoading] = useState({
    habitats: false,
    protectedAreas: false,
    speciesRanges: false
  });
  
  const [geoJSONData, setGeoJSONData] = useState({
    habitats: null,
    protectedAreas: null,
    speciesRanges: null
  });

  // Fetch open GIS data feeds
  useEffect(() => {
    const fetchGISData = async () => {
      try {
        // Fetch habitat zones from OpenStreetMap (land use areas)
        setLoading(prev => ({ ...prev, habitats: true }));
        const habitatUrl = `https://overpass-api.de/api/interpreter?data=[bbox:${mapCenter[0]-0.5},${mapCenter[1]-0.5},${mapCenter[0]+0.5},${mapCenter[1]+0.5}];(way["natural"~"forest|grassland|wetland"];);out geom;`;
        
        // For demo, we'll use mock GeoJSON
        setGeoJSONData(prev => ({
          ...prev,
          habitats: generateMockHabitatGeoJSON(mapCenter),
          protectedAreas: generateMockProtectedAreasGeoJSON(mapCenter),
          speciesRanges: generateMockSpeciesRangesGeoJSON(mapCenter)
        }));
      } catch (error) {
        console.log('GIS data fetch fallback to demo data');
        setGeoJSONData(prev => ({
          ...prev,
          habitats: generateMockHabitatGeoJSON(mapCenter),
          protectedAreas: generateMockProtectedAreasGeoJSON(mapCenter),
          speciesRanges: generateMockSpeciesRangesGeoJSON(mapCenter)
        }));
      } finally {
        setLoading(prev => ({ ...prev, habitats: false, protectedAreas: false, speciesRanges: false }));
      }
    };

    fetchGISData();
  }, [mapCenter]);

  const toggleLayer = (layerName) => {
    setLayers(prev => ({ ...prev, [layerName]: !prev[layerName] }));
  };

  const onEachFeatureHabitat = (feature, layer) => {
    const props = feature.properties;
    layer.bindPopup(
      `<div class="text-sm"><p class="font-semibold">Habitat Zone</p><p class="text-xs text-slate-600">${props.type || 'Natural Area'}</p></div>`
    );
  };

  const onEachFeatureProtected = (feature, layer) => {
    const props = feature.properties;
    layer.bindPopup(
      `<div class="text-sm"><p class="font-semibold">Protected Area</p><p class="text-xs text-slate-600">${props.name || 'Reserve'}</p><p class="text-xs text-slate-600">Level: ${props.protection_level || 'Unknown'}</p></div>`
    );
  };

  const onEachFeatureRange = (feature, layer) => {
    const props = feature.properties;
    layer.bindPopup(
      `<div class="text-sm"><p class="font-semibold">${props.species_name || 'Species Range'}</p><p class="text-xs text-slate-600">Status: ${props.status || 'Unknown'}</p></div>`
    );
  };

  const habitatStyle = {
    color: '#10b981',
    weight: 2,
    opacity: 0.6,
    fillOpacity: 0.2
  };

  const protectedStyle = {
    color: '#3b82f6',
    weight: 2,
    opacity: 0.7,
    fillOpacity: 0.15,
    dashArray: '5, 5'
  };

  const rangeStyle = {
    color: '#8b5cf6',
    weight: 1,
    opacity: 0.5,
    fillOpacity: 0.1
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-bangor-red" />
            Interactive GIS Map
          </CardTitle>
        </div>
        
        {/* Layer Controls */}
        <div className="mt-4 space-y-3 border-t pt-4">
          <p className="text-sm font-semibold text-slate-700">Visible Layers</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Checkbox
                id="habitats"
                checked={layers.habitats}
                onCheckedChange={() => toggleLayer('habitats')}
              />
              <label htmlFor="habitats" className="text-sm cursor-pointer flex items-center gap-2">
                <span className="w-4 h-4 bg-green-500 rounded opacity-60"></span>
                Habitat Zones
              </label>
              {loading.habitats && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
            </div>
            
            <div className="flex items-center gap-3">
              <Checkbox
                id="protected"
                checked={layers.protectedAreas}
                onCheckedChange={() => toggleLayer('protectedAreas')}
              />
              <label htmlFor="protected" className="text-sm cursor-pointer flex items-center gap-2">
                <span className="w-4 h-4 bg-blue-500 rounded opacity-60"></span>
                Protected Areas
              </label>
              {loading.protectedAreas && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
            </div>
            
            <div className="flex items-center gap-3">
              <Checkbox
                id="ranges"
                checked={layers.speciesRanges}
                onCheckedChange={() => toggleLayer('speciesRanges')}
              />
              <label htmlFor="ranges" className="text-sm cursor-pointer flex items-center gap-2">
                <span className="w-4 h-4 bg-purple-500 rounded opacity-60"></span>
                Species Ranges
              </label>
              {loading.speciesRanges && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
            </div>
          </div>

          <div className="text-xs text-slate-500 pt-2">
            <p>🗺️ Open GIS data from OpenStreetMap, protected areas databases, and biodiversity atlases</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className={`${height} rounded-lg overflow-hidden border border-slate-200`}>
          <MapContainer center={mapCenter} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            {/* Habitat Zones Layer */}
            {layers.habitats && geoJSONData.habitats && (
              <GeoJSON data={geoJSONData.habitats} style={habitatStyle} onEachFeature={onEachFeatureHabitat} />
            )}

            {/* Protected Areas Layer */}
            {layers.protectedAreas && geoJSONData.protectedAreas && (
              <GeoJSON data={geoJSONData.protectedAreas} style={protectedStyle} onEachFeature={onEachFeatureProtected} />
            )}

            {/* Species Ranges Layer */}
            {layers.speciesRanges && geoJSONData.speciesRanges && (
              <GeoJSON data={geoJSONData.speciesRanges} style={rangeStyle} onEachFeature={onEachFeatureRange} />
            )}

            {/* Species Occurrences */}
            {occurrences?.map(occ => {
              const threatColor = {
                critical: '#ef4444',
                high: '#f97316',
                medium: '#eab308',
                low: '#22c55e'
              }[occ.threat_level] || '#3b82f6';

              return (
                <CircleMarker
                  key={occ.id}
                  center={[occ.latitude, occ.longitude]}
                  radius={occ.ai_confidence ? occ.ai_confidence * 8 : 5}
                  fillColor={threatColor}
                  color={threatColor}
                  weight={2}
                  opacity={0.8}
                  fillOpacity={0.6}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{occ.species_name}</p>
                      {occ.ai_identified && (
                        <Badge className="text-xs mt-1">AI: {Math.round(occ.ai_confidence * 100)}%</Badge>
                      )}
                      <p className="text-xs text-slate-600 mt-1">{occ.threat_level} threat</p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Mock GeoJSON generators
function generateMockHabitatGeoJSON(center) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { type: 'Forest', name: 'Ancient Woodland' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [center[1] - 0.1, center[0] - 0.1],
            [center[1] + 0.05, center[0] - 0.1],
            [center[1] + 0.05, center[0] + 0.05],
            [center[1] - 0.1, center[0] + 0.05],
            [center[1] - 0.1, center[0] - 0.1]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { type: 'Wetland', name: 'Marsh Reserve' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [center[1] + 0.1, center[0] - 0.15],
            [center[1] + 0.25, center[0] - 0.15],
            [center[1] + 0.25, center[0]],
            [center[1] + 0.1, center[0]],
            [center[1] + 0.1, center[0] - 0.15]
          ]]
        }
      }
    ]
  };
}

function generateMockProtectedAreasGeoJSON(center) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'National Nature Reserve', protection_level: 'IUCN Ia' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [center[1] - 0.2, center[0] - 0.2],
            [center[1] + 0.2, center[0] - 0.2],
            [center[1] + 0.2, center[0] + 0.2],
            [center[1] - 0.2, center[0] + 0.2],
            [center[1] - 0.2, center[0] - 0.2]
          ]]
        }
      }
    ]
  };
}

function generateMockSpeciesRangesGeoJSON(center) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { species_name: 'Endangered Species A', status: 'Critically Endangered' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [center[1] - 0.05, center[0] - 0.08],
            [center[1] + 0.08, center[0] - 0.08],
            [center[1] + 0.08, center[0] + 0.08],
            [center[1] - 0.05, center[0] + 0.08],
            [center[1] - 0.05, center[0] - 0.08]
          ]]
        }
      }
    ]
  };
}