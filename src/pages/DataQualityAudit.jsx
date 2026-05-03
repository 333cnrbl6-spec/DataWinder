import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ProcessingFeedback from '@/components/ui/ProcessingFeedback';

export default function DataQualityAudit() {
  const [isValidating, setIsValidating] = useState(false);
  const [validationData, setValidationData] = useState(null);

  const handleValidateAll = async () => {
    setIsValidating(true);
    try {
      const response = await base44.functions.invoke('validateMaxentData', { validateAll: true });
      setValidationData(response.data);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  if (!validationData) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Data Quality Audit</h1>
              <p className="text-slate-600 mt-2">Validate MAXENT run integrity and identify data issues</p>
            </div>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Run Validation</CardTitle>
                <CardDescription>Scan all MAXENT runs for data quality issues</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleValidateAll} 
                  disabled={isValidating}
                  className="bg-bangor-red hover:bg-bangor-red/90 gap-2"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Start Validation
                    </>
                  )}
                </Button>

                {isValidating && (
                  <ProcessingFeedback
                    label="Scanning MAXENT Runs"
                    detail="Validating run integrity, data quality, and compliance standards…"
                    tips={[
                      'Checking for duplicate occurrences, taxonomic inconsistencies, and spatial anomalies.',
                      'Validating model performance metrics and comparing against baseline standards.',
                      'Cross-referencing with IUCN and GBIF data for consistency checks.',
                    ]}
                    className="mt-4"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const { summary, validation_results } = validationData;
  const errorRuns = validation_results.filter(r => r.errors.length > 0);
  const warningRuns = validation_results.filter(r => r.warnings.length > 0);

  // Data quality by species
  const speciesQuality = {};
  validation_results.forEach(run => {
    if (!speciesQuality[run.species_name]) {
      speciesQuality[run.species_name] = { valid: 0, invalid: 0 };
    }
    if (run.valid) speciesQuality[run.species_name].valid++;
    else speciesQuality[run.species_name].invalid++;
  });

  const speciesData = Object.entries(speciesQuality).map(([name, data]) => ({
    name,
    valid: data.valid,
    invalid: data.invalid
  }));

  const scoreColor = parseInt(summary.data_quality_score) >= 90 ? 'text-green-600' : parseInt(summary.data_quality_score) >= 70 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Data Quality Audit Results</h1>
            <p className="text-slate-600 mt-2">System-wide validation of MAXENT runs</p>
          </div>
          <Button 
            onClick={() => setValidationData(null)}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            New Audit
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{summary.total_runs_checked}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Valid Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.valid_runs}</div>
              <p className="text-xs text-slate-500 mt-1">No issues detected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.runs_with_errors}</div>
              <p className="text-xs text-slate-500 mt-1">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Quality Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${scoreColor}`}>{summary.data_quality_score}</div>
              <p className="text-xs text-slate-500 mt-1">Overall health</p>
            </CardContent>
          </Card>
        </div>

        {/* Quality by Species */}
        {speciesData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Data Quality by Species</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={speciesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="valid" fill="#16a34a" name="Valid" />
                  <Bar dataKey="invalid" fill="#dc2626" name="Invalid" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Error Details */}
        {errorRuns.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Critical Issues ({errorRuns.length} runs)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {errorRuns.map(run => (
                <div key={run.id} className="bg-white p-3 rounded-lg border border-red-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{run.name}</p>
                      <p className="text-sm text-slate-600">{run.species_name}</p>
                    </div>
                    <Badge variant="destructive">Error</Badge>
                  </div>
                  <ul className="text-sm text-red-700 space-y-1">
                    {run.errors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Warning Details */}
        {warningRuns.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Warnings ({warningRuns.length} runs)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {warningRuns.map(run => (
                <div key={run.id} className="bg-white p-3 rounded-lg border border-yellow-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{run.name}</p>
                      <p className="text-sm text-slate-600">{run.species_name}</p>
                    </div>
                    <Badge variant="secondary">Warning</Badge>
                  </div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {run.warnings.map((warn, idx) => (
                      <li key={idx}>• {warn}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {errorRuns.length === 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">All data valid</p>
                  <p className="text-sm text-green-700">No critical issues detected across {summary.total_runs_checked} runs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}