import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, ChevronDown } from 'lucide-react';

export default function ValidationFlagsPanel({ speciesId, refreshTrigger }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchFlags();
    loadUser();
  }, [speciesId, refreshTrigger]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const allFlags = await base44.entities.ValidationFlag.filter({
        species_id: speciesId,
        status: 'flagged'
      });
      setFlags(allFlags);
    } catch (error) {
      console.error('Error fetching flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const handleReview = async (flagId, status) => {
    try {
      await base44.entities.ValidationFlag.update(flagId, {
        status,
        reviewer_email: user.email,
        reviewer_note: reviewNote
      });
      setReviewNote('');
      setSelectedFlag(null);
      await fetchFlags();
    } catch (error) {
      console.error('Error updating flag:', error);
    }
  };

  const flagCounts = {
    flagged: flags.filter(f => f.status === 'flagged').length,
    errors: flags.filter(f => f.severity === 'error').length,
    warnings: flags.filter(f => f.severity === 'warning').length
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-slate-600" />
            <CardTitle className="text-base">Validation Flags</CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-red-700">
              {flagCounts.errors} Errors
            </Badge>
            <Badge variant="outline" className="text-yellow-700">
              {flagCounts.warnings} Warnings
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading flags...</div>
        ) : flags.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-slate-600">No validation flags found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {flags.map(flag => (
              <div
                key={flag.id}
                className="border rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setSelectedFlag(selectedFlag?.id === flag.id ? null : flag)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getSeverityIcon(flag.severity)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{flag.rule_name}</span>
                      <Badge className={getSeverityBadgeColor(flag.severity)} variant="outline">
                        {flag.severity}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {flag.flag_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{flag.message}</p>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                      selectedFlag?.id === flag.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* Expanded Details */}
                {selectedFlag?.id === flag.id && (
                  <div className="mt-3 pt-3 border-t space-y-3">
                    {flag.suggested_correction && Object.keys(flag.suggested_correction).length > 0 && (
                      <div className="bg-blue-50 p-2 rounded text-sm">
                        <div className="font-semibold text-blue-900 mb-1">Suggested Correction:</div>
                        <pre className="text-xs text-blue-800 overflow-x-auto">
                          {JSON.stringify(flag.suggested_correction, null, 2)}
                        </pre>
                      </div>
                    )}

                    {flag.occurrence_data && (
                      <div className="bg-slate-50 p-2 rounded text-sm">
                        <div className="font-semibold text-slate-900 mb-1">Occurrence Data:</div>
                        <pre className="text-xs text-slate-700 overflow-x-auto max-h-40">
                          {JSON.stringify(flag.occurrence_data, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">
                        Review Note
                      </label>
                      <Textarea
                        placeholder="Add a note about your review decision..."
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        className="text-xs h-16 resize-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReview(flag.id, 'corrected');
                        }}
                        className="flex-1"
                      >
                        Mark Corrected
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReview(flag.id, 'dismissed');
                        }}
                        className="flex-1"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}