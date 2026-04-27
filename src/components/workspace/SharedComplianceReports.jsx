import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function SharedComplianceReports({ projectId }) {
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.get(projectId),
  });

  const { data: validationResults = [] } = useQuery({
    queryKey: ['projectValidation', projectId],
    queryFn: async () => {
      if (!project?.species_ids?.length) return [];
      
      // Fetch validation results for all species in project
      const results = [];
      for (const speciesId of project.species_ids) {
        const res = await base44.entities.ValidationResult.filter({
          species_id: speciesId,
        });
        results.push(...res);
      }
      return results.sort((a, b) => 
        new Date(b.validation_date) - new Date(a.validation_date)
      );
    },
    enabled: !!project?.species_ids,
  });

  const { data: dataQualityChecks = [] } = useQuery({
    queryKey: ['projectDataQuality', projectId],
    queryFn: async () => {
      if (!project?.species_ids?.length) return [];
      
      const checks = [];
      for (const speciesId of project.species_ids) {
        const res = await base44.entities.DataQualityCheck.filter({
          species_id: speciesId,
          project_id: projectId,
        });
        checks.push(...res);
      }
      return checks.sort((a, b) => new Date(b.run_date) - new Date(a.run_date));
    },
    enabled: !!project?.species_ids,
  });

  const statusColor = {
    passed: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      {/* Validation Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Validation Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {validationResults.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No validation results yet
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {validationResults.map(result => (
                <div
                  key={result.id}
                  className="border border-slate-200 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">
                        {result.species_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {result.validation_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <Badge className={statusColor[result.status]}>
                      {result.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex-1">
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${result.overall_score * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-slate-600 font-medium">
                      {(result.overall_score * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(result.validation_date), 'MMM d, yyyy')}
                  </div>

                  {result.flags_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-700 mt-2 bg-amber-50 p-1.5 rounded">
                      <AlertCircle className="w-3 h-3" />
                      {result.flags_count} flag(s) raised
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Quality Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Data Quality Audits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dataQualityChecks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No quality checks run yet
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {dataQualityChecks.map(check => (
                <div
                  key={check.id}
                  className="border border-slate-200 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">
                        {check.species_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {check.check_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <Badge className={check.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}>
                      {check.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-slate-500">Records</p>
                      <p className="font-semibold text-slate-900">{check.total_records}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-slate-500">Issues</p>
                      <p className="font-semibold text-amber-900">{check.issues_found}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-slate-500">Quality</p>
                      <p className="font-semibold text-slate-900">{check.quality_score}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(check.run_date), 'MMM d, yyyy')}
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