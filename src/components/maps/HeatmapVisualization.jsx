import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-heatmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Flame, Calendar } from 'lucide-react';

const HeatmapLayer = ({ data, threatCategory, startDate, endDate }) => {
  const map = useMap();
  const heatmapRef = React.useRef(null);

  useEffect(() => {
    if (!map || !data || data.length === 0) return;

    // Filter data by threat category and date range
    const filteredData = data.filter(point => {
      const matchesThreat = !threatCategory || threatCategory === 'all' || point.threat_category === threatCategory;
      const pointDate = new Date(point.date);
      const matchesDate = (!startDate || pointDate >= new Date(startDate)) && 
                          (!endDate || pointDate <= new Date(endDate));
      return matchesThreat && matchesDate;
    });

    if (filteredData.length === 0) {
      if (heatmapRef.current) {
        map.removeLayer(heatmapRef.current);
        heatmapRef.current = null;
      }
      return;
    }

    // Remove existing heatmap
    if (heatmapRef.current) {
      map.removeLayer(heatmapRef.current);
    }

    // Transform data to heatmap format [lat, lon, intensity]
    const heatmapData = filteredData.map(point => [
      point.lat,
      point.lon,
      point.intensity || 1
    ]);

    // Create heatmap layer
    const heatmapLayer = L.heatLayer(heatmapData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: Math.max(...filteredData.map(p => p.intensity || 1)),
      gradient: {
        0.0: '#3288bd',
        0.2: '#66c2a5',
        0.4: '#abdda4',
        0.6: '#ffffbf',
        0.8: '#fdae61',
        1.0: '#d73027'
      }
    });

    heatmapLayer.addTo(map);
    heatmapRef.current = heatmapLayer;

    return () => {
      if (heatmapRef.current && map.hasLayer(heatmapRef.current)) {
        map.removeLayer(heatmapRef.current);
      }
    };
  }, [map, data, threatCategory, startDate, endDate]);

  return null;
};

export default function HeatmapVisualization({ occurrences, threats, title = 'Species Density Heatmap' }) {
  const [threatCategory, setThreatCategory] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mapCenter, setMapCenter] = useState([20, 0]);
  const [zoom, setZoom] = useState(2);

  // Transform occurrences and threats into heatmap data
  const heatmapData = React.useMemo(() => {
    if (!occurrences || occurrences.length === 0) return [];

    return occurrences.map(occ => {
      const threat = threats?.find(t => t.species_id === occ.species_id);
      return {
        lat: occ.lat || occ.latitude,
        lon: occ.lon || occ.longitude,
        date: occ.date || occ.occurrence_date,
        threat_category: threat?.threat_category || 'Unknown',
        intensity: threat?.threat_score ? threat.threat_score / 100 : 0.5
      };
    });
  }, [occurrences, threats]);

  // Calculate map center from data
  useEffect(() => {
    if (heatmapData.length > 0) {
      const lats = heatmapData.map(d => d.lat);
      const lons = heatmapData.map(d => d.lon);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
      setMapCenter([centerLat, centerLon]);
    }
  }, [heatmapData]);

  const threatCategories = ['all', 'Critical', 'High', 'Moderate', 'Low'];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-600" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              Threat Category
            </label>
            <Select value={threatCategory} onValueChange={setThreatCategory}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {threatCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-8 px-2 py-1 text-xs border rounded-md"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-8 px-2 py-1 text-xs border rounded-md"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-600">Heat Intensity</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-6 rounded bg-gradient-to-r from-blue-500 via-yellow-400 to-red-600"></div>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Low Density</span>
            <span>High Density</span>
          </div>
        </div>

        {/* Map */}
        <div className="w-full h-96 rounded-lg overflow-hidden border border-slate-200">
          {heatmapData.length > 0 ? (
            <MapContainer center={mapCenter} zoom={zoom} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <HeatmapLayer 
                data={heatmapData}
                threatCategory={threatCategory}
                startDate={startDate}
                endDate={endDate}
              />
            </MapContainer>
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
              <div className="text-center">
                <Flame className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No occurrence data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Data Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-50 p-2 rounded">
            <div className="text-slate-500">Total Points</div>
            <div className="font-semibold text-lg">{heatmapData.length}</div>
          </div>
          <div className="bg-slate-50 p-2 rounded">
            <div className="text-slate-500">Filtered Points</div>
            <div className="font-semibold text-lg">
              {heatmapData.filter(d => {
                const matchesThreat = !threatCategory || threatCategory === 'all' || d.threat_category === threatCategory;
                const pointDate = new Date(d.date);
                const matchesDate = (!startDate || pointDate >= new Date(startDate)) && 
                                    (!endDate || pointDate <= new Date(endDate));
                return matchesThreat && matchesDate;
              }).length}
            </div>
          </div>
          <div className="bg-slate-50 p-2 rounded">
            <div className="text-slate-500">Threat Range</div>
            <div className="font-semibold">{threatCategory === 'all' ? 'All' : threatCategory}</div>
          </div>
          <div className="bg-slate-50 p-2 rounded">
            <div className="text-slate-500">Coverage</div>
            <div className="font-semibold">Global</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}