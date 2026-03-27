import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Filter, MapPin, Download, Loader2, Layers } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from './StatusBadge';
import ObservationExportPanel from './ObservationExportPanel';
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

function getStatusColor(status) {
  return STATUS_COLORS[status] || '#607d8b';
}

export default function MapView({ species, selectedIds, onSelect }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [taxonomicFilter, setTaxonomicFilter] = useState('all');
  const [taxonomicRank, setTaxonomicRank] = useState('family');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showExport, setShowExport] = useState(false);
  const [speciesData, setSpeciesData] = useState(species);
  const [loading, setLoading] = useState(false);
  const [showRanges, setShowRanges] = useState(true);
  const [showPoints, setShowPoints] = useState(true);

  const taxonomicOptions = useMemo(() => {
    const rankField = taxonomicRank === 'genus' ? 'genus'
      : taxonomicRank === 'family' ? 'family'
      : taxonomicRank === 'order' ? 'order_name'
      : 'class_name';
    return [...new Set(species.map(s => s[rankField]).filter(Boolean))].sort();
  }, [species, taxonomicRank]);

  useEffect(() => {
    if (taxonomicRank === 'family' && taxonomicFilter !== 'all' && !loading) {
      setLoading(true);
      base44.functions.invoke('fetchFamilySpeciesData', { family: taxonomicFilter })
        .then(res => { setSpeciesData(res.data.species); setTaxonomicFilter('all'); })
        .catch(err => console.error('Family fetch error:', err))
        .finally(() => setLoading(false));
    }
  }, [taxonomicRank, taxonomicFilter]);

  const filtered = useMemo(() => {
    let f = speciesData;
    if (statusFilter !== 'all') f = f.filter(s => s.iucn_status === statusFilter);
    if (taxonomicFilter !== 'all') {
      const rankField = taxonomicRank === 'genus' ? 'genus'
        : taxonomicRank === 'family' ? 'family'
        : taxonomicRank === 'order' ? 'order_name'
        : 'class_name';
      f = f.filter(s => s[rankField] === taxonomicFilter);
    }
    if (sourceFilter !== 'all') f = f.filter(s => s.data_source === sourceFilter);
    return f;
  }, [speciesData, statusFilter, taxonomicFilter, taxonomicRank, sourceFilter]);

  const observations = useMemo(() => {
    const obs = [];
    filtered.forEach(sp => {
      (sp.observations || []).forEach(observation => {
        if (observation.latitude && observation.longitude) {
          obs.push({ ...observation, species: sp });
        }
      });
      (sp.gbif_occurrences || []).forEach(occ => {
        const lat = occ.decimalLatitude ?? occ.latitude;
        const lng = occ.decimalLongitude ?? occ.longitude;
        if (lat != null && lng != null) {
          obs.push({ latitude: lat, longitude: lng, species: sp, source: 'GBIF' });
        }
      });
    });
    return obs;
  }, [filtered]);

  const rangeFeatures = useMemo(() => {
    return filtered.filter(sp => sp.range_data_geojson).map(sp => ({ geojson: sp.range_data_geojson, species: sp }));
  }, [filtered]);

  const mapCenter = useMemo(() => {
    if (observations.length > 0) {
      return [
        observations.reduce((s, o) => s + o.latitude, 0) / observations.length,
        observations.reduce((s, o) => s + o.longitude, 0) / observations.length,
      ];
    }
    return [0, 20];
  }, [observations]);

  const Filters = (
    <Card className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">Map Filters</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Data Source</label>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="IUCN Red List">IUCN</SelectItem>
              <SelectItem value="iNaturalist">iNaturalist</SelectItem>
              <SelectItem value="GBIF">GBIF</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">IUCN Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {['CR','EN','VU','NT','LC','DD','NE'].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Rank</label>
          <Select value={taxonomicRank} onValueChange={v => { setTaxonomicRank(v); setTaxonomicFilter('all'); }}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['class','order','family','genus'].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block capitalize">{taxonomicRank}</label>
          <Select value={taxonomicFilter} onValueChange={setTaxonomicFilter}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {taxonomicOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500" /><span>{observations.length} points</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500" /><span>{rangeFeatures.length} ranges</span></div>
          {loading && <div className="flex items-center gap-1 text-amber-600"><Loader2 className="w-3 h-3 animate-spin" /><span>Loading…</span></div>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPoints(v => !v)}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${showPoints ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'}`}
          >Points</button>
          <button
            onClick={() => setShowRanges(v => !v)}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${showRanges ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-300'}`}
          ><Layers className="w-3 h-3 inline mr-1" />Ranges</button>
          {observations.length > 0 && (
            <Button size="sm" onClick={() => setShowExport(true)} className="bg-blue-600 hover:bg-blue-700 text-xs h-7">
              <Download className="w-3 h-3 mr-1" />Export
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-2">
      {Filters}

      <Card className="overflow-hidden">
        <div className="relative" style={{ height: 560 }}>
          {(observations.length > 0 || rangeFeatures.length > 0) ? (
            <MapContainer center={mapCenter} zoom={3} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                attribution="&copy; Esri"
              />

              {/* IUCN Range polygons */}
              {showRanges && rangeFeatures.map(({ geojson, species: sp }, i) => (
                <GeoJSON
                  key={`range-${sp.id || i}`}
                  data={geojson}
                  style={() => ({
                    color: getStatusColor(sp.iucn_status),
                    weight: 1.5,
                    opacity: 0.85,
                    fillColor: getStatusColor(sp.iucn_status),
                    fillOpacity: 0.18,
                  })}
                  onEachFeature={(feature, layer) => {
                    layer.bindPopup(`
                      <div style="min-width:160px">
                        <p style="font-weight:600;font-style:italic;margin:0 0 4px">${sp.scientific_name}</p>
                        ${sp.common_name ? `<p style="font-size:11px;color:#555;margin:0 0 4px">${sp.common_name}</p>` : ''}
                        <span style="font-size:11px;background:${getStatusColor(sp.iucn_status)};color:#fff;padding:2px 7px;border-radius:4px">${sp.iucn_status || 'NE'}</span>
                        <p style="font-size:10px;color:#888;margin:5px 0 0">IUCN Range Polygon</p>
                      </div>
                    `);
                  }}
                />
              ))}

              {/* Occurrence markers */}
              {showPoints && observations.map((obs, idx) => (
                <Marker key={`obs-${idx}`} position={[obs.latitude, obs.longitude]}>
                  <Popup>
                    <div className="p-1 min-w-[160px]">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{obs.species.common_name || obs.species.scientific_name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${obs.source === 'GBIF' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {obs.source === 'GBIF' ? 'GBIF' : 'iNat'}
                        </span>
                      </div>
                      <p className="text-xs italic text-slate-500 mb-1">{obs.species.scientific_name}</p>
                      <StatusBadge status={obs.species.iucn_status} size="sm" />
                      {obs.location && <p className="text-xs text-slate-600 mt-1 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{obs.location}</p>}
                      {obs.observed_on && <p className="text-xs text-slate-500 mt-1">Observed: {obs.observed_on}</p>}
                      <button onClick={() => onSelect(obs.species)} className="mt-2 text-xs text-blue-600 hover:underline">
                        {selectedIds.includes(obs.species.id || obs.species.scientific_name) ? 'Deselect' : 'Select'} species
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No distribution data available</p>
                <p className="text-sm text-slate-400 mt-1">Points: {observations.length} · Ranges: {rangeFeatures.length}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Range data info banner */}
      {rangeFeatures.length === 0 && filtered.some(sp => sp.iucn_id) && (
        <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <strong>No range polygons loaded.</strong> To see IUCN range overlays: select species → Download → Fetch to Backend, or use the IUCN Bulk Extract panel under Data Tidying.
        </div>
      )}
    </div>
  );
}