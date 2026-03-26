import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl } from 'react-leaflet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SOURCE_STYLES = {
  iNaturalist: { color: '#22c55e', label: 'iNaturalist', description: 'Citizen science field observations' },
  GBIF:        { color: '#3b82f6', label: 'GBIF',        description: 'Museum specimens & institutional records' },
};

export default function OccurrenceSourceMap({ species }) {
  const [visibleSources, setVisibleSources] = useState({ iNaturalist: true, GBIF: true });
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Flatten all occurrence points from all species with source tags
  const points = useMemo(() => {
    const all = [];
    for (const sp of species) {
      if (visibleSources.iNaturalist && sp.observations?.length) {
        for (const obs of sp.observations) {
          if (obs.latitude && obs.longitude) {
            all.push({
              lat: obs.latitude,
              lng: obs.longitude,
              source: 'iNaturalist',
              species: sp.scientific_name,
              common_name: sp.common_name,
              date: obs.observed_on,
              location: obs.location,
              observer: obs.user,
              photo_url: obs.photo_url,
            });
          }
        }
      }
      if (visibleSources.GBIF && sp.gbif_occurrences?.length) {
        for (const occ of sp.gbif_occurrences) {
          if (occ.latitude && occ.longitude) {
            all.push({
              lat: occ.latitude,
              lng: occ.longitude,
              source: 'GBIF',
              species: sp.scientific_name,
              common_name: sp.common_name,
              date: occ.date,
              location: occ.location,
              institution: occ.institution,
              basis: occ.basis_of_record,
            });
          }
        }
      }
    }
    return all;
  }, [species, visibleSources]);

  const counts = useMemo(() => {
    const inat = species.reduce((n, sp) => n + (sp.observations?.filter(o => o.latitude && o.longitude).length || 0), 0);
    const gbif = species.reduce((n, sp) => n + (sp.gbif_occurrences?.filter(o => o.latitude && o.longitude).length || 0), 0);
    return { iNaturalist: inat, GBIF: gbif };
  }, [species]);

  // Compute center from all points
  const center = useMemo(() => {
    if (points.length === 0) return [0, 0];
    const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    return [avgLat, avgLng];
  }, [points]);

  const zoom = points.length === 0 ? 2 : 4;

  const toggleSource = (source) => {
    setVisibleSources(prev => ({ ...prev, [source]: !prev[source] }));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Legend & Controls */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <span className="text-xs font-semibold text-slate-600 shrink-0">Data Sources:</span>
        {Object.entries(SOURCE_STYLES).map(([key, style]) => (
          <button
            key={key}
            onClick={() => toggleSource(key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              visibleSources[key]
                ? 'text-white border-transparent'
                : 'bg-white text-slate-400 border-slate-200 opacity-60'
            }`}
            style={visibleSources[key] ? { backgroundColor: style.color, borderColor: style.color } : {}}
          >
            <span
              className="w-2.5 h-2.5 rounded-full inline-block border-2 border-white"
              style={{ backgroundColor: visibleSources[key] ? 'white' : style.color }}
            />
            {style.label}
            <span className="ml-1 opacity-80">({counts[key].toLocaleString()})</span>
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{points.length.toLocaleString()} total points</span>
      </div>

      {points.length === 0 ? (
        <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-sm">
          No occurrence data with coordinates available. Enable iNaturalist or GBIF in your search to populate this map.
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm" style={{ height: 480 }}>
          <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
              attribution="&copy; Esri"
            />
            {points.map((point, i) => {
              const style = SOURCE_STYLES[point.source];
              return (
                <CircleMarker
                  key={i}
                  center={[point.lat, point.lng]}
                  radius={5}
                  pathOptions={{
                    fillColor: style.color,
                    color: '#fff',
                    weight: 1,
                    fillOpacity: 0.8,
                  }}
                >
                  <Popup maxWidth={220}>
                    <div className="text-xs space-y-1">
                      <div className="font-semibold italic text-slate-800">{point.species}</div>
                      {point.common_name && <div className="text-slate-500">{point.common_name}</div>}
                      <div
                        className="inline-block px-1.5 py-0.5 rounded text-white text-[10px] font-bold"
                        style={{ backgroundColor: style.color }}
                      >
                        {style.label}
                      </div>
                      {point.date && <div className="text-slate-500">Date: {point.date}</div>}
                      {point.location && <div className="text-slate-500 truncate max-w-[180px]">📍 {point.location}</div>}
                      {point.observer && <div className="text-slate-500">👤 {point.observer}</div>}
                      {point.institution && <div className="text-slate-500">🏛️ {point.institution}</div>}
                      {point.basis && <div className="text-slate-400 italic">{point.basis}</div>}
                      {point.photo_url && (
                        <img src={point.photo_url} alt="" className="w-full rounded mt-1 max-h-24 object-cover" />
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      )}

      {/* Source comparison summary */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(SOURCE_STYLES).map(([key, style]) => (
          <div key={key} className="p-3 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: style.color }} />
              <span className="text-xs font-bold text-slate-700">{style.label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: style.color }}>{counts[key].toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-0.5">{style.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}