import React from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import L from 'leaflet';

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function SpeciesRangeMap({ species, rangeGeoJSON }) {
  if (!rangeGeoJSON) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Species Range</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No range data available</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate bounds from GeoJSON
  let center = [20, 0];
  let zoom = 2;

  const onEachFeature = (feature, layer) => {
    const props = feature.properties;
    layer.bindPopup(`
      <div class="text-xs space-y-1">
        <p><strong>Status:</strong> ${props.presence || 'Unknown'}</p>
        <p><strong>Origin:</strong> ${props.origin || 'Unknown'}</p>
      </div>
    `);
  };

  const styleFeature = () => ({
    fillColor: '#10b981',
    weight: 1,
    opacity: 0.5,
    color: '#059669',
    fillOpacity: 0.4
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Species Range Distribution</CardTitle>
        <p className="text-xs text-slate-500 mt-2">{species?.scientific_name || 'Unknown'}</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg overflow-hidden border border-slate-200">
          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: '400px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <GeoJSON
              data={rangeGeoJSON}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}