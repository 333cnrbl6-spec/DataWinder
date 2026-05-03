import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, FeatureGroup, Polygon, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * SDMEditingMap — Interactive map for refining SDM predictions
 * Displays prediction grid as heatmap with drawing tools for exclusion zones
 */
export default function SDMEditingMap({ predictionGrid, occurrences, threshold, excludeZones = [], onZonesChange, center = [20, 0], zoom = 3 }) {
  const mapRef = useRef(null);
  const featureGroupRef = useRef(null);

  // Convert prediction grid to GeoJSON heatmap
  const getPredictionGeoJSON = () => {
    if (!predictionGrid || predictionGrid.length === 0) return null;

    const features = predictionGrid
      .filter(point => point.suitability >= (threshold || 0))
      .map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.lon, point.lat]
        },
        properties: {
          suitability: point.suitability
        }
      }));

    return {
      type: 'FeatureCollection',
      features
    };
  };

  // Color gradient for suitability scores
  const getSuitabilityColor = (suitability) => {
    if (suitability >= 0.8) return '#d32f2f'; // High suitability
    if (suitability >= 0.6) return '#f57c00';
    if (suitability >= 0.4) return '#fbc02d';
    if (suitability >= 0.2) return '#7cb342';
    return '#2196f3'; // Low suitability
  };

  // Style prediction points
  const onEachPredictionPoint = (feature, layer) => {
    const suitability = feature.properties.suitability;
    layer.setIcon(
      L.circleMarker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
        radius: 3,
        fillColor: getSuitabilityColor(suitability),
        color: getSuitabilityColor(suitability),
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7
      })
    );
  };

  // Style occurrence points
  const onEachOccurrencePoint = (feature, layer) => {
    layer.setIcon(
      L.circleMarker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
        radius: 4,
        fillColor: '#4caf50',
        color: '#2e7d32',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      })
    );
  };

  // Render exclude zones as polygons
  const renderExcludeZones = () => {
    if (!excludeZones || excludeZones.length === 0) return null;

    return excludeZones.map((zone, idx) => {
      if (zone.type === 'Polygon') {
        const coords = zone.coordinates[0].map(([lng, lat]) => [lat, lng]);
        return (
          <Polygon
            key={`exclude-${idx}`}
            positions={coords}
            color="#ef5350"
            weight={2}
            opacity={0.8}
            fillOpacity={0.2}
            dashArray="5, 5"
          >
            <Popup>Exclusion Zone {idx + 1}</Popup>
          </Polygon>
        );
      }
      return null;
    });
  };

  const predictionGeoJSON = getPredictionGeoJSON();
  const occurrenceGeoJSON = occurrences ? {
    type: 'FeatureCollection',
    features: occurrences.map(occ => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [occ.lon || occ.longitude, occ.lat || occ.latitude] },
      properties: { species: occ.species }
    }))
  } : null;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-slate-200">
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
          maxZoom={18}
        />

        {/* Prediction suitability heatmap */}
        {predictionGeoJSON && (
          <GeoJSON
            data={predictionGeoJSON}
            onEachFeature={onEachPredictionPoint}
          />
        )}

        {/* Occurrence points */}
        {occurrenceGeoJSON && (
          <GeoJSON
            data={occurrenceGeoJSON}
            onEachFeature={onEachOccurrencePoint}
          />
        )}

        {/* Existing exclude zones */}
        {renderExcludeZones()}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs space-y-2 max-w-48 z-40">
        <p className="font-semibold text-slate-800">Legend</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>High suitability (0.8–1.0)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>Moderate–high (0.6–0.8)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>Moderate (0.4–0.6)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-lime-600"></div>
          <span>Moderate–low (0.2–0.4)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Low suitability (&lt;0.2)</span>
        </div>
        <div className="border-t border-slate-200 pt-2 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Occurrence points</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-3 h-3 border-2 border-red-500 bg-red-100" style={{ borderDasharray: '2,2' }}></div>
            <span>Exclude zones</span>
          </div>
        </div>
      </div>
    </div>
  );
}