import React, { useEffect, useRef } from 'react';

// Leaflet is loaded via react-leaflet; import it directly
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Colour scale: blue (low) → yellow → red (high suitability)
const suitabilityColor = (v) => {
  if (v < 0.2) return '#3b82f6';
  if (v < 0.4) return '#06b6d4';
  if (v < 0.6) return '#f59e0b';
  if (v < 0.75) return '#f97316';
  return '#dc2626';
};

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const lats = points.map(p => p.lat);
    const lons = points.map(p => p.lon ?? p.lon);
    map.fitBounds([[Math.min(...lats) - 1, Math.min(...lons) - 1], [Math.max(...lats) + 1, Math.max(...lons) + 1]]);
  }, [points.length]);
  return null;
}

export default function SDMPredictionMap({ grid = [], occurrences = [] }) {
  if (!grid.length && !occurrences.length) {
    return (
      <div className="h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm">
        No prediction data available
      </div>
    );
  }

  const center = occurrences.length
    ? [occurrences.reduce((s, p) => s + p.lat, 0) / occurrences.length,
       occurrences.reduce((s, p) => s + p.lon, 0) / occurrences.length]
    : grid.length
      ? [grid.reduce((s, p) => s + p.lat, 0) / grid.length,
         grid.reduce((s, p) => s + p.lon, 0) / grid.length]
      : [0, 0];

  // Downsample grid if very large (>2000 cells) for rendering performance
  const displayGrid = grid.length > 2000
    ? grid.filter((_, i) => i % Math.ceil(grid.length / 2000) === 0)
    : grid;

  return (
    <div className="space-y-2">
      <div className="h-80 rounded-xl overflow-hidden border border-slate-200">
        <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© OpenStreetMap'
          />
          <FitBounds points={occurrences.length ? occurrences : displayGrid} />

          {/* Prediction grid cells */}
          {displayGrid.map((cell, i) => (
            <CircleMarker
              key={`g-${i}`}
              center={[cell.lat, cell.lon]}
              radius={5}
              pathOptions={{
                color: suitabilityColor(cell.suitability),
                fillColor: suitabilityColor(cell.suitability),
                fillOpacity: 0.55,
                weight: 0,
              }}
            >
              <Tooltip>{`Suitability: ${(cell.suitability * 100).toFixed(1)}%`}</Tooltip>
            </CircleMarker>
          ))}

          {/* Occurrence points */}
          {occurrences.map((pt, i) => (
            <CircleMarker
              key={`o-${i}`}
              center={[pt.lat, pt.lon]}
              radius={4}
              pathOptions={{ color: '#1e293b', fillColor: '#f8fafc', fillOpacity: 1, weight: 1.5 }}
            >
              <Tooltip>{pt.species || 'Occurrence'}</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
        <span className="font-semibold text-slate-600">Suitability:</span>
        {[
          { color: '#3b82f6', label: 'Very low (<20%)' },
          { color: '#06b6d4', label: 'Low' },
          { color: '#f59e0b', label: 'Moderate' },
          { color: '#f97316', label: 'High' },
          { color: '#dc2626', label: 'Very high (>75%)' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1">
          <span className="w-3 h-3 rounded-full border border-slate-800 bg-white inline-block" />
          Occurrence
        </span>
      </div>
    </div>
  );
}