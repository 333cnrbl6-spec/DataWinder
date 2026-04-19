import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, MapPin, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * SDM Prediction Map & Occurrence Visualization
 * 
 * Interactive heatmap showing species suitability predictions
 * and input occurrence points used in the model
 */

export default function SDMPredictionMap({ grid = [], occurrences = [] }) {
  const [mapInstance, setMapInstance] = useState(null);
  const [showOccurrences, setShowOccurrences] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);

  useEffect(() => {
    // Dynamically load Leaflet and plugins
    loadMapLibraries();
  }, []);

  useEffect(() => {
    if (mapInstance && grid.length > 0) {
      renderMap();
    }
  }, [mapInstance, grid, showOccurrences, showGrid, selectedCell]);

  const loadMapLibraries = async () => {
    try {
      // Load Leaflet CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(cssLink);

      // Load Leaflet JS
      const scriptL = document.createElement('script');
      scriptL.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      scriptL.onload = () => {
        // Load Leaflet Heatmap plugin
        const scriptH = document.createElement('script');
        scriptH.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet-heatmap/1.0.3/leaflet-heatmap.min.js';
        scriptH.onload = () => {
          initMap();
        };
        document.body.appendChild(scriptH);
      };
      document.body.appendChild(scriptL);
    } catch (error) {
      console.error('Failed to load map libraries:', error);
      toast.error('Failed to load map');
    }
  };

  const initMap = () => {
    try {
      const L = window.L;
      if (!L) return;

      // Create map centered on world
      const map = L.map('sdm-map', {
        center: [20, 0],
        zoom: 2,
        maxZoom: 8,
        minZoom: 1
      });

      // Base layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      setMapInstance(map);
      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setLoading(false);
    }
  };

  const renderMap = () => {
    if (!mapInstance || grid.length === 0) return;

    try {
      const L = window.L;

      // Remove existing layers
      mapInstance.eachLayer(layer => {
        if (layer instanceof L.FeatureGroup || layer instanceof L.LayerGroup || layer.setStyle) {
          if (layer !== mapInstance) {
            mapInstance.removeLayer(layer);
          }
        }
      });

      // Render suitability grid
      if (showGrid && grid.length > 0) {
        renderSuitabilityGrid();
      }

      // Render occurrence points
      if (showOccurrences && occurrences.length > 0) {
        renderOccurrencePoints();
      }

      // Fit bounds
      const allPoints = [...grid, ...occurrences];
      if (allPoints.length > 0) {
        const lats = allPoints.map(p => p.lat || p.latitude);
        const lons = allPoints.map(p => p.lon || p.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);

        if (minLat !== maxLat && minLon !== maxLon) {
          mapInstance.fitBounds([
            [minLat - 5, minLon - 5],
            [maxLat + 5, maxLon + 5]
          ], { padding: [50, 50] });
        }
      }
    } catch (error) {
      console.error('Failed to render map:', error);
    }
  };

  const renderSuitabilityGrid = () => {
    const L = window.L;
    const heatData = grid.map(cell => [
      cell.lat,
      cell.lon,
      cell.suitability // 0-1 intensity
    ]);

    const heatLayer = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 8,
      max: 1,
      min: 0,
      gradient: {
        0.0: '#0000ff',    // Blue - low suitability
        0.25: '#00ff00',   // Green
        0.5: '#ffff00',    // Yellow
        0.75: '#ff7f00',   // Orange
        1.0: '#ff0000'     // Red - high suitability
      }
    }).addTo(mapInstance);
  };

  const renderOccurrencePoints = () => {
    const L = window.L;
    
    occurrences.forEach((occ, idx) => {
      const lat = occ.lat || occ.latitude;
      const lon = occ.lon || occ.longitude;

      const marker = L.circleMarker([lat, lon], {
        radius: 5,
        fillColor: '#2563eb',
        color: '#1e40af',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.6
      });

      marker.bindPopup(`<div class="text-xs">
        <p class="font-semibold">${occ.species || 'Species'}</p>
        <p>Lat: ${lat.toFixed(4)}</p>
        <p>Lon: ${lon.toFixed(4)}</p>
      </div>`);

      marker.addTo(mapInstance);
    });
  };

  const handleExportGrid = () => {
    if (grid.length === 0) {
      toast.error('No grid data to export');
      return;
    }

    const csv = 'latitude,longitude,suitability\n' +
      grid.map(cell => `${cell.lat},${cell.lon},${cell.suitability}`).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sdm-prediction-grid.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Grid exported');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-slate-50 border-b">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">Species Distribution Map</span>
          <Badge variant="outline" className="text-xs">
            {grid.length} grid cells | {occurrences.length} occurrences
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showGrid ? 'default' : 'outline'}
            onClick={() => setShowGrid(!showGrid)}
            className="h-8 text-xs gap-1"
          >
            {showGrid ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Suitability
          </Button>
          <Button
            size="sm"
            variant={showOccurrences ? 'default' : 'outline'}
            onClick={() => setShowOccurrences(!showOccurrences)}
            className="h-8 text-xs gap-1"
          >
            {showOccurrences ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Points
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportGrid}
            className="h-8 text-xs gap-1"
          >
            <Download className="w-3 h-3" />
            Export
          </Button>
        </div>
      </div>

      <div id="sdm-map" className="w-full h-96 bg-slate-100" />

      {/* Legend */}
      <div className="p-3 bg-white border-t text-xs text-slate-600 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Suitability Scale</span>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600 rounded" />
          </div>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Low Suitability</span>
          <span>High Suitability</span>
        </div>
        <p className="text-xs text-slate-500 italic">
          Blue points = cleaned occurrence records | Heatmap = predicted species suitability
        </p>
      </div>
    </Card>
  );
}