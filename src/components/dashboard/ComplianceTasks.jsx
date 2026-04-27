import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ComplianceTasks({ validationFlags = [], pendingCount = 0 }) {
  const flaggedItems = validationFlags.filter(f => f.status === 'flagged').slice(0, 4);

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
      <CardHeader>
        <CardTitle className="text-lg text-amber-900">Compliance Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100">
            <span className="text-sm font-medium text-amber-900">Pending Review</span>
            <Badge className="bg-amber-600 text-white text-lg px-3 py-1">
              {pendingCount}
            </Badge>
          </div>

          {flaggedItems.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-900 px-1">Recent Flags:</p>
              {flaggedItems.map(flag => (
                <div
                  key={flag.id}
                  className="flex items-start gap-2 p-2 rounded bg-white border border-amber-100 text-xs"
                >
                  <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{flag.rule_name}</p>
                    <p className="text-slate-500 text-xs">{flag.species_name}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-700">All checks passed</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}