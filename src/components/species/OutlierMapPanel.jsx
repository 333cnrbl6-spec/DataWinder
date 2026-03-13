import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { severityConfig } from '@/components/outlierDetection';
import 'leaflet/dist/leaflet.css';

function AutoFit({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter(p => !isNaN(p.lat) && !isNaN(p.lng));
    if (valid.length === 0) return;
    const lats = valid.map(p => p.lat);
    const lngs = valid.map(p => p.lng);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [30, 30], maxZoom: 8 }
    );
  }, []);
  return null;
}

/**
 * cleanPoints  — [{lat, lng, source, date?, location?, color?, speciesName?}]
 * outlierPoints — [{lat, lng, source, severity, confidence, reason, date?, location?, speciesName?, speciesColor?}]
 * highlightedIdx — index into outlierPoints to highlight
 * onOutlierClick(i) — called when an outlier marker is clicked
 * singleColor — fill colour for clean points in single-species mode (fallback)
 */
export default function OutlierMapPanel({
  cleanPoints = [],
  outlierPoints = [],
  highlightedIdx = null,
  onOutlierClick,
  singleColor = '#22c55e',
}) {
  const allValid = [...cleanPoints, ...outlierPoints].filter(p => !isNaN(p.lat) && !isNaN(p.lng));

  if (allValid.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 rounded-lg text-slate-400 text-sm">
        No valid coordinates to display on map
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        scrollWheelZoom
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
        <AutoFit points={allValid} />

        {/* Clean points — small, semi-transparent */}
        {cleanPoints.filter(p => !isNaN(p.lat) && !isNaN(p.lng)).map((p, i) => (
          <CircleMarker
            key={`c-${i}`}
            center={[p.lat, p.lng]}
            radius={3}
            pathOptions={{
              fillColor: p.color || singleColor,
              fillOpacity: 0.45,
              color: 'transparent',
              weight: 0,
            }}
          >
            <Popup>
              <div className="text-xs space-y-0.5">
                <p className="font-semibold">{p.speciesName || 'Observation'}</p>
                <p className="text-slate-500">{p.source} · {p.lat.toFixed(4)}°, {p.lng.toFixed(4)}°</p>
                {p.date && <p className="text-slate-400">📅 {p.date}</p>}
                {p.location && <p className="text-slate-400 truncate max-w-[180px]">📍 {p.location}</p>}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Outlier points — severity fill, species stroke, confidence → size */}
        {outlierPoints.filter(p => !isNaN(p.lat) && !isNaN(p.lng)).map((p, i) => {
          const cfg = severityConfig[p.severity] || severityConfig.medium;
          const isHighlighted = highlightedIdx === i;
          const radius = Math.max(6, Math.min(14, 5 + (p.confidence / 100) * 9));
          return (
            <CircleMarker
              key={`o-${i}`}
              center={[p.lat, p.lng]}
              radius={isHighlighted ? radius + 4 : radius}
              pathOptions={{
                fillColor: cfg.color,
                fillOpacity: isHighlighted ? 1 : 0.85,
                color: p.speciesColor || '#ffffff',
                weight: isHighlighted ? 3.5 : 2,
              }}
              eventHandlers={{ click: () => onOutlierClick?.(i) }}
            >
              <Popup>
                <div className="text-xs space-y-1" style={{ minWidth: '200px' }}>
                  {p.speciesName && <p className="font-semibold italic">{p.speciesName}</p>}
                  <p className="font-medium text-slate-800">{p.reason}</p>
                  <p className="text-slate-500">{p.source} · {p.lat.toFixed(4)}°, {p.lng.toFixed(4)}°</p>
                  {p.date && <p className="text-slate-400">📅 {p.date}</p>}
                  {p.location && <p className="text-slate-400 truncate max-w-[180px]">📍 {p.location}</p>}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                    <span className="font-bold text-xs" style={{ color: cfg.color }}>{p.severity?.toUpperCase()}</span>
                    <span className="text-slate-500">· {p.confidence}% error confidence</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}