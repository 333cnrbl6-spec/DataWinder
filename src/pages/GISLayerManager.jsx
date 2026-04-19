import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, GeoJSON, Polygon, Popup, LayersControl } from 'react-leaflet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Map, Upload, Trash2, Layers, Pencil, Loader2, MapPin, Eye, EyeOff } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { format } from 'date-fns';

export default function GISLayerManager() {
  const { projectId } = useParams();
  const [basemap, setBasemap] = useState('osm');
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawnCoordinates, setDrawnCoordinates] = useState([]);
  const mapRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch project
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () =>
      base44.entities.Project.filter({ id: projectId }).then(p => p[0]),
    enabled: !!projectId
  });

  // Fetch boundaries
  const { data: boundaries = [] } = useQuery({
    queryKey: ['boundaries', projectId],
    queryFn: () =>
      base44.entities.GeoJSONBoundary.filter(
        { project_id: projectId },
        '-created_date',
        50
      ),
    enabled: !!projectId
  });

  // Fetch filters
  const { data: filters = [] } = useQuery({
    queryKey: ['polygon-filters', projectId],
    queryFn: () =>
      base44.entities.PolygonFilter.filter(
        { project_id: projectId },
        '-created_date',
        50
      ),
    enabled: !!projectId
  });

  // Upload boundary mutation
  const uploadBoundaryMutation = useMutation({
    mutationFn: async (file) => {
      const text = await file.text();
      const geojson = JSON.parse(text);

      return base44.functions.invoke('uploadGeoJSONBoundary', {
        project_id: projectId,
        name: file.name.replace(/\.[^/.]+$/, ''),
        geojson_data: geojson
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boundaries', projectId] });
    }
  });

  // Save polygon filter mutation
  const saveFilterMutation = useMutation({
    mutationFn: (filterData) =>
      base44.functions.invoke('savePolygonFilter', {
        project_id: projectId,
        ...filterData
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polygon-filters', projectId] });
      setDrawingMode(false);
      setDrawnCoordinates([]);
    }
  });

  // Toggle boundary visibility
  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ boundaryId, visible }) =>
      base44.entities.GeoJSONBoundary.update(boundaryId, { visible: !visible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boundaries', projectId] });
    }
  });

  // Delete boundary
  const deleteBoundaryMutation = useMutation({
    mutationFn: (boundaryId) =>
      base44.entities.GeoJSONBoundary.delete(boundaryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boundaries', projectId] });
    }
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadBoundaryMutation.mutate(file);
    }
  };

  const handleMapClick = (e) => {
    if (!drawingMode) return;

    const { lat, lng } = e.latlng;
    setDrawnCoordinates(prev => [...prev, [lng, lat]]);
  };

  const finishDrawing = () => {
    if (drawnCoordinates.length < 3) {
      alert('Polygon needs at least 3 points');
      return;
    }

    // Close polygon
    const closed = [
      ...drawnCoordinates,
      drawnCoordinates[0]
    ];

    saveFilterMutation.mutate({
      name: `Filter ${format(new Date(), 'PP')}`,
      polygon_coordinates: closed,
      species_ids: project?.species_ids || []
    });
  };

  const basemaps = [
    { id: 'osm', name: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
    { id: 'satellite', name: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
    { id: 'terrain', name: 'Terrain', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}' }
  ];

  const selectedBasemap = basemaps.find(b => b.id === basemap);

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Map className="w-8 h-8" />
            GIS Layer Manager
          </h1>
          <p className="text-slate-600">{project.title} • Interactive map for boundaries and spatial filtering</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basemap Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Base Map</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {basemaps.map(bm => (
                  <button
                    key={bm.id}
                    onClick={() => setBasemap(bm.id)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      basemap === bm.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{bm.name}</div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Drawing Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Drawing Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => {
                    setDrawingMode(!drawingMode);
                    if (drawingMode) {
                      setDrawnCoordinates([]);
                    }
                  }}
                  variant={drawingMode ? 'default' : 'outline'}
                  className="w-full"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  {drawingMode ? 'Cancel Drawing' : 'Draw Polygon'}
                </Button>

                {drawingMode && drawnCoordinates.length > 0 && (
                  <>
                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                      Points: {drawnCoordinates.length}
                    </div>
                    <Button
                      onClick={finishDrawing}
                      disabled={saveFilterMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {saveFilterMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Finish & Save'
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Layers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-600">Boundaries:</span>
                  <span className="font-medium ml-2">{boundaries.length}</span>
                </div>
                <div>
                  <span className="text-slate-600">Filters:</span>
                  <span className="font-medium ml-2">{filters.length}</span>
                </div>
                <div>
                  <span className="text-slate-600">Active filters:</span>
                  <span className="font-medium ml-2">
                    {filters.filter(f => f.filter_status === 'active').length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map and Tabs */}
          <div className="lg:col-span-3 space-y-6">
            {/* Map */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <MapContainer
                  ref={mapRef}
                  center={[20, 0]}
                  zoom={3}
                  style={{ height: '500px', width: '100%' }}
                  onClick={handleMapClick}
                >
                  <TileLayer
                    url={selectedBasemap.url}
                    attribution='&copy; OpenStreetMap contributors'
                  />

                  {/* Display boundaries */}
                  {boundaries.filter(b => b.visible).map(boundary => (
                    <GeoJSON
                      key={boundary.id}
                      data={boundary.geojson_data}
                      style={() => ({
                        color: boundary.color,
                        weight: 2,
                        opacity: 0.8,
                        fillOpacity: 0.1
                      })}
                    >
                      <Popup>
                        <div className="text-xs">
                          <strong>{boundary.name}</strong>
                          <div className="mt-1 text-slate-600">{boundary.feature_count} features</div>
                        </div>
                      </Popup>
                    </GeoJSON>
                  ))}

                  {/* Display polygon filters */}
                  {filters.filter(f => f.filter_status !== 'draft').map(filter => (
                    <Polygon
                      key={filter.id}
                      positions={filter.polygon_coordinates.map(([lon, lat]) => [lat, lon])}
                      pathOptions={{ color: filter.color, weight: 2, opacity: 0.7, fill: true, fillOpacity: 0.1 }}
                    >
                      <Popup>
                        <div className="text-xs">
                          <strong>{filter.name}</strong>
                          <div className="mt-1 text-slate-600">
                            Inside: {filter.occurrences_included} • Outside: {filter.occurrences_excluded}
                          </div>
                        </div>
                      </Popup>
                    </Polygon>
                  ))}

                  {/* Preview drawn polygon */}
                  {drawingMode && drawnCoordinates.length > 0 && (
                    <Polygon
                      positions={drawnCoordinates.map(([lon, lat]) => [lat, lon])}
                      pathOptions={{ color: '#fbbf24', weight: 2, dashArray: '5, 5' }}
                    />
                  )}
                </MapContainer>
              </CardContent>
            </Card>

            {/* Boundaries and Filters Tabs */}
            <Tabs defaultValue="boundaries" className="space-y-4">
              <TabsList>
                <TabsTrigger value="boundaries">Boundaries ({boundaries.length})</TabsTrigger>
                <TabsTrigger value="filters">Filters ({filters.length})</TabsTrigger>
              </TabsList>

              {/* Boundaries Tab */}
              <TabsContent value="boundaries">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>GeoJSON Boundaries</span>
                      <label>
                        <Button asChild variant="outline" size="sm">
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload GeoJSON
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept=".geojson,.json"
                          onChange={handleFileUpload}
                          disabled={uploadBoundaryMutation.isPending}
                          className="hidden"
                        />
                      </label>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {boundaries.length === 0 ? (
                      <p className="text-sm text-slate-600 text-center py-8">No boundaries uploaded yet</p>
                    ) : (
                      <div className="space-y-3">
                        {boundaries.map(boundary => (
                          <div key={boundary.id} className="p-4 rounded-lg border border-slate-200 flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: boundary.color }}
                                ></div>
                                <span className="font-medium text-sm">{boundary.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {boundary.feature_count} features
                                </Badge>
                              </div>
                              <div className="text-xs text-slate-600 mt-2">
                                by {boundary.uploaded_by_name} • {format(new Date(boundary.created_date), 'PP')}
                              </div>
                              {boundary.description && (
                                <p className="text-xs text-slate-600 mt-1 italic">{boundary.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  toggleVisibilityMutation.mutate({
                                    boundaryId: boundary.id,
                                    visible: boundary.visible
                                  })
                                }
                              >
                                {boundary.visible ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Boundary</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Remove "{boundary.name}"? This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogAction
                                    onClick={() =>
                                      deleteBoundaryMutation.mutate(boundary.id)
                                    }
                                  >
                                    Delete
                                  </AlertDialogAction>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Filters Tab */}
              <TabsContent value="filters">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Polygon Filters</CardTitle>
                    <CardDescription>Drawn filters for restricting data in model re-runs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filters.length === 0 ? (
                      <p className="text-sm text-slate-600 text-center py-8">No filters created yet. Use drawing tools to create one.</p>
                    ) : (
                      <div className="space-y-3">
                        {filters.map(filter => (
                          <div key={filter.id} className="p-4 rounded-lg border border-slate-200">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: filter.color }}
                                ></div>
                                <span className="font-medium text-sm">{filter.name}</span>
                                <Badge
                                  variant="outline"
                                  className={
                                    filter.filter_status === 'active'
                                      ? 'bg-green-50 text-green-700'
                                      : 'bg-yellow-50 text-yellow-700'
                                  }
                                >
                                  {filter.filter_status}
                                </Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-slate-600">Inside:</span>
                                <span className="font-medium ml-2">{filter.occurrences_included}</span>
                              </div>
                              <div>
                                <span className="text-slate-600">Outside:</span>
                                <span className="font-medium ml-2">{filter.occurrences_excluded}</span>
                              </div>
                            </div>
                            {filter.notes && (
                              <p className="text-xs text-slate-600 mt-2 italic">{filter.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}