import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

export default function ArcGISMap({ species, height = '600px', hasAgreedToTerms = false, onRequestTermsAgreement }) {
  const [mapCenter, setMapCenter] = useState([20, 0]);
  const [zoom, setZoom] = useState(2);

  // Calculate center from observations if available
  useEffect(() => {
    if (species?.observations && species.observations.length > 0) {
      const lats = species.observations.map(o => o.latitude).filter(Boolean);
      const lngs = species.observations.map(o => o.longitude).filter(Boolean);
      
      if (lats.length > 0 && lngs.length > 0) {
        const avgLat = lats.reduce((a, b) => a + b) / lats.length;
        const avgLng = lngs.reduce((a, b) => a + b) / lngs.length;
        setMapCenter([avgLat, avgLng]);
        setZoom(4);
      }
    }
  }, [species]);

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      layer.bindPopup(
        `<div class="text-sm">
          <p class="font-semibold">${feature.properties.NAME || 'Range Area'}</p>
          <p class="text-xs text-slate-600">${feature.properties.BINOMIAL || ''}</p>
        </div>`
      );
    }
  };

  if (!hasAgreedToTerms) {
    return (
      <Card className="shadow-lg border-bangor-sun/20">
        <CardHeader className="border-b border-bangor-sun/20 bg-gradient-to-r from-bangor-red/10 to-bangor-sun/10">
          <CardTitle className="text-bangor-red flex items-center gap-2">
            <span>🗺️ Species Distribution Map</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div style={{ height }} className="w-full flex flex-col items-center justify-center bg-slate-50 rounded-b-xl">
            <Lock className="w-12 h-12 text-slate-400 mb-3" />
            <p className="text-slate-600 font-medium mb-4">Map access requires terms agreement</p>
            <Button
              onClick={onRequestTermsAgreement}
              className="bg-bangor-red hover:bg-bangor-red/90"
            >
              Review & Accept Terms
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-bangor-sun/20">
      <CardHeader className="border-b border-bangor-sun/20 bg-gradient-to-r from-bangor-red/10 to-bangor-sun/10">
        <CardTitle className="text-bangor-red flex items-center gap-2">
          <span>🗺️ Species Distribution Map</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <MapContainer 
          center={mapCenter} 
          zoom={zoom} 
          style={{ height, width: '100%' }}
          className="rounded-b-xl"
        >
          {/* ArcGIS World Imagery (Satellite) */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri, DigitalGlobe, Earthstar Geographics'
            name="Satellite"
          />

          {/* Range data as GeoJSON if available */}
          {species?.range_data_geojson && (
            <GeoJSON 
              data={species.range_data_geojson}
              style={{
                color: '#ef4444',
                weight: 2,
                opacity: 0.6,
                fillOpacity: 0.2
              }}
              onEachFeature={onEachFeature}
            />
          )}

          {/* Observation points */}
          {species?.observations && species.observations.map((obs, idx) => (
            <CircleMarker
              key={idx}
              center={[obs.latitude, obs.longitude]}
              radius={5}
              fillColor="#f59e0b"
              color="#d97706"
              weight={2}
              opacity={0.8}
              fillOpacity={0.7}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">{obs.location}</p>
                  <p>{obs.observed_on}</p>
                  <p className="text-slate-600">Observer: {obs.user}</p>
                  {obs.photo_url && (
                    <img src={obs.photo_url} alt="observation" className="w-32 mt-2 rounded" />
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </CardContent>
    </Card>
  );
}