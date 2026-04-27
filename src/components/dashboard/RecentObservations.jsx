import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RecentObservations({ occurrences = [] }) {
  const recent = occurrences.slice(0, 5);

  const getThreatColor = (threat) => {
    switch(threat) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Observations</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">No recent observations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map(obs => (
              <div
                key={obs.id}
                className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-slate-900 text-sm">
                    {obs.species_name}
                  </h4>
                  {obs.threat_level && (
                    <Badge className={`${getThreatColor(obs.threat_level)} text-xs shrink-0`}>
                      {obs.threat_level}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {obs.latitude && obs.longitude && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {obs.latitude.toFixed(2)}, {obs.longitude.toFixed(2)}
                    </span>
                  )}
                  {obs.observation_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(obs.observation_date), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}