import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react';

export default function AlertsPanel({ validationFlags = [], dataQualityChecks = [] }) {
  const criticalFlags = validationFlags.filter(f => f.severity === 'error');
  const warningFlags = validationFlags.filter(f => f.severity === 'warning');
  const failedQualityChecks = dataQualityChecks.filter(c => c.status === 'failed');

  const alerts = [
    ...criticalFlags.map(f => ({
      id: f.id,
      type: 'critical',
      title: f.rule_name,
      detail: f.species_name,
      icon: AlertCircle,
      color: 'text-red-600 bg-red-50 border-red-200',
    })),
    ...warningFlags.map(f => ({
      id: f.id,
      type: 'warning',
      title: f.rule_name,
      detail: f.species_name,
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    })),
    ...failedQualityChecks.map(c => ({
      id: c.id,
      type: 'quality',
      title: 'Data Quality Check Failed',
      detail: c.species_name,
      icon: TrendingDown,
      color: 'text-orange-600 bg-orange-50 border-orange-200',
    })),
  ].sort((a, b) => {
    const priority = { critical: 0, quality: 1, warning: 2 };
    return (priority[a.type] || 3) - (priority[b.type] || 3);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Alerts & Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-700">No active alerts</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.map(alert => {
              const Icon = alert.icon;
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${alert.color}`}
                >
                  <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs opacity-75 truncate">{alert.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}