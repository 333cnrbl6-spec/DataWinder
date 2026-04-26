import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AnnotationDrawer from './AnnotationDrawer';
import 'leaflet/dist/leaflet.css';

export default function AnnotatedPredictionMap({ sdmRunId, predictionGrid, bounds }) {
  const mapRef = useRef(null);

  // Fetch existing annotations
  const { data: annotations = [] } = useQuery({
    queryKey: ['sdm-annotations', sdmRunId],
    queryFn: () =>
      base44.entities.SDMAnnotation.filter(
        { sdm_run_id: sdmRunId, resolved: false },
        '-created_date',
        50
      ),
    enabled: !!sdmRunId
  });

  // Default bounds if not provided
  const mapBounds = bounds || [[51.505, -0.09], [51.515, -0.08]];
  const centerLat = (mapBounds[0][0] + mapBounds[1][0]) / 2;
  const centerLon = (mapBounds[0][1] + mapBounds[1][1]) / 2;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
      {/* Map */}
      <div className="lg:col-span-3 rounded-lg overflow-hidden border border-slate-200 relative">
        <MapContainer
          ref={mapRef}
          center={[centerLat, centerLon]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          bounds={mapBounds}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
        </MapContainer>

        {/* Prediction Heatmap Overlay */}
        {predictionGrid && predictionGrid.length > 0 && (
          <div className="absolute inset-0 pointer-events-none opacity-60">
            {predictionGrid.map((point) => {
              const suitability = point.suitability || 0;
              const hue = (1 - suitability) * 240;
              const color = `hsl(${hue}, 100%, 50%)`;

              // Calculate position as percentage of map bounds
              const percentLon = ((point.lon - mapBounds[0][1]) / (mapBounds[1][1] - mapBounds[0][1])) * 100;
              const percentLat = ((mapBounds[1][0] - point.lat) / (mapBounds[1][0] - mapBounds[0][0])) * 100;

              return (
                <div
                  key={`${point.lat}-${point.lon}`}
                  className="absolute"
                  style={{
                    left: `${percentLon}%`,
                    top: `${percentLat}%`,
                    width: '3px',
                    height: '3px',
                    backgroundColor: color,
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer'
                  }}
                  title={`Suitability: ${(suitability * 100).toFixed(1)}%`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Annotation Panel */}
      <AnnotationDrawer
        mapRef={mapRef}
        sdmRunId={sdmRunId}
        existingAnnotations={annotations}
      />
    </div>
  );
}