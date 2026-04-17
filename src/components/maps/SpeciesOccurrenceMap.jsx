import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import L from 'leaflet';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function SpeciesOccurrenceMap({ species, observations = [] }) {
  const [selectedObservation, setSelectedObservation] = useState(null);

  if (!observations || observations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Species Occurrences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No observation data available</p>
        </CardContent>
      </Card>
    );
  }

  // Filter valid coordinates
  const validObs = observations
    .map(obs => ({
      ...obs,
      lat: obs.latitude || obs.lat || obs.decimalLatitude,
      lon: obs.longitude || obs.lon || obs.decimalLongitude
    }))
    .filter(obs => obs.lat && obs.lon && !isNaN(obs.lat) && !isNaN(obs.lon));

  if (validObs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Species Occurrences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No valid coordinates found</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate map center and zoom
  const lats = validObs.map(o => o.lat);
  const lons = validObs.map(o => o.lon);
  const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const centerLon = (Math.max(...lons) + Math.min(...lons)) / 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Species Occurrences - {species?.scientific_name || 'Unknown'}</CardTitle>
        <p className="text-xs text-slate-500 mt-2">{validObs.length} observations plotted</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg overflow-hidden border border-slate-200">
          <MapContainer
            center={[centerLat, centerLon]}
            zoom={4}
            style={{ height: '400px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {validObs.map((obs, idx) => (
              <CircleMarker
                key={idx}
                center={[obs.lat, obs.lon]}
                radius={5}
                fillOpacity={0.7}
                color="#ef4444"
                fillColor="#fca5a5"
                weight={2}
                eventHandlers={{
                  click: () => setSelectedObservation(obs)
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <p><strong>Date:</strong> {obs.date || obs.eventDate || 'Unknown'}</p>
                    <p><strong>Source:</strong> {obs.source || 'Unknown'}</p>
                    <p><strong>Coords:</strong> {obs.lat.toFixed(4)}, {obs.lon.toFixed(4)}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}