/**
 * SpeciesDetailMap
 * Compact map for a single species showing IUCN range polygon + occurrence points.
 * Used inside the SavedData detail modal.
 */
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLORS = {
  CR: '#d32f2f', EN: '#e64a19', VU: '#f57c00',
  NT: '#fbc02d', LC: '#388e3c', DD: '#607d8b',
  NE: '#9e9e9e', EX: '#212121', EW: '#4a148c',
};

export default function SpeciesDetailMap({ species, height = '320px' }) {
  const points = useMemo(() => {
    const pts = [];
    (species.observations || []).forEach(obs => {
      if (obs.latitude != null && obs.longitude != null)
        pts.push({ lat: obs.latitude, lng: obs.longitude, source: 'iNaturalist', date: obs.observed_on });
    });
    (species.gbif_occurrences || []).forEach(occ => {
      const lat = occ.decimalLatitude ?? occ.latitude;
      const lng = occ.decimalLongitude ?? occ.longitude;
      if (lat != null && lng != null)
        pts.push({ lat, lng, source: 'GBIF' });
    });
    return pts;
  }, [species]);

  const center = useMemo(() => {
    if (points.length > 0) {
      return [
        points.reduce((s, p) => s + p.lat, 0) / points.length,
        points.reduce((s, p) => s + p.lng, 0) / points.length,
      ];
    }
    // Crude centroid from first range feature if no points
    if (species.range_data_geojson) return [0, 20];
    return [0, 20];
  }, [points, species]);

  const rangeColor = STATUS_COLORS[species.iucn_status] || '#607d8b';
  const hasData = points.length > 0 || !!species.range_data_geojson;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-300" style={{ height }}>
        <MapPin className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-sm text-slate-400">No distribution data</p>
        <p className="text-xs text-slate-400 mt-1">Add occurrence records or fetch IUCN range data</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height }}>
      <MapContainer center={center} zoom={3} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
          attribution="&copy; Esri"
        />

        {/* IUCN range polygon */}
        {species.range_data_geojson && (
          <GeoJSON
            key={species.id}
            data={species.range_data_geojson}
            style={() => ({
              color: rangeColor,
              weight: 1.5,
              opacity: 0.85,
              fillColor: rangeColor,
              fillOpacity: 0.2,
            })}
            onEachFeature={(feature, layer) => {
              layer.bindPopup(`
                <p style="font-weight:600;font-style:italic;margin:0 0 4px">${species.scientific_name}</p>
                <span style="font-size:11px;background:${rangeColor};color:#fff;padding:2px 7px;border-radius:4px">${species.iucn_status || 'NE'}</span>
                <p style="font-size:10px;color:#888;margin:5px 0 0">IUCN Range</p>
              `);
            }}
          />
        )}

        {/* Occurrence markers */}
        {points.map((pt, i) => (
          <Marker key={i} position={[pt.lat, pt.lng]}>
            <Popup>
              <p style={{ fontStyle: 'italic', margin: '0 0 4px', fontWeight: 600 }}>{species.scientific_name}</p>
              <span style={{ fontSize: 11, background: pt.source === 'GBIF' ? '#1565c0' : '#2e7d32', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>{pt.source}</span>
              {pt.date && <p style={{ fontSize: 10, color: '#777', margin: '5px 0 0' }}>Observed: {pt.date}</p>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}