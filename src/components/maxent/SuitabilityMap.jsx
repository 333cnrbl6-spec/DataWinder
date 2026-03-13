import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Green → Yellow → Red gradient for suitability 0→1
function suitabilityColor(value) {
  if (value == null) return '#94a3b8';
  const v = Math.max(0, Math.min(1, value));
  if (v < 0.5) {
    // green → yellow
    const r = Math.round(v * 2 * 255);
    return `rgb(${r},200,50)`;
  } else {
    // yellow → red
    const g = Math.round((1 - (v - 0.5) * 2) * 200);
    return `rgb(220,${g},20)`;
  }
}

function MapBounds({ geojson, points }) {
  const map = useMap();
  React.useEffect(() => {
    if (geojson?.features?.length > 0) {
      const L = window.L;
      if (L) {
        try { map.fitBounds(L.geoJSON(geojson).getBounds(), { padding: [20, 20] }); } catch {}
      }
    } else if (points.length > 0) {
      const lats = points.map(p => p[0]);
      const lngs = points.map(p => p[1]);
      map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [40, 40] });
    }
  }, [geojson, points]);
  return null;
}

export default function SuitabilityMap({ run, species }) {
  const geojson = run?.results?.suitability_geojson || null;

  // Occurrence points from the linked species
  const occurrencePoints = useMemo(() => {
    if (!species) return [];
    const pts = [];
    (species.observations || []).forEach(o => {
      if (o.latitude && o.longitude) pts.push([o.latitude, o.longitude, 'inat']);
    });
    (species.gbif_occurrences || []).forEach(o => {
      const lat = o.decimalLatitude ?? o.latitude;
      const lng = o.decimalLongitude ?? o.longitude;
      if (lat && lng) pts.push([lat, lng, 'gbif']);
    });
    return pts;
  }, [species]);

  const geoJsonStyle = (feature) => ({
    fillColor: suitabilityColor(feature?.properties?.suitability),
    fillOpacity: 0.65,
    color: 'transparent',
    weight: 0,
  });

  const center = occurrencePoints.length > 0
    ? [
        occurrencePoints.reduce((s, p) => s + p[0], 0) / occurrencePoints.length,
        occurrencePoints.reduce((s, p) => s + p[1], 0) / occurrencePoints.length,
      ]
    : [20, 0];

  return (
    <div className="relative h-[560px] rounded-xl overflow-hidden border border-slate-200">
      <MapContainer center={center} zoom={4} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.6}
        />
        <MapBounds geojson={geojson} points={occurrencePoints} />

        {/* Suitability GeoJSON layer */}
        {geojson && (
          <GeoJSON key={run.id} data={geojson} style={geoJsonStyle} />
        )}

        {/* Occurrence points */}
        {occurrencePoints.map((pt, i) => (
          <CircleMarker
            key={i}
            center={[pt[0], pt[1]]}
            radius={4}
            pathOptions={{
              color: pt[2] === 'gbif' ? '#2563eb' : '#7c3aed',
              fillColor: pt[2] === 'gbif' ? '#60a5fa' : '#a78bfa',
              fillOpacity: 0.85,
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{run.species_name}</p>
                <p className="text-slate-500">{pt[2] === 'gbif' ? 'GBIF' : 'iNaturalist'} occurrence</p>
                <p className="font-mono mt-1">{pt[0].toFixed(4)}, {pt[1].toFixed(4)}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow p-3 text-xs space-y-2">
        {geojson && (
          <div>
            <p className="font-semibold text-slate-700 mb-1">Habitat Suitability</p>
            <div className="flex items-center gap-1">
              <div className="w-24 h-3 rounded" style={{ background: 'linear-gradient(to right, rgb(0,200,50), rgb(255,200,0), rgb(220,0,20))' }} />
            </div>
            <div className="flex justify-between text-slate-400 mt-0.5">
              <span>Low</span><span>High</span>
            </div>
          </div>
        )}
        <div className="space-y-1 text-slate-600">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-violet-400 border border-violet-600" />
            <span>iNaturalist ({(species?.observations || []).filter(o => o.latitude).length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-400 border border-blue-600" />
            <span>GBIF ({(species?.gbif_occurrences || []).filter(o => o.decimalLatitude || o.latitude).length})</span>
          </div>
        </div>
      </div>
    </div>
  );
}