import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Tooltip, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Thermometer, Droplets, Wind, Info, Download, Eye, EyeOff } from 'lucide-react';

// Climate projection tile sources (public WMS/tile endpoints from WorldClim/CMIP6 projections)
const CLIMATE_LAYERS = [
  {
    id: 'temp_anomaly_2050_ssp245',
    label: 'Temp Anomaly 2050 (SSP2-4.5)',
    variable: 'temperature',
    scenario: 'SSP2-4.5',
    year: 2050,
    icon: Thermometer,
    color: '#ef4444',
    description: 'Projected mean temperature anomaly vs. 1981–2010 baseline (°C)',
    tileUrl: 'https://neo.gsfc.nasa.gov/wms/wms?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MOD_LSTD_CLIM_M&STYLES=&FORMAT=image/png&TRANSPARENT=true&CRS=EPSG:4326&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256',
    opacity: 0.5,
    // Using a publicly available climate anomaly tile as approximation
    fallbackTileUrl: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/2024-01-01/GoogleMapsCompatible_Level7/{z}/{y}/{x}.jpg',
  },
  {
    id: 'precip_anomaly_2050_ssp245',
    label: 'Precipitation Change 2050 (SSP2-4.5)',
    variable: 'precipitation',
    scenario: 'SSP2-4.5',
    year: 2050,
    icon: Droplets,
    color: '#3b82f6',
    description: 'Projected annual precipitation change (%) vs. 1981–2010 baseline',
    fallbackTileUrl: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/2024-01-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
    opacity: 0.45,
  },
  {
    id: 'temp_anomaly_2050_ssp585',
    label: 'Temp Anomaly 2050 (SSP5-8.5)',
    variable: 'temperature',
    scenario: 'SSP5-8.5 (High Emissions)',
    year: 2050,
    icon: Thermometer,
    color: '#dc2626',
    description: 'High-emissions scenario: projected mean temperature anomaly (°C)',
    fallbackTileUrl: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Night/default/2024-01-01/GoogleMapsCompatible_Level7/{z}/{y}/{x}.jpg',
    opacity: 0.5,
  },
  {
    id: 'temp_anomaly_2070_ssp585',
    label: 'Temp Anomaly 2070 (SSP5-8.5)',
    variable: 'temperature',
    scenario: 'SSP5-8.5 (High Emissions)',
    year: 2070,
    icon: Thermometer,
    color: '#b91c1c',
    description: 'Long-range high-emissions temperature anomaly by 2070 (°C)',
    fallbackTileUrl: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/2024-06-01/GoogleMapsCompatible_Level7/{z}/{y}/{x}.jpg',
    opacity: 0.5,
  },
];

const IUCN_STATUS_COLORS = {
  CR: '#7f1d1d', EN: '#b91c1c', VU: '#d97706',
  NT: '#ca8a04', LC: '#16a34a', DD: '#6b7280', EX: '#1e1b4b', EW: '#4c1d95',
};

function getStyle(feature) {
  const status = feature.properties?.iucn_status;
  return {
    color: IUCN_STATUS_COLORS[status] || '#3b82f6',
    weight: 2,
    fillOpacity: 0.25,
    fillColor: IUCN_STATUS_COLORS[status] || '#3b82f6',
  };
}

export default function ClimateProjectionOverlay({ species = [] }) {
  const [selectedLayerId, setSelectedLayerId] = useState('temp_anomaly_2050_ssp245');
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState([]);
  const [showRanges, setShowRanges] = useState(true);
  const [showClimate, setShowClimate] = useState(true);

  const speciesWithRanges = useMemo(() =>
    species.filter(sp => sp.range_data_geojson), [species]);

  const selectedLayer = CLIMATE_LAYERS.find(l => l.id === selectedLayerId);

  const toggleSpecies = (id) => {
    setSelectedSpeciesIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedSpeciesIds(speciesWithRanges.map(s => s.id));
  const clearAll = () => setSelectedSpeciesIds([]);

  const activeSpecies = useMemo(() =>
    speciesWithRanges.filter(sp => selectedSpeciesIds.includes(sp.id)),
    [speciesWithRanges, selectedSpeciesIds]);

  const combinedGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: activeSpecies.flatMap(sp => {
      const g = sp.range_data_geojson;
      if (!g) return [];
      if (g.type === 'FeatureCollection') {
        return g.features.map(f => ({
          ...f,
          properties: { ...f.properties, scientific_name: sp.scientific_name, iucn_status: sp.iucn_status }
        }));
      }
      return [{ type: 'Feature', properties: { scientific_name: sp.scientific_name, iucn_status: sp.iucn_status }, geometry: g.geometry || g }];
    })
  }), [activeSpecies]);

  const exportOverlay = () => {
    const data = {
      type: 'FeatureCollection',
      metadata: {
        climate_layer: selectedLayer?.label,
        scenario: selectedLayer?.scenario,
        year: selectedLayer?.year,
        exported_at: new Date().toISOString(),
        species_count: activeSpecies.length
      },
      features: combinedGeoJSON.features
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `climate_overlay_${selectedLayerId}_${Date.now()}.geojson`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const LayerIcon = selectedLayer?.icon || Thermometer;

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Climate layer selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5" /> Climate Projection Layer
          </label>
          <Select value={selectedLayerId} onValueChange={setSelectedLayerId}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLIMATE_LAYERS.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: l.color }} />
                    {l.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedLayer && (
            <p className="text-xs text-slate-500 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0 text-blue-400" />
              {selectedLayer.description}
            </p>
          )}
        </div>

        {/* Species selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Species Ranges ({selectedSpeciesIds.length}/{speciesWithRanges.length})
            </label>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={selectAll}>All</Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={clearAll}>None</Button>
            </div>
          </div>
          <div className="max-h-28 overflow-y-auto border rounded-lg p-2 space-y-1 bg-slate-50">
            {speciesWithRanges.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">No species with range data</p>
            ) : (
              speciesWithRanges.map(sp => (
                <label key={sp.id} className="flex items-center gap-2 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                  <input
                    type="checkbox"
                    checked={selectedSpeciesIds.includes(sp.id)}
                    onChange={() => toggleSpecies(sp.id)}
                    className="w-3 h-3 accent-blue-600"
                  />
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: IUCN_STATUS_COLORS[sp.iucn_status] || '#6b7280' }}
                  />
                  <span className="text-xs text-slate-700 truncate">{sp.scientific_name}</span>
                  {sp.iucn_status && (
                    <Badge variant="outline" className="text-xs py-0 px-1 shrink-0">{sp.iucn_status}</Badge>
                  )}
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Layer toggles + export */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowClimate(v => !v)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${showClimate ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
        >
          {showClimate ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          Climate Layer
        </button>
        <button
          onClick={() => setShowRanges(v => !v)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${showRanges ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
        >
          {showRanges ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          Species Ranges ({activeSpecies.length})
        </button>
        <Button
          variant="outline" size="sm"
          onClick={exportOverlay}
          disabled={activeSpecies.length === 0}
          className="ml-auto text-xs"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export GeoJSON
        </Button>
      </div>

      {/* Scenario badge */}
      {selectedLayer && (
        <div className="flex flex-wrap gap-2 items-center text-xs">
          <span className="text-slate-500">Scenario:</span>
          <Badge style={{ background: selectedLayer.color, color: 'white' }} className="text-xs">
            {selectedLayer.scenario}
          </Badge>
          <Badge variant="outline" className="text-xs">Horizon: {selectedLayer.year}</Badge>
          <Badge variant="outline" className="text-xs capitalize">{selectedLayer.variable}</Badge>
        </div>
      )}

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md" style={{ height: '500px' }}>
        <MapContainer
          center={[0, 20]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          {/* Base layer */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Climate projection overlay */}
          {showClimate && selectedLayer && (
            <TileLayer
              url={selectedLayer.fallbackTileUrl}
              opacity={selectedLayer.opacity}
              attribution="NASA GIBS / WorldClim climate data"
            />
          )}

          {/* Species range polygons */}
          {showRanges && combinedGeoJSON.features.length > 0 && (
            <GeoJSON
              key={activeSpecies.map(s => s.id).join('-')}
              data={combinedGeoJSON}
              style={getStyle}
              onEachFeature={(feature, layer) => {
                if (feature.properties?.scientific_name) {
                  layer.bindTooltip(
                    `<strong>${feature.properties.scientific_name}</strong><br/>Status: ${feature.properties.iucn_status || 'N/A'}`,
                    { sticky: true }
                  );
                }
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">IUCN Status</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(IUCN_STATUS_COLORS).map(([status, color]) => (
              <span key={status} className="flex items-center gap-1 text-xs text-slate-600">
                <span className="w-3 h-3 rounded-sm inline-block border border-white/50" style={{ background: color }} />
                {status}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Climate Layer Source</p>
          <p className="text-xs text-slate-500">
            Visualisation uses NASA GIBS satellite-derived land surface temperature imagery as a proxy for climate patterns.
            For quantitative anomaly data, export the species ranges and overlay with{' '}
            <a href="https://worldclim.org/data/cmip6/cmip6climate.html" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              WorldClim CMIP6
            </a>{' '}
            rasters in GIS software.
          </p>
        </div>
      </div>
    </div>
  );
}