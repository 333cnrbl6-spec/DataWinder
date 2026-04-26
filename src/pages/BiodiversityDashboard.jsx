import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, AlertTriangle, Leaf, TrendingUp } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import AnalyticsDashboard from '@/components/dashboard/AnalyticsDashboard';

export default function BiodiversityDashboard() {
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);

  const { data: occurrences = [] } = useQuery({
    queryKey: ['occurrences'],
    queryFn: () => base44.entities.Occurrence?.list?.() || []
  });

  const { data: surveys = [] } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => base44.entities.Survey?.list?.() || []
  });

  const { data: species = [] } = useQuery({
    queryKey: ['species'],
    queryFn: () => base44.entities.Species?.list?.() || []
  });

  // Real-time subscriptions for alerts
  useEffect(() => {
    const unsubscribe = base44.entities.Occurrence?.subscribe?.((event) => {
      if (event.type === 'create') {
        setRealtimeAlerts(prev => [
          {
            id: event.id,
            type: 'new_sighting',
            species: event.data.species_name,
            location: event.data.latitude + ', ' + event.data.longitude,
            timestamp: new Date()
          },
          ...prev
        ].slice(0, 5));
      }
    });

    return () => unsubscribe?.();
  }, []);

  const criticalThreats = occurrences.filter(o => o.threat_level === 'critical');
  const avgAIConfidence = occurrences
    .filter(o => o.ai_identified)
    .reduce((acc, o) => acc + (o.ai_confidence || 0), 0) / 
    occurrences.filter(o => o.ai_identified).length || 0;

  const mapCenter = occurrences.length > 0 
    ? [occurrences[0].latitude, occurrences[0].longitude]
    : [51.5074, -0.1278];

  return (
    <div className="space-y-8">
      {/* KPI Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-2">Real-time Sightings</p>
            <p className="text-3xl font-bold text-slate-900">{occurrences.length}</p>
            <p className="text-xs text-slate-500 mt-2">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-2">Critical Threats</p>
            <p className="text-3xl font-bold text-red-600">{criticalThreats.length}</p>
            <p className="text-xs text-slate-500 mt-2">Require action</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-2">AI Identification</p>
            <p className="text-3xl font-bold text-blue-600">{Math.round(avgAIConfidence * 100)}%</p>
            <p className="text-xs text-slate-500 mt-2">Avg confidence</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-2">Active Surveys</p>
            <p className="text-3xl font-bold text-green-600">{surveys.filter(s => s.status === 'active').length}</p>
            <p className="text-xs text-slate-500 mt-2">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Alerts */}
      {realtimeAlerts.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-5 h-5" />
              Live Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {realtimeAlerts.map(alert => (
              <div key={alert.id} className="p-3 bg-white rounded border border-amber-200">
                <p className="text-sm font-medium text-slate-900">{alert.species}</p>
                <p className="text-xs text-slate-600">{alert.location}</p>
                <p className="text-xs text-amber-700 mt-1">
                  {alert.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Map View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-bangor-red" />
            Live Species Distribution Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 rounded-lg overflow-hidden border border-slate-200">
            <MapContainer center={mapCenter} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {occurrences.map(occ => {
                const threatColor = {
                  critical: '#ef4444',
                  high: '#f97316',
                  medium: '#eab308',
                  low: '#22c55e'
                }[occ.threat_level] || '#3b82f6';

                return (
                  <CircleMarker
                    key={occ.id}
                    center={[occ.latitude, occ.longitude]}
                    radius={occ.ai_confidence ? occ.ai_confidence * 8 : 5}
                    fillColor={threatColor}
                    color={threatColor}
                    weight={2}
                    opacity={0.8}
                    fillOpacity={0.6}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">{occ.species_name}</p>
                        {occ.ai_identified && (
                          <Badge className="text-xs mt-1">AI: {Math.round(occ.ai_confidence * 100)}%</Badge>
                        )}
                        <p className="text-xs text-slate-600 mt-1">{occ.threat_level} threat</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      <AnalyticsDashboard species={species} surveys={surveys} observations={occurrences} />
    </div>
  );
}