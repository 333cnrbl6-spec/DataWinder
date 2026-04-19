import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMapEvents } from 'react-leaflet';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Move, Save, X, AlertTriangle, CheckCircle2, Layers } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom high-contrast outlier marker
const createOutlierIcon = () => L.divIcon({
  className: 'outlier-marker',
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: #dc2626;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    "></div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.8; }
      }
    </style>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Normal marker (within range)
const createNormalIcon = () => L.divIcon({
  className: 'normal-marker',
  html: `
    <div style="
      width: 14px;
      height: 14px;
      background: #22c55e;
      border: 2px solid #fff;
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    "></div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Draggable marker for correction
const createDraggableIcon = (isDragging) => L.divIcon({
  className: 'draggable-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: ${isDragging ? '#f59e0b' : '#3b82f6'};
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: ${isDragging ? 'grabbing' : 'grab'};
      transition: all 0.2s;
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapClickHandler({ onMapClick, isCorrectionMode }) {
  useMapEvents({
    click: (e) => {
      if (isCorrectionMode) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

export default function OutlierCorrectionMap({ 
  outliers, 
  rangeData, 
  onUpdatePosition,
  onCancelCorrection,
  correctingOccurrence,
}) {
  const [selectedOutlier, setSelectedOutlier] = useState(null);
  const [showRanges, setShowRanges] = useState(true);
  const [correctionMode, setCorrectionMode] = useState(false);
  const [newPosition, setNewPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState([0, 20]);
  const [zoom, setZoom] = useState(3);

  useEffect(() => {
    if (outliers.length > 0) {
      const avgLat = outliers.reduce((sum, o) => sum + (o.latitude || 0), 0) / outliers.length;
      const avgLng = outliers.reduce((sum, o) => sum + (o.longitude || 0), 0) / outliers.length;
      setMapCenter([avgLat, avgLng]);
      setZoom(4);
    }
  }, [outliers]);

  const handleMarkerClick = useCallback((occ) => {
    if (correctionMode && correctingOccurrence?.id === occ.id) return;
    setSelectedOutlier(occ);
    setCorrectionMode(false);
    setNewPosition(null);
  }, [correctionMode, correctingOccurrence]);

  const handleStartCorrection = useCallback((occ) => {
    setSelectedOutlier(occ);
    setCorrectionMode(true);
    setNewPosition({ lat: occ.latitude, lng: occ.longitude });
  }, []);

  const handleMapClick = useCallback((latlng) => {
    if (correctionMode && selectedOutlier) {
      setNewPosition(latlng);
    }
  }, [correctionMode, selectedOutlier]);

  const handleSaveCorrection = useCallback(() => {
    if (selectedOutlier && newPosition) {
      onUpdatePosition({
        occurrence_id: selectedOutlier.id,
        new_latitude: newPosition.lat,
        new_longitude: newPosition.lng,
        species_id: selectedOutlier.species_id,
      });
      setCorrectionMode(false);
      setSelectedOutlier(null);
      setNewPosition(null);
    }
  }, [selectedOutlier, newPosition, onUpdatePosition]);

  const handleCancelCorrection = useCallback(() => {
    setCorrectionMode(false);
    setNewPosition(null);
    onCancelCorrection();
  }, [onCancelCorrection]);

  return (
    <Card className="overflow-hidden">
      <div className="relative" style={{ height: 600 }}>
        <MapContainer 
          center={mapCenter} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri"
          />

          {/* IUCN Range polygons */}
          {showRanges && rangeData && (
            <GeoJSON
              data={rangeData}
              style={() => ({
                color: '#10b981',
                weight: 2,
                opacity: 0.9,
                fillColor: '#10b981',
                fillOpacity: 0.15,
              })}
            />
          )}

          {/* Outlier markers */}
          {outliers.map((occ) => {
            const isCorrecting = correctionMode && correctingOccurrence?.id === occ.id;
            const isSelected = selectedOutlier?.id === occ.id;
            const position = isCorrecting && newPosition 
              ? [newPosition.lat, newPosition.lng]
              : [occ.latitude, occ.longitude];

            return (
              <Marker
                key={occ.id}
                position={position}
                icon={isCorrecting ? createDraggableIcon(!!newPosition) : createOutlierIcon()}
                draggable={isCorrecting}
                onDrag={isCorrecting ? (e) => setNewPosition(e.target.getLatLng()) : undefined}
                onClick={() => isCorrecting ? null : handleMarkerClick(occ)}
              >
                <Popup>
                  <div className="p-1 min-w-[200px]">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-slate-900">{occ.species_name || 'Unknown Species'}</h4>
                      <Badge variant="destructive" className="text-xs shrink-0">Outlier</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {occ.message || 'Outside known range'}
                    </p>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p><strong>Lat:</strong> {occ.latitude?.toFixed(5)}</p>
                      <p><strong>Lon:</strong> {occ.longitude?.toFixed(5)}</p>
                      {occ.source && <p><strong>Source:</strong> {occ.source}</p>}
                      {occ.occurrence_date && <p><strong>Date:</strong> {occ.occurrence_date}</p>}
                    </div>

                    {!correctionMode && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleStartCorrection(occ)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs h-8"
                        >
                          <Move className="w-3 h-3 mr-1" />
                          Correct Position
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOutlier(null)}
                          className="text-xs h-8"
                        >
                          Close
                        </Button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Map click handler for correction mode */}
          <MapClickHandler 
            onMapClick={handleMapClick} 
            isCorrectionMode={correctionMode} 
          />

          {/* Draggable marker preview during correction */}
          {correctionMode && newPosition && (
            <Marker
              position={[newPosition.lat, newPosition.lng]}
              icon={createDraggableIcon(true)}
              draggable
              onDrag={(e) => setNewPosition(e.target.getLatLng())}
            >
              <Popup>
                <div className="p-1 min-w-[180px]">
                  <p className="text-sm font-semibold text-slate-900 mb-2">New Position</p>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <p><strong>Lat:</strong> {newPosition.lat.toFixed(5)}</p>
                    <p><strong>Lon:</strong> {newPosition.lng.toFixed(5)}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveCorrection}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-8"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelCorrection}
                      className="text-xs h-8"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Map controls */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          <Button
            size="sm"
            variant={showRanges ? 'default' : 'outline'}
            onClick={() => setShowRanges(!showRanges)}
            className="bg-white shadow-md h-9"
          >
            <Layers className="w-4 h-4 mr-1" />
            {showRanges ? 'Hide Ranges' : 'Show Ranges'}
          </Button>
        </div>

        {/* Correction mode banner */}
        {correctionMode && (
          <div className="absolute top-3 left-3 right-16 z-[1000] bg-amber-50 border-2 border-amber-200 rounded-lg p-3 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Move className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Correction Mode</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Drag the blue marker or click on the map to set the correct position. Click <strong>Save</strong> to update.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelCorrection}
                className="h-8 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Exit
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow" />
              <span className="text-slate-600">{outliers.length} outliers</span>
            </div>
            {rangeData && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500" />
                <span className="text-slate-600">IUCN range loaded</span>
              </div>
            )}
          </div>
          {correctionMode && (
            <div className="flex items-center gap-2 text-amber-700">
              <Move className="w-4 h-4" />
              <span className="font-medium">Adjusting position…</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}