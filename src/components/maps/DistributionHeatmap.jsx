import React from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import L from 'leaflet';

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function DistributionHeatmap({ species = [] }) {
  // Aggregate observations from all species
  const allObservations = [];
  
  species.forEach(s => {
    const obs = [
      ...(s.observations || []),
      ...(s.gbif_occurrences || []),
      ...(s.specieslink_occurrences || [])
    ];
    
    obs.forEach(o => {
      const lat = o.latitude || o.lat || o.decimalLatitude;
      const lon = o.longitude || o.lon || o.decimalLongitude;
      if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
        allObservations.push({ lat, lon, species: s.scientific_name, status: s.iucn_status });
      }
    });
  });

  if (allObservations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Global Distribution Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No occurrence data available</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate center
  const lats = allObservations.map(o => o.lat);
  const lons = allObservations.map(o => o.lon);
  const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const centerLon = (Math.max(...lons) + Math.min(...lons)) / 2;

  // Color by IUCN status
  const getColor = (status) => {
    const colors = {
      CR: '#7f1d1d',    // dark red
      EN: '#dc2626',    // red
      VU: '#f97316',    // orange
      NT: '#eab308',    // yellow
      LC: '#22c55e',    // green
      DD: '#6b7280'     // gray
    };
    return colors[status] || '#6b7280';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Species Distribution</CardTitle>
        <p className="text-xs text-slate-500 mt-2">{allObservations.length} observations across {new Set(species.map(s => s.id)).size} species</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg overflow-hidden border border-slate-200">
          <MapContainer
            center={[centerLat, centerLon]}
            zoom={3}
            style={{ height: '500px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {allObservations.map((obs, idx) => (
              <CircleMarker
                key={idx}
                center={[obs.lat, obs.lon]}
                radius={4}
                fillOpacity={0.6}
                color={getColor(obs.status)}
                fillColor={getColor(obs.status)}
                weight={1}
              />
            ))}
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { label: 'Critically Endangered', color: '#7f1d1d' },
            { label: 'Endangered', color: '#dc2626' },
            { label: 'Vulnerable', color: '#f97316' },
            { label: 'Near Threatened', color: '#eab308' },
            { label: 'Least Concern', color: '#22c55e' },
            { label: 'Data Deficient', color: '#6b7280' }
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-600">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}