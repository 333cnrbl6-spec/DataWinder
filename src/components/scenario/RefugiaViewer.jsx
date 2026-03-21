import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MapPin, Shield } from 'lucide-react';

export default function RefugiaViewer({ refugia }) {
  if (!refugia) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          Climate Refugia
        </CardTitle>
        <CardDescription>
          Areas predicted to remain suitable across climate scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main refugia info */}
        <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-green-900">Estimated Refugia Coverage</div>
              <div className="text-2xl font-bold text-green-700 mt-2">
                {refugia.estimated_percent_of_current_range?.toFixed(1)}%
              </div>
              <div className="text-xs text-green-800 mt-2">
                of current suitable habitat projected to remain suitable under 2050 and 2070 climate scenarios
              </div>
            </div>
          </div>
        </div>

        {/* Refugia definition */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Definition</div>
          <div className="text-sm text-slate-700">
            {refugia.definition}
          </div>
        </div>

        {/* Conservation implications */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex gap-3">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <span className="font-semibold">Conservation priority:</span> Refugia areas are high priorities for protection. 
            Establish corridors connecting refugia to enable range expansion as climate conditions shift.
          </div>
        </div>

        {/* Refugia metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-100 rounded-lg">
            <div className="text-xs text-slate-600">Refugia Sensitivity</div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {refugia.estimated_percent_of_current_range < 15 ? 'HIGH' : refugia.estimated_percent_of_current_range < 35 ? 'MODERATE' : 'LOW'}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              {refugia.estimated_percent_of_current_range < 15 ? 'Very vulnerable to climate change' : 
               refugia.estimated_percent_of_current_range < 35 ? 'Moderately vulnerable' : 'Resilient'}
            </div>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg">
            <div className="text-xs text-slate-600">Recommended Actions</div>
            <Badge variant="outline" className="text-xs mt-1">
              {refugia.estimated_percent_of_current_range < 20 ? 'Expand habitat' : 'Monitor trends'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}