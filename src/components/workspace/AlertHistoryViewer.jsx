import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AlertHistoryViewer() {
  const [alerts, setAlerts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unread');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const userAlerts = await base44.entities.AlertHistory.filter(
        { user_email: user.email },
        '-created_date',
        100
      );
      setAlerts(userAlerts);

      // Subscribe to new alerts
      const unsubscribe = base44.entities.AlertHistory.subscribe((event) => {
        if (event.data?.user_email === user.email) {
          if (event.type === 'create') {
            setAlerts(prev => [event.data, ...prev]);
          } else if (event.type === 'update') {
            setAlerts(prev =>
              prev.map(a => (a.id === event.id ? event.data : a))
            );
          }
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (alertId, isRead) => {
    try {
      await base44.entities.AlertHistory.update(alertId, {
        read: !isRead
      });
    } catch (error) {
      console.error('Failed to update alert:', error);
    }
  };

  const filteredAlerts =
    filter === 'unread' ? alerts.filter(a => !a.read) : alerts;

  const triggerReasons = {
    species_match: '🎯 Species of Interest',
    zone_match: '📍 Zone Alert',
    both: '⭐ Species + Zone'
  };

  if (loading) {
    return <div className="text-center py-8">Loading alerts...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Alert History</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
              className="text-xs"
            >
              Unread ({alerts.filter(a => !a.read).length})
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="text-xs"
            >
              All ({alerts.length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">
            No alerts yet. Set up subscriptions to start receiving notifications.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border transition-all ${
                  alert.read
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-white border-bangor-red/50 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-slate-900">
                        {alert.species_name}
                      </h4>
                      <Badge className="text-xs">
                        {triggerReasons[alert.trigger_reason]}
                      </Badge>
                      {!alert.read && (
                        <span className="w-2 h-2 rounded-full bg-bangor-red"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDistanceToNow(new Date(alert.created_date), {
                        addSuffix: true
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleMarkAsRead(alert.id, alert.read)}
                  >
                    {alert.read ? (
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-bangor-red" />
                    )}
                  </Button>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  {alert.zone_names && alert.zone_names.length > 0 && (
                    <p>
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {alert.zone_names.join(', ')}
                    </p>
                  )}
                  <p>
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {new Date(alert.observation_date).toLocaleDateString()}
                  </p>
                  <p className="text-slate-500">
                    {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                  </p>
                </div>

                {alert.email_sent ? (
                  <div className="mt-2 text-xs text-green-600">✓ Email sent</div>
                ) : alert.email_error ? (
                  <div className="mt-2 text-xs text-red-600">✗ Email failed: {alert.email_error}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}