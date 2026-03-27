/**
 * RangeOverlayMap
 * Renders occurrence points (iNaturalist / GBIF) AND IUCN range polygons
 * on a single Leaflet map.
 *
 * Props:
 *   species        – array of Species records
 *   height         – CSS height string (default "420px")
 *   showControls   – show layer-toggle controls (default true)
 */
import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, LayersControl } from 'react-leaflet';
import { MapPin, Layers } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths broken by Vite
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

function getColor(status) {
  return STATUS_COLORS[status] || '#607d8b';
}

export default function RangeOverlayMap({ species = [], height = '420px', showControls = true }) {
  const [showPoints, setShowPoints] = useState(true);
  const [showRanges, setShowRanges] = useState(true);

  // Collect all occurrence points
  const points = useMemo(() => {
    const result = [];
    species.forEach(sp => {
      (sp.observations || []).forEach(obs => {
        if (obs.latitude != null && obs.longitude != null) {
          result.push({ lat: obs.latitude, lng: obs.longitude, species: sp, source: 'iNaturalist', date: obs.observed_on });
        }
      });
      (sp.gbif_occurrences || []).forEach(occ => {
        const lat = occ.decimalLatitude ?? occ.latitude;
        const lng = occ.decimalLongitude ?? occ.longitude;
        if (lat != null && lng != null) {
          result.push({ lat, lng, species: sp, source: 'GBIF' });
        }
      });
    });
    return result;
  }, [species]);

  // Collect all range GeoJSON objects
  const rangeFeatures = useMemo(() => {
    return species
      .filter(sp => sp.range_data_geojson)
      .map(sp => ({ geojson: sp.range_data_geojson, species: sp }));
  }, [species]);

  // Compute map center from points or first range centroid
  const center = useMemo(() => {
    if (points.length > 0) {
      const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
      const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
      return [avgLat, avgLng];
    }
    return [0, 20];
  }, [points]);

  const hasContent = points.length > 0 || rangeFeatures.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200" style={{ height }}>
        <MapPin className="w-10 h-10 text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">No distribution data available</p>
        <p className="text-xs text-slate-400 mt-1">Fetch IUCN range data or add occurrence records</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200" style={{ height }}>
      {/* Layer toggles */}
      {showControls && (
        <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1">
          <button
            onClick={() => setShowPoints(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg shadow border font-medium transition-all ${showPoints ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'}`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-current inline-block" />
            Points ({points.length})
          </button>
          <button
            onClick={() => setShowRanges(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg shadow border font-medium transition-all ${showRanges ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-300'}`}
          >
            <Layers className="w-3 h-3" />
            Ranges ({rangeFeatures.length})
          </button>
        </div>
      )}

      <MapContainer center={center} zoom={3} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        {/* IUCN Range polygons */}
        {showRanges && rangeFeatures.map(({ geojson, species: sp }, i) => (
          <GeoJSON
            key={`range-${sp.id || i}`}
            data={geojson}
            style={() => ({
              color: getColor(sp.iucn_status),
              weight: 1.5,
              opacity: 0.8,
              fillColor: getColor(sp.iucn_status),
              fillOpacity: 0.18,
            })}
            onEachFeature={(feature, layer) => {
              layer.bindPopup(`
                <div style="min-width:160px">
                  <p style="font-weight:600;font-style:italic;margin:0 0 4px">${sp.scientific_name}</p>
                  ${sp.common_name ? `<p style="font-size:11px;color:#555;margin:0 0 4px">${sp.common_name}</p>` : ''}
                  <span style="font-size:11px;background:${getColor(sp.iucn_status)};color:#fff;padding:2px 6px;border-radius:4px">${sp.iucn_status || 'NE'}</span>
                  <p style="font-size:10px;color:#777;margin:6px 0 0">IUCN Range Polygon</p>
                </div>
              `);
            }}
          />
        ))}

        {/* Occurrence point markers */}
        {showPoints && points.map((pt, i) => (
          <Marker key={i} position={[pt.lat, pt.lng]}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <p style={{ fontWeight: 600, fontStyle: 'italic', margin: '0 0 4px' }}>{pt.species.scientific_name}</p>
                <span style={{ fontSize: 11, background: pt.source === 'GBIF' ? '#1565c0' : '#2e7d32', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>{pt.source}</span>
                {pt.date && <p style={{ fontSize: 10, color: '#777', margin: '6px 0 0' }}>Observed: {pt.date}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}