import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Eye, EyeOff, Download, Info, Layers } from 'lucide-react';

const BASEMAPS = [
  {
    id: 'satellite',
    label: '🛰 Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DigitalGlobe',
    labels: true,
  },
  {
    id: 'light',
    label: '🗺 Light',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    labels: false,
  },
  {
    id: 'topo',
    label: '🏔 Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    labels: false,
  },
  {
    id: 'dark',
    label: '🌑 Dark',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    attribution: '&copy; Stadia Maps, OpenMapTiles, OpenStreetMap',
    labels: false,
  },
  {
    id: 'outline',
    label: '📐 Outline',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    labels: true,
  },
];

// Component to swap TileLayer reactively
function BasemapLayer({ basemapId }) {
  const bm = BASEMAPS.find(b => b.id === basemapId) || BASEMAPS[0];
  return (
    <>
      <TileLayer key={bm.id} url={bm.url} attribution={bm.attribution} />
      {bm.labels && bm.id === 'satellite' && (
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution="&copy; Esri"
          opacity={0.7}
        />
      )}
    </>
  );
}

// 12 visually distinct colours for species
const SPECIES_COLOURS = [
  '#e63946', '#2a9d8f', '#f4a261', '#457b9d', '#a8dadc',
  '#e9c46a', '#264653', '#6a4c93', '#f77f00', '#06d6a0',
  '#ff006e', '#8338ec'
];

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Very lightweight polygon overlap detector using bounding box heuristic
function bboxOverlaps(geojsonA, geojsonB) {
  const bbox = (g) => {
    const coords = [];
    const extract = (c) => {
      if (typeof c[0] === 'number') coords.push(c);
      else c.forEach(extract);
    };
    const geom = g.type === 'FeatureCollection' ? g.features.map(f => f.geometry) : [g.geometry || g];
    geom.forEach(geo => { if (geo?.coordinates) extract(geo.coordinates); });
    if (!coords.length) return null;
    return {
      minX: Math.min(...coords.map(c => c[0])),
      maxX: Math.max(...coords.map(c => c[0])),
      minY: Math.min(...coords.map(c => c[1])),
      maxY: Math.max(...coords.map(c => c[1]))
    };
  };
  const a = bbox(geojsonA);
  const b = bbox(geojsonB);
  if (!a || !b) return false;
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

export default function HybridizationMapper({ species = [] }) {
  const speciesWithData = species.filter(sp =>
    sp.range_data_geojson ||
    (sp.observations?.length > 0) ||
    (sp.gbif_occurrences?.length > 0) ||
    (sp.gbif_occurrences?.length > 0)
  );

  const [selectedIds, setSelectedIds] = useState(() =>
    speciesWithData.slice(0, 6).map(sp => sp.id)
  );
  const [showRanges, setShowRanges] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [basemap, setBasemap] = useState('satellite');

  const selectedSpecies = speciesWithData.filter(sp => selectedIds.includes(sp.id));

  const colourMap = useMemo(() => {
    const map = {};
    selectedSpecies.forEach((sp, i) => {
      map[sp.id] = SPECIES_COLOURS[i % SPECIES_COLOURS.length];
    });
    return map;
  }, [selectedIds]);

  // Detect potential hybridization zone pairs
  const hybridPairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < selectedSpecies.length; i++) {
      for (let j = i + 1; j < selectedSpecies.length; j++) {
        const a = selectedSpecies[i];
        const b = selectedSpecies[j];
        if (a.range_data_geojson && b.range_data_geojson) {
          if (bboxOverlaps(a.range_data_geojson, b.range_data_geojson)) {
            pairs.push({ a, b });
          }
        }
      }
    }
    return pairs;
  }, [selectedSpecies]);

  // Clean occurrence points: filter out records with no valid coordinates
  const occurrencePoints = useMemo(() => {
    const pts = [];
    selectedSpecies.forEach(sp => {
      const col = colourMap[sp.id];
      (sp.observations || []).forEach(obs => {
        if (obs.latitude && obs.longitude) {
          pts.push({ lat: parseFloat(obs.latitude), lng: parseFloat(obs.longitude), species: sp.scientific_name, source: 'iNat', date: obs.observed_on, col });
        }
      });
      (sp.gbif_occurrences || []).forEach(occ => {
        if (occ.latitude && occ.longitude) {
          pts.push({ lat: parseFloat(occ.latitude), lng: parseFloat(occ.longitude), species: sp.scientific_name, source: 'GBIF', date: occ.date, col });
        }
      });
    });
    return pts;
  }, [selectedSpecies, colourMap]);

  const toggleSpecies = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const exportHybridGeoJSON = () => {
    const features = [];
    selectedSpecies.forEach(sp => {
      if (!sp.range_data_geojson) return;
      const geom = sp.range_data_geojson.type === 'FeatureCollection'
        ? sp.range_data_geojson.features[0]?.geometry
        : (sp.range_data_geojson.geometry || sp.range_data_geojson);
      if (geom) features.push({ type: 'Feature', properties: { scientific_name: sp.scientific_name, iucn_status: sp.iucn_status, layer: 'range' }, geometry: geom });
    });
    occurrencePoints.forEach(pt => {
      features.push({ type: 'Feature', properties: { species: pt.species, source: pt.source, date: pt.date, layer: 'occurrence' }, geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] } });
    });
    const blob = new Blob([JSON.stringify({ type: 'FeatureCollection', features }, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hybridization_map_${Date.now()}.geojson`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Species selector */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Select species to display (colour-coded)</p>
        <div className="flex flex-wrap gap-2">
          {speciesWithData.map((sp, i) => {
            const col = SPECIES_COLOURS[speciesWithData.indexOf(sp) % SPECIES_COLOURS.length];
            const active = selectedIds.includes(sp.id);
            return (
              <button
                key={sp.id}
                onClick={() => toggleSpecies(sp.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                  active ? 'opacity-100 text-white' : 'opacity-40 bg-white text-slate-600'
                }`}
                style={active ? { backgroundColor: col, borderColor: col } : { borderColor: col }}
              >
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: col }} />
                {sp.scientific_name}
              </button>
            );
          })}
        </div>
        {speciesWithData.length === 0 && (
          <p className="text-sm text-slate-500 italic">No species with range or occurrence data found in the database.</p>
        )}
      </div>

      {/* Basemap switcher + layer toggles + export */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <Layers className="w-3.5 h-3.5 text-slate-500 ml-1 mr-0.5" />
          {BASEMAPS.map(bm => (
            <button
              key={bm.id}
              onClick={() => setBasemap(bm.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                basemap === bm.id
                  ? 'bg-white shadow text-slate-800'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {bm.label}
            </button>
          ))}
        </div>
        <Button size="sm" variant={showRanges ? 'default' : 'outline'} onClick={() => setShowRanges(v => !v)}>
          {showRanges ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
          Range Polygons
        </Button>
        <Button size="sm" variant={showPoints ? 'default' : 'outline'} onClick={() => setShowPoints(v => !v)}>
          {showPoints ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
          Occurrence Points
        </Button>
        <Button size="sm" variant="outline" onClick={exportHybridGeoJSON} className="ml-auto">
          <Download className="w-3.5 h-3.5 mr-1" />
          Export GeoJSON
        </Button>
      </div>

      {/* Hybridization alerts */}
      {hybridPairs.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            {hybridPairs.length} potential hybridization zone{hybridPairs.length > 1 ? 's' : ''} detected
          </div>
          {hybridPairs.map(({ a, b }, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-amber-800">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colourMap[a.id] }} />
              <span className="italic">{a.scientific_name}</span>
              <span className="text-amber-500">⟷</span>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colourMap[b.id] }} />
              <span className="italic">{b.scientific_name}</span>
              <Badge className="ml-1 bg-amber-200 text-amber-800 text-xs">overlap</Badge>
            </div>
          ))}
          <p className="text-xs text-amber-600 flex items-start gap-1 mt-1">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            Overlap is based on IUCN range bounding boxes. Inspect the map for precise contact zones.
          </p>
        </div>
      )}

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow">
        <MapContainer
          center={[-15, -55]}
          zoom={4}
          style={{ height: '600px', width: '100%' }}
        >
          <BasemapLayer basemapId={basemap} />

          {/* Range polygons */}
          {showRanges && selectedSpecies.map(sp => {
            if (!sp.range_data_geojson) return null;
            const col = colourMap[sp.id];
            return (
              <GeoJSON
                key={`range-${sp.id}`}
                data={sp.range_data_geojson}
                style={{
                  color: col,
                  weight: 2,
                  opacity: 0.85,
                  fillColor: col,
                  fillOpacity: 0.25
                }}
                onEachFeature={(feature, layer) => {
                  layer.bindPopup(
                    `<div style="font-size:12px">
                      <div style="display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:4px">
                        <span style="width:10px;height:10px;border-radius:50%;background:${col};display:inline-block"></span>
                        ${sp.scientific_name}
                      </div>
                      <div>IUCN: <strong>${sp.iucn_status || 'N/A'}</strong></div>
                      <div>Trend: ${sp.population_trend || 'unknown'}</div>
                    </div>`
                  );
                }}
              />
            );
          })}

          {/* Occurrence points */}
          {showPoints && occurrencePoints.map((pt, i) => (
            <CircleMarker
              key={`pt-${i}`}
              center={[pt.lat, pt.lng]}
              radius={4}
              fillColor={pt.col}
              color="#fff"
              weight={1}
              opacity={1}
              fillOpacity={0.85}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold italic">{pt.species}</p>
                  <p className="text-slate-500">{pt.source} · {pt.date || 'no date'}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      {selectedSpecies.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Legend</p>
          <div className="flex flex-wrap gap-3">
            {selectedSpecies.map(sp => (
              <div key={sp.id} className="flex items-center gap-1.5 text-xs">
                <span className="w-4 h-3 rounded inline-block opacity-50 border" style={{ backgroundColor: colourMap[sp.id], borderColor: colourMap[sp.id] }} />
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: colourMap[sp.id] }} />
                <span className="italic text-slate-700">{sp.scientific_name}</span>
                <span className="text-slate-400">({sp.iucn_status || '?'})</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Filled polygon = IUCN range  ·  Dot = occurrence record  ·  Overlapping polygons = potential hybridization zone</p>
        </div>
      )}
    </div>
  );
}