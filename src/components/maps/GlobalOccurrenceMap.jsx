import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function GlobalOccurrenceMap({
  occurrences,
  selectedOccurrence,
  onSelectOccurrence,
  onLaunchSDM
}) {
  // Group occurrences by threat level for styling
  const groupedOccurrences = useMemo(() => {
    return occurrences.reduce((acc, occ) => {
      const level = occ.threat_level || 'low';
      if (!acc[level]) acc[level] = [];
      acc[level].push(occ);
      return acc;
    }, {});
  }, [occurrences]);

  const getThreatColor = (threatLevel) => {
    switch (threatLevel) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#eab308';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ width: '100%', height: '100%' }}
      className="rounded-lg"
    >
      {/* Base layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Occurrence markers */}
      {occurrences.map((occ) => {
        const isSelected = selectedOccurrence?.id === occ.id;
        const color = getThreatColor(occ.threat_level);
        const radius = isSelected ? 10 : 6;
        const weight = isSelected ? 3 : 2;
        const opacity = isSelected ? 1 : 0.7;

        return (
          <CircleMarker
            key={occ.id}
            center={[occ.latitude, occ.longitude]}
            radius={radius}
            color={color}
            weight={weight}
            opacity={opacity}
            fillOpacity={isSelected ? 0.9 : 0.6}
            onClick={() => onSelectOccurrence(occ)}
          >
            <Popup closeButton={false}>
              <div className="text-xs max-w-xs">
                <div className="font-bold text-slate-900">{occ.species_name}</div>
                <div className="text-slate-600 text-[11px] mt-0.5">
                  {occ.observer_name}
                </div>
                <div className="text-slate-500 text-[11px] mt-1">
                  {new Date(occ.observation_date).toLocaleDateString()}
                </div>
                {occ.threat_level && (
                  <div className={`text-[11px] font-semibold mt-1 inline-block px-1.5 py-0.5 rounded ${
                    occ.threat_level === 'critical' ? 'bg-red-100 text-red-800' :
                    occ.threat_level === 'high' ? 'bg-orange-100 text-orange-800' :
                    occ.threat_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {occ.threat_level.toUpperCase()}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '12px',
        zIndex: 400,
        maxWidth: '200px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' }}>
          Threat Level
        </div>
        {[
          { level: 'critical', color: '#dc2626', label: 'Critical' },
          { level: 'high', color: '#ea580c', label: 'High' },
          { level: 'medium', color: '#eab308', label: 'Medium' },
          { level: 'low', color: '#16a34a', label: 'Low' }
        ].map(item => (
          <div key={item.level} style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: item.color,
                flexShrink: 0
              }}
            />
            <span style={{ color: '#6b7280' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </MapContainer>
  );
}