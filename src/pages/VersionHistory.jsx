import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, RotateCcw, Eye, Search, Filter, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

export default function VersionHistory() {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [expandedVersion, setExpandedVersion] = useState(null);
  const queryClient = useQueryClient();

  // Fetch all versions
  const { data: allVersions = [], isLoading } = useQuery({
    queryKey: ['versions'],
    queryFn: () => base44.entities.RecordVersion.list('-version_timestamp', 100)
  });

  // Revert mutation
  const revertMutation = useMutation({
    mutationFn: (versionId) =>
      base44.functions.invoke('revertToVersion', { version_id: versionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
      setSelectedEntity(null);
    }
  });

  // Filter and group versions
  const filteredVersions = useMemo(() => {
    let filtered = allVersions;

    if (entityFilter !== 'all') {
      filtered = filtered.filter(v => v.entity_type === entityFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.entity_name?.toLowerCase().includes(term) ||
        v.entity_id?.toLowerCase().includes(term) ||
        v.modified_by_name?.toLowerCase().includes(term)
      );
    }

    // Group by entity
    const grouped = {};
    filtered.forEach(v => {
      const key = `${v.entity_type}-${v.entity_id}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(v);
    });

    return grouped;
  }, [allVersions, entityFilter, searchTerm]);

  const entityGroups = Object.entries(filteredVersions);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Version History</h1>
          <p className="text-slate-600">Track all changes to species and occurrence records with full audit trail and revert capabilities.</p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by species name, ID, or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-slate-600" />
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="all">All Types</option>
                <option value="Species">Species</option>
                <option value="Occurrence">Occurrences</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : entityGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No version history found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {entityGroups.map(([key, versions]) => {
              const [entityType, entityId] = key.split('-');
              const isExpanded = selectedEntity === key;

              return (
                <Card key={key} className="overflow-hidden">
                  <button
                    onClick={() => setSelectedEntity(isExpanded ? null : key)}
                    className="w-full text-left hover:bg-slate-50 transition-colors"
                  >
                    <CardHeader className="pb-3 cursor-pointer flex flex-row items-start justify-between space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{versions[0].entity_name || entityId}</CardTitle>
                          <Badge variant="outline">{entityType}</Badge>
                        </div>
                        <CardDescription>
                          {versions.length} version{versions.length !== 1 ? 's' : ''} •{' '}
                          Latest: {format(new Date(versions[0].version_timestamp), 'PPp')}
                        </CardDescription>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </CardHeader>
                  </button>

                  {isExpanded && (
                    <CardContent className="space-y-3 border-t pt-4">
                      {versions.map((version, idx) => (
                        <div
                          key={version.id}
                          className="border border-slate-200 rounded-lg p-4 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-slate-900">
                                  Version {version.version_number}
                                </span>
                                {version.is_current && (
                                  <Badge className="bg-green-100 text-green-800">Current</Badge>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 space-y-1">
                                <div>
                                  Modified by {version.modified_by_name} ({version.modified_by})
                                </div>
                                <div>
                                  {format(new Date(version.version_timestamp), 'PPpp')}
                                </div>
                              </div>
                            </div>

                            {idx > 0 && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1"
                                    disabled={revertMutation.isPending}
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    Revert
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Revert to Version {version.version_number}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will restore the record to its state at version {version.version_number}.
                                      A new version entry will be created to track this revert action.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogAction
                                    onClick={() => revertMutation.mutate(version.id)}
                                  >
                                    Confirm Revert
                                  </AlertDialogAction>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>

                          {version.change_reason && (
                            <div className="bg-slate-50 rounded px-3 py-2 mb-3 text-sm text-slate-700 border-l-2 border-slate-300">
                              {version.change_reason}
                            </div>
                          )}

                          {version.changed_fields && version.changed_fields.length > 0 && (
                            <details className="cursor-pointer">
                              <summary className="text-sm font-medium text-slate-700 py-2">
                                {version.changed_fields.length} field{version.changed_fields.length !== 1 ? 's' : ''} changed
                              </summary>
                              <div className="space-y-2 mt-3 pt-3 border-t">
                                {version.changed_fields.map((field) => {
                                  const changes = version.change_summary?.[field];
                                  return (
                                    <div key={field} className="bg-slate-50 rounded p-3 text-xs space-y-1">
                                      <div className="font-medium text-slate-900">{field}</div>
                                      {changes && (
                                        <div className="space-y-1 text-slate-700">
                                          <div>
                                            <span className="text-slate-500">Before: </span>
                                            <code className="bg-red-50 px-1 rounded">
                                              {String(changes.before || '(empty)').substring(0, 50)}
                                            </code>
                                          </div>
                                          <div>
                                            <span className="text-slate-500">After: </span>
                                            <code className="bg-green-50 px-1 rounded">
                                              {String(changes.after || '(empty)').substring(0, 50)}
                                            </code>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}