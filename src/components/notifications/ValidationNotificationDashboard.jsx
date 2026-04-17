import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, TrendingUp, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ValidationNotificationDashboard({ onNavigateToFlag }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
    fetchInitialFlags();
    subscribeToFlagUpdates();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchInitialFlags = async () => {
    try {
      setLoading(true);
      const unreviewed = await base44.entities.ValidationFlag.filter({
        status: 'flagged'
      });
      // Sort by severity (errors first, then warnings)
      const sorted = unreviewed.sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
      setFlags(sorted);
    } catch (error) {
      console.error('Error fetching flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToFlagUpdates = () => {
    const unsubscribe = base44.entities.ValidationFlag.subscribe((event) => {
      if (event.type === 'create') {
        setFlags(prev => {
          const updated = [event.data, ...prev];
          return updated.sort((a, b) => {
            const severityOrder = { error: 0, warning: 1, info: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
          });
        });
      } else if (event.type === 'update') {
        setFlags(prev => prev.map(f => f.id === event.id ? event.data : f));
      } else if (event.type === 'delete') {
        setFlags(prev => prev.filter(f => f.id !== event.id));
      }
    });

    return unsubscribe;
  };

  const handleResolveFlag = async (flagId, status) => {
    try {
      await base44.entities.ValidationFlag.update(flagId, {
        status,
        reviewer_email: user.email
      });
    } catch (error) {
      console.error('Error resolving flag:', error);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const filteredFlags = filterSeverity === 'all' 
    ? flags 
    : flags.filter(f => f.severity === filterSeverity);

  const stats = {
    total: flags.length,
    errors: flags.filter(f => f.severity === 'error').length,
    warnings: flags.filter(f => f.severity === 'warning').length
  };

  return (
    <div className="w-full space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-2">
            <div className="text-2xl font-bold text-slate-900">{stats.errors}</div>
            <p className="text-xs text-slate-600 mt-1">Critical Errors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-2">
            <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
            <p className="text-xs text-slate-600 mt-1">Warnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-2">
            <div className="text-2xl font-bold text-slate-600">{stats.total}</div>
            <p className="text-xs text-slate-600 mt-1">Total Flags</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {['all', 'error', 'warning'].map(severity => (
          <Button
            key={severity}
            size="sm"
            variant={filterSeverity === severity ? 'default' : 'outline'}
            onClick={() => setFilterSeverity(severity)}
            className="capitalize"
          >
            {severity === 'all' ? 'All Flags' : severity}
          </Button>
        ))}
      </div>

      {/* Notifications List */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Flagged Occurrences
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading notifications...</div>
          ) : filteredFlags.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="font-semibold text-slate-900">All Clear!</p>
              <p className="text-sm text-slate-600 mt-1">No validation issues found</p>
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {filteredFlags.map(flag => (
                <div
                  key={flag.id}
                  className={`p-4 border-l-4 hover:bg-slate-50 transition-colors ${
                    flag.severity === 'error' ? 'border-l-red-600' : 'border-l-yellow-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(flag.severity)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="font-semibold text-sm text-slate-900">
                          {flag.species_name}
                        </div>
                        <Badge
                          className={getSeverityColor(flag.severity)}
                          variant="outline"
                        >
                          {flag.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {flag.flag_type}
                        </Badge>
                      </div>

                      <p className="text-sm text-slate-600 mb-2">{flag.message}</p>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(flag.created_date).toLocaleString()}</span>
                      </div>

                      {flag.suggested_correction && Object.keys(flag.suggested_correction).length > 0 && (
                        <div className="bg-slate-100 rounded px-2 py-1 text-xs mb-3 max-w-sm overflow-x-auto">
                          <span className="text-slate-700 font-semibold block mb-1">Suggested Fix:</span>
                          <code className="text-slate-600">
                            {JSON.stringify(flag.suggested_correction)}
                          </code>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onNavigateToFlag?.(flag)}
                          className="text-xs"
                        >
                          View Details
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResolveFlag(flag.id, 'dismissed')}
                          className="text-xs"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}