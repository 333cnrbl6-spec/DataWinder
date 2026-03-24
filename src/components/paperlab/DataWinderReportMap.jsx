/**
 * DataWinderReportMap — Leaflet map of all occurrence points coloured by source
 */
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const SOURCE_COLORS = {
  GBIF: '#2563eb',
  iNaturalist: '#16a34a',
  speciesLink: '#d97706',
};

export default function DataWinderReportMap({ points }) {
  if (!points?.length) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-100 rounded-xl text-sm text-slate-400">
        No georeferenced occurrence records found in database
      </div>
    );
  }

  // Centre on centroid
  const avgLat = points.reduce((a, p) => a + p.lat, 0) / points.length;
  const avgLng = points.reduce((a, p) => a + p.lng, 0) / points.length;

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: 340 }}>
      <MapContainer
        center={[avgLat, avgLng]}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap contributors'
        />
        {points.map((p, i) => (
          <CircleMarker
            key={i}
            center={[p.lat, p.lng]}
            radius={4}
            pathOptions={{
              color: SOURCE_COLORS[p.source] || '#64748b',
              fillColor: SOURCE_COLORS[p.source] || '#64748b',
              fillOpacity: 0.7,
              weight: 1
            }}
          >
            <Tooltip>
              <span className="text-xs">
                <strong>{p.species}</strong><br />
                {p.source}{p.date ? ` · ${p.date}` : ''}<br />
                {p.basis ? <em>{p.basis}</em> : null}
              </span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}