import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MessageSquare, Flag, Zap, X, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const severityColors = {
  info: '#3b82f6',
  warning: '#f59e0b',
  critical: '#ef4444'
};

const annotationIcons = {
  comment: MessageSquare,
  flag: Flag,
  rerun_request: Zap
};

const MapClickHandler = ({ onMapClick }) => {
  const map = useMap();

  React.useEffect(() => {
    map.on('click', (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });
    return () => map.off('click');
  }, [map, onMapClick]);

  return null;
};

export default function SDMAnnotationMap({ sdmRun, annotations = [], onCreateAnnotation, onAnnotationSelect, canEdit = true }) {
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [creatingAnnotation, setCreatingAnnotation] = useState(null);
  const [filterType, setFilterType] = useState('all');

  // Calculate map bounds from prediction grid
  const bounds = useMemo(() => {
    if (!sdmRun?.prediction_grid || sdmRun.prediction_grid.length === 0) {
      return [[0, 0], [10, 10]];
    }
    const lats = sdmRun.prediction_grid.map(p => p.lat);
    const lons = sdmRun.prediction_grid.map(p => p.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    return [[minLat, minLon], [maxLat, maxLon]];
  }, [sdmRun]);

  const filteredAnnotations = useMemo(() => {
    if (filterType === 'all') return annotations;
    if (filterType === 'resolved') return annotations.filter(a => a.resolved);
    if (filterType === 'unresolved') return annotations.filter(a => !a.resolved);
    return annotations.filter(a => a.annotation_type === filterType);
  }, [annotations, filterType]);

  const handleMapClick = (lat, lon) => {
    if (canEdit) {
      setCreatingAnnotation({ lat, lon });
    }
  };

  const handleAnnotationClick = (annotation, e) => {
    e.preventDefault();
    setSelectedAnnotation(annotation);
    if (onAnnotationSelect) {
      onAnnotationSelect(annotation);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filterType === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterType('all')}
        >
          All ({annotations.length})
        </Button>
        <Button
          size="sm"
          variant={filterType === 'unresolved' ? 'default' : 'outline'}
          onClick={() => setFilterType('unresolved')}
        >
          Unresolved ({annotations.filter(a => !a.resolved).length})
        </Button>
        <Button
          size="sm"
          variant={filterType === 'comment' ? 'default' : 'outline'}
          onClick={() => setFilterType('comment')}
        >
          Comments ({annotations.filter(a => a.annotation_type === 'comment').length})
        </Button>
        <Button
          size="sm"
          variant={filterType === 'flag' ? 'default' : 'outline'}
          onClick={() => setFilterType('flag')}
        >
          Flags ({annotations.filter(a => a.annotation_type === 'flag').length})
        </Button>
        <Button
          size="sm"
          variant={filterType === 'rerun_request' ? 'default' : 'outline'}
          onClick={() => setFilterType('rerun_request')}
        >
          Reruns ({annotations.filter(a => a.annotation_type === 'rerun_request').length})
        </Button>
      </div>

      {/* Map */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Distribution Map {canEdit && <span className="text-xs font-normal text-slate-500">(Click to annotate)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 rounded-lg overflow-hidden border border-slate-200">
            <MapContainer bounds={bounds} zoom={5} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />

              {/* Prediction suitability overlay */}
              {sdmRun?.prediction_grid?.slice(0, 5000).map((point, idx) => (
                <CircleMarker
                  key={idx}
                  center={[point.lat, point.lon]}
                  radius={2}
                  fillColor={`rgba(0, 0, 255, ${point.suitability || 0})`}
                  color="transparent"
                  fillOpacity={0.3}
                />
              ))}

              {/* Annotations */}
              {filteredAnnotations.map((annotation) => {
                const Icon = annotationIcons[annotation.annotation_type];
                const color = severityColors[annotation.severity];

                return (
                  <CircleMarker
                    key={annotation.id}
                    center={[annotation.latitude, annotation.longitude]}
                    radius={annotation.radius_km ? (annotation.radius_km / 111) * 100 : 8}
                    fillColor={color}
                    color={color}
                    weight={2}
                    opacity={annotation.resolved ? 0.5 : 1}
                    fillOpacity={0.6}
                    eventHandlers={{
                      click: (e) => handleAnnotationClick(annotation, e)
                    }}
                  >
                    <Popup>
                      <div className="text-sm space-y-2">
                        <div className="font-semibold">{annotation.title}</div>
                        <div className="text-xs text-slate-600">{annotation.content}</div>
                        <div className="text-xs">
                          <div>by {annotation.created_by_name}</div>
                          <div>{format(new Date(annotation.created_date), 'PP p')}</div>
                        </div>
                        {annotation.resolved && (
                          <div className="bg-green-50 text-green-700 text-xs p-2 rounded">
                            ✓ Resolved: {annotation.resolution_notes}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

              <MapClickHandler onMapClick={handleMapClick} />
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Annotations List */}
      {filteredAnnotations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Annotations ({filteredAnnotations.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {filteredAnnotations.map((annotation) => {
              const Icon = annotationIcons[annotation.annotation_type];

              return (
                <div
                  key={annotation.id}
                  onClick={() => handleAnnotationClick(annotation)}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    selectedAnnotation?.id === annotation.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  } ${annotation.resolved ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-600" />
                      <span className="font-medium text-sm">{annotation.title}</span>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {annotation.annotation_type.replace('_', ' ')}
                      </Badge>
                      {annotation.severity !== 'info' && (
                        <Badge
                          className={`text-xs ${
                            annotation.severity === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {annotation.severity}
                        </Badge>
                      )}
                      {annotation.resolved && (
                        <Badge className="bg-green-100 text-green-800 text-xs">Resolved</Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-2">{annotation.content}</p>

                  <div className="text-xs text-slate-500 flex justify-between">
                    <span>
                      📍 {annotation.latitude.toFixed(2)}, {annotation.longitude.toFixed(2)}
                    </span>
                    <span>{annotation.created_by_name}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}