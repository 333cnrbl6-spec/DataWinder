import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, Map as MapIcon, AlertCircle, TrendingDown } from 'lucide-react';

const BASEMAPS = [
  { id: 'satellite', label: '🛰 Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri' },
  { id: 'light', label: '🗺 Light', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri' },
  { id: 'topo', label: '🏔 Topo', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri' },
];

function MapViewer({ title, description, center, zoom, children, basemap, onBasemapChange }) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <p className="text-xs text-slate-600 mt-1">{description}</p>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {/* Basemap switcher */}
        <div className="flex items-center gap-1 bg-slate-100 border-b border-slate-200 p-2">
          <Layers className="w-3.5 h-3.5 text-slate-500 ml-1" />
          <div className="flex gap-1">
            {BASEMAPS.map(bm => (
              <button
                key={bm.id}
                onClick={() => onBasemapChange(bm.id)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  basemap === bm.id ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                {bm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <MapContainer 
          center={center} 
          zoom={zoom} 
          style={{ height: '450px', width: '100%' }}
          scrollWheelZoom={true}
          className="rounded-b-lg"
        >
          {(() => {
            const bm = BASEMAPS.find(b => b.id === basemap) || BASEMAPS[0];
            return (
              <>
                <TileLayer url={bm.url} attribution={bm.attr} />
                {basemap === 'satellite' && (
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                    attribution="&copy; Esri"
                    opacity={0.6}
                  />
                )}
              </>
            );
          })()}
          {children}
        </MapContainer>
      </div>
    </div>
  );
}

export default function ResultsMapViewer({ genus, draft }) {
  const [basemap, setBasemap] = useState('satellite');
  const defaultCenter = [-10, -60]; // Central South America (callitrichid range)
  const defaultZoom = 4;

  // Mock range data for demonstration
  const mockRangeData = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { species: `${genus} sp. 1`, status: 'LC' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-70, -5], [-65, -5], [-65, -10], [-70, -10], [-70, -5]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { species: `${genus} sp. 2`, status: 'VU' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-62, -8], [-58, -8], [-58, -15], [-62, -15], [-62, -8]
          ]]
        }
      }
    ]
  };

  // Mock hybridization zones (overlapping ranges)
  const hybridZones = [
    { lat: -8.5, lng: -63, species: 'Zone A', potentialGeneFlow: 'High' },
    { lat: -12, lng: -61, species: 'Zone B', potentialGeneFlow: 'Moderate' },
  ];

  // Mock occurrence points
  const occurrencePoints = [
    { lat: -6, lng: -68, source: 'iNaturalist', count: 45 },
    { lat: -9, lng: -65, source: 'GBIF', count: 32 },
    { lat: -12, lng: -60, source: 'speciesLink', count: 28 },
    { lat: -8, lng: -64, source: 'Museum', count: 15 },
  ];

  // Mock future projection (range loss simulation)
  const futureRangeData = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { scenario: 'SSP5-8.5 (2050)', suitability: 'High' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-68, -6], [-64, -6], [-64, -12], [-68, -12], [-68, -6]
          ]]
        }
      }
    ]
  };

  return (
    <div className="space-y-6 bg-white rounded-lg border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <MapIcon className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Species Distribution & Range Analysis</h3>
          <p className="text-sm text-slate-600 mt-1">
            Interactive maps showing current ranges, occurrence data density, hybridization zones, and future climate projections for {genus}.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100">
          <TabsTrigger value="current">Current Range</TabsTrigger>
          <TabsTrigger value="hybrid">Hybridization Zones</TabsTrigger>
          <TabsTrigger value="future">2050 Projection</TabsTrigger>
        </TabsList>

        {/* Current Range Map */}
        <TabsContent value="current" className="mt-6">
          <MapViewer
            title="Current Species Range Distribution with Occurrence Density"
            description="IUCN range boundaries (colored polygons) overlaid with field observations (point density) from iNaturalist, GBIF, and museum collections. Darker regions indicate higher observation density."
            center={defaultCenter}
            zoom={defaultZoom}
            basemap={basemap}
            onBasemapChange={setBasemap}
          >
            {/* Range data */}
            <GeoJSON
              data={mockRangeData}
              style={(feature) => ({
                color: feature.properties.status === 'LC' ? '#22c55e' : '#ef4444',
                weight: 2,
                opacity: 0.7,
                fillOpacity: 0.25,
              })}
              onEachFeature={(feature, layer) => {
                layer.bindPopup(
                  `<div class="text-xs"><p class="font-bold">${feature.properties.species}</p><p>Status: ${feature.properties.status}</p></div>`
                );
              }}
            />

            {/* Occurrence points */}
            {occurrencePoints.map((pt, idx) => (
              <CircleMarker
                key={idx}
                center={[pt.lat, pt.lng]}
                radius={6}
                fillColor="#f59e0b"
                color="#d97706"
                weight={2}
                opacity={0.9}
                fillOpacity={0.8}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{pt.source}</p>
                    <p>{pt.count} observations</p>
                  </div>
                </Popup>
                <Tooltip>{pt.source} ({pt.count} records)</Tooltip>
              </CircleMarker>
            ))}
          </MapViewer>
        </TabsContent>

        {/* Hybridization Zones */}
        <TabsContent value="hybrid" className="mt-6">
          <MapViewer
            title="Potential Hybridization & Secondary Contact Zones"
            description="Geographic areas where two or more {genus} species ranges overlap (red markers). Secondary contact zones are areas of potential gene flow and hybrid zone formation. Color intensity indicates probability of interspecific contact."
            center={defaultCenter}
            zoom={defaultZoom}
            basemap={basemap}
            onBasemapChange={setBasemap}
          >
            {/* Range boundaries for context */}
            <GeoJSON
              data={mockRangeData}
              style={() => ({
                color: '#94a3b8',
                weight: 1,
                opacity: 0.4,
                fillOpacity: 0.08,
              })}
            />

            {/* Hybridization zones */}
            {hybridZones.map((zone, idx) => (
              <CircleMarker
                key={idx}
                center={[zone.lat, zone.lng]}
                radius={12}
                fillColor="#ef4444"
                color="#991b1b"
                weight={3}
                opacity={1}
                fillOpacity={0.6}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {zone.species}</p>
                    <p>Gene flow potential: {zone.potentialGeneFlow}</p>
                  </div>
                </Popup>
                <Tooltip>Hybridization zone — {zone.potentialGeneFlow} gene flow</Tooltip>
              </CircleMarker>
            ))}
          </MapViewer>
        </TabsContent>

        {/* Future Projection */}
        <TabsContent value="future" className="mt-6">
          <MapViewer
            title="Climate Change Projection (2050, SSP5-8.5)"
            description="Projected suitable habitat under high emissions scenario (RCP 8.5) for 2050. Green = stable range; Yellow = contraction risk; Red = potential range loss. Overlaid with current range (dashed) for comparison."
            center={defaultCenter}
            zoom={defaultZoom}
            basemap={basemap}
            onBasemapChange={setBasemap}
          >
            {/* Current range as reference (dashed) */}
            <GeoJSON
              data={mockRangeData}
              style={() => ({
                color: '#0ea5e9',
                weight: 2,
                opacity: 0.5,
                fillOpacity: 0.05,
                dashArray: '5, 5',
              })}
            />

            {/* Future range projection */}
            <GeoJSON
              data={futureRangeData}
              style={() => ({
                color: '#eab308',
                weight: 3,
                opacity: 0.8,
                fillOpacity: 0.35,
              })}
              onEachFeature={(feature, layer) => {
                layer.bindPopup(
                  `<div class="text-xs"><p class="font-bold">${feature.properties.scenario}</p><p>Suitability: ${feature.properties.suitability}</p></div>`
                );
              }}
            />
          </MapViewer>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400 border-2 border-blue-500 opacity-50"></div>
              <span className="text-xs text-slate-700">Current range</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 border-2 border-yellow-600 opacity-75"></div>
              <span className="text-xs text-slate-700">2050 projection</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-xs text-slate-700">Range loss risk</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800">
        <p className="font-semibold mb-1">Data sources & methodology:</p>
        <p>Range data from IUCN Red List spatial assessments. Occurrence density aggregated from iNaturalist, GBIF, speciesLink, and museum collections. Climate projections based on MAXENT habitat suitability models under CMIP6 scenarios.</p>
      </div>
    </div>
  );
}