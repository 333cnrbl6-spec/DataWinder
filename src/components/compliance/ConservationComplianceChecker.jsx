import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info,
  FileWarning,
  MapPin,
  Calendar,
  Database
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ConservationComplianceChecker({ records, complianceType = "species_import", onComplete }) {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);

  const runComplianceCheck = async () => {
    if (!records || records.length === 0) {
      toast.error("No records to check");
      return;
    }

    setChecking(true);
    try {
      const response = await base44.functions.invoke('validateConservationCompliance', {
        records,
        compliance_type: complianceType
      });

      setResults(response.data);
      toast.success(`Compliance check complete: ${response.data.summary.compliance_rate}% compliant`);
      
      if (onComplete) {
        onComplete(response.data);
      }
    } catch (error) {
      toast.error(`Compliance check failed: ${error.message}`);
    } finally {
      setChecking(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'info': return <Info className="w-4 h-4 text-blue-600" />;
      default: return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }
  };

  const getIssueIcon = (type) => {
    if (type.includes('coordinate')) return <MapPin className="w-4 h-4" />;
    if (type.includes('date')) return <Calendar className="w-4 h-4" />;
    if (type.includes('iucn') || type.includes('gbif')) return <Database className="w-4 h-4" />;
    return <FileWarning className="w-4 h-4" />;
  };

  if (!records) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No records provided for compliance check
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-2 border-bangor-red/20">
      <CardHeader className="bg-gradient-to-r from-bangor-red/5 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-bangor-red">
              <Shield className="w-5 h-5" />
              Conservation Compliance Check
            </CardTitle>
            <CardDescription className="mt-1">
              Verify data against Natural England, IUCN, GBIF, and BTO standards
            </CardDescription>
          </div>
          {!results && (
            <Button 
              onClick={runComplianceCheck} 
              disabled={checking}
              className="bg-bangor-red hover:bg-bangor-red/90"
            >
              {checking ? "Checking..." : "Run Compliance Check"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Summary */}
        {results && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">{results.summary.compliant_records}</div>
                <div className="text-xs text-green-600 font-medium">Compliant</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-700">{results.summary.non_compliant_records}</div>
                <div className="text-xs text-red-600 font-medium">Non-Compliant</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-700">{results.summary.total_warnings}</div>
                <div className="text-xs text-yellow-600 font-medium">Warnings</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{results.summary.total_info}</div>
                <div className="text-xs text-blue-600 font-medium">Info</div>
              </div>
            </div>

            {/* Compliance Rate */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Compliance Rate</span>
                <Badge 
                  variant="outline" 
                  className={results.summary.compliance_rate >= 90 ? "bg-green-100 text-green-800" : 
                             results.summary.compliance_rate >= 70 ? "bg-yellow-100 text-yellow-800" : 
                             "bg-red-100 text-red-800"}
                >
                  {results.summary.compliance_rate}%
                </Badge>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    results.summary.compliance_rate >= 90 ? "bg-green-600" : 
                    results.summary.compliance_rate >= 70 ? "bg-yellow-600" : 
                    "bg-red-600"
                  }`}
                  style={{ width: `${results.summary.compliance_rate}%` }}
                />
              </div>
            </div>

            {/* Detailed Issues */}
            {results.compliance_results.some(r => r.issues.length > 0) && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700">Compliance Issues</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {results.compliance_results.filter(r => r.issues.length > 0).map((record, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        {record.is_compliant ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium text-slate-900">{record.record_summary}</span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {record.error_count} errors, {record.warning_count} warnings
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {record.issues.map((issue, issueIdx) => (
                          <div 
                            key={issueIdx}
                            className={`flex items-start gap-2 p-2 rounded ${
                              issue.severity === 'error' ? 'bg-red-50' :
                              issue.severity === 'warning' ? 'bg-yellow-50' :
                              'bg-blue-50'
                            }`}
                          >
                            {getSeverityIcon(issue.severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getIssueIcon(issue.type)}
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  {issue.type.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700">{issue.message}</p>
                              {issue.resolution && (
                                <p className="text-xs text-slate-500 mt-1 italic">
                                  → {issue.resolution}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setResults(null)}
                className="flex-1"
              >
                Check Again
              </Button>
              {results.summary.total_errors === 0 && (
                <Button
                  className="flex-1 bg-bangor-red hover:bg-bangor-red/90"
                  onClick={() => toast.success("✓ Compliance passed - ready to import")}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Proceed to Import
                </Button>
              )}
            </div>
          </>
        )}

        {/* Initial State */}
        {!results && (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-bangor-red/20 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-2">
              Run compliance check before importing {records.length} records
            </p>
            <p className="text-xs text-slate-400">
              Checks: IUCN Red List compliance, GBIF standards, Natural England survey requirements, 
              BTO recording guidelines, location data protection
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}