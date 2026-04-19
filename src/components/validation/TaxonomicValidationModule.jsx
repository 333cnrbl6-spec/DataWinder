import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  Search, 
  Globe, 
  Dna, 
  Database,
  MapPin,
  FileText,
  RefreshCcw,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TaxonomicValidationModule({ species, onClose }) {
  const [validating, setValidating] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [options, setOptions] = useState({
    validate_taxonomy: true,
    validate_geography: true,
    include_suggestions: true
  });

  const runValidation = async () => {
    if (!species) {
      toast.error('No species selected for validation');
      return;
    }

    setValidating(true);
    setResults(null);

    try {
      const response = await base44.functions.invoke('validateTaxonomyWithLLM', {
        species_id: species.id,
        ...options
      });

      setResults(response.data.results);
      toast.success(`Validation complete: ${(response.data.results.overall_confidence * 100).toFixed(0)}% confidence`);
    } catch (error) {
      toast.error(`Validation failed: ${error.message}`);
    } finally {
      setValidating(false);
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return 'bg-emerald-500';
    if (score >= 0.6) return 'bg-yellow-500';
    if (score >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
    }
  };

  const getSeverityBadge = (severity) => {
    const variants = {
      error: 'destructive',
      warning: 'outline',
      info: 'secondary'
    };
    return variants[severity] || 'outline';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                <Dna className="w-5 h-5" />
                Taxonomic Validation
              </CardTitle>
              <CardDescription className="mt-1">
                LLM-powered cross-reference against GBIF, NCBI, and global databases
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <XCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
          {species && (
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="outline" className="bg-indigo-100 text-indigo-800">
                {species.scientific_name}
              </Badge>
              {species.common_name && (
                <Badge variant="outline" className="text-slate-600">
                  {species.common_name}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!results && !validating && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <Database className="w-16 h-16 mx-auto text-indigo-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  Ready to Validate
                </h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Cross-reference this species against global taxonomy databases using advanced AI validation
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-indigo-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Dna className="w-4 h-4 text-indigo-600" />
                      Taxonomic Validation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>• Verify scientific name validity</li>
                      <li>• Check taxonomic classification</li>
                      <li>• Identify synonyms</li>
                      <li>• Cross-reference GBIF, NCBI, CoL</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-600" />
                      Geographic Validation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>• Verify native range</li>
                      <li>• Check coordinate accuracy</li>
                      <li>• Detect range violations</li>
                      <li>• Assess habitat compatibility</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Validation Options</Label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <Checkbox
                    checked={options.validate_taxonomy}
                    onCheckedChange={(v) => setOptions(prev => ({ ...prev, validate_taxonomy: v }))}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Dna className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-medium">Taxonomic Validation</span>
                    </div>
                    <p className="text-xs text-slate-500">Cross-reference against GBIF, NCBI, Catalogue of Life</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <Checkbox
                    checked={options.validate_geography}
                    onCheckedChange={(v) => setOptions(prev => ({ ...prev, validate_geography: v }))}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium">Geographic Validation</span>
                    </div>
                    <p className="text-xs text-slate-500">Verify distribution, coordinates, and habitat</p>
                  </div>
                </label>
              </div>

              <Button
                onClick={runValidation}
                disabled={validating}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                <Search className="w-5 h-5 mr-2" />
                Run Validation
              </Button>
            </div>
          )}

          {validating && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Validating Species...
              </h3>
              <p className="text-slate-500 text-center max-w-md">
                Cross-referencing against global databases using Claude Opus 4.6
              </p>
              <div className="w-full max-w-xs mt-6 space-y-2">
                {options.validate_taxonomy && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Taxonomic validation in progress...</span>
                  </div>
                )}
                {options.validate_geography && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Geographic validation in progress...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              {/* Overall Score */}
              <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Overall Confidence Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className={`text-4xl font-bold ${
                      results.overall_confidence >= 0.8 ? 'text-emerald-600' :
                      results.overall_confidence >= 0.6 ? 'text-yellow-600' :
                      results.overall_confidence >= 0.4 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {(results.overall_confidence * 100).toFixed(1)}%
                    </div>
                    <div className="flex-1">
                      <Progress 
                        value={results.overall_confidence * 100} 
                        className="h-3"
                      />
                    </div>
                    <Badge className={
                      results.overall_confidence >= 0.8 ? 'bg-emerald-100 text-emerald-800' :
                      results.overall_confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                      results.overall_confidence >= 0.4 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                    }>
                      {results.overall_confidence >= 0.8 ? 'Excellent' :
                       results.overall_confidence >= 0.6 ? 'Good' :
                       results.overall_confidence >= 0.4 ? 'Fair' : 'Poor'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for Details */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="taxonomy">Taxonomy</TabsTrigger>
                  <TabsTrigger value="geography">Geography</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {results.taxonomy && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Dna className="w-4 h-4 text-indigo-600" />
                            Taxonomic Confidence
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-indigo-600">
                            {(results.taxonomy.confidence_score * 100).toFixed(1)}%
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {results.taxonomy.is_valid ? 'Valid taxonomy' : 'Issues detected'}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {results.geography && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Globe className="w-4 h-4 text-emerald-600" />
                            Geographic Confidence
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-emerald-600">
                            {(results.geography.confidence_score * 100).toFixed(1)}%
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {results.geography.is_valid ? 'Valid distribution' : 'Issues detected'}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Flags Summary */}
                  {results.flags && results.flags.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          Validation Flags ({results.flags.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {results.flags.map((flag, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 rounded bg-slate-50">
                              {getSeverityIcon(flag.severity)}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-700">{flag.message}</p>
                                <p className="text-xs text-slate-500">Field: {flag.field}</p>
                              </div>
                              <Badge variant={getSeverityBadge(flag.severity)} className="text-xs">
                                {flag.severity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="taxonomy" className="mt-4 space-y-4">
                  {results.taxonomy && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-xs">Database Matches</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {Object.entries(results.taxonomy.database_matches).map(([db, match]) => (
                              <div key={db} className="flex items-center justify-between text-xs">
                                <span className="capitalize">{db.replace(/_/g, ' ')}</span>
                                {match.matched ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                )}
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-xs">Taxonomic Status</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm">
                              <div className="flex justify-between py-1">
                                <span className="text-slate-600">Current Name:</span>
                                <span className="font-medium">
                                  {results.taxonomy.current_name || results.scientific_name}
                                </span>
                              </div>
                              {results.taxonomy.synonyms && results.taxonomy.synonyms.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-slate-600 text-xs">Synonyms:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {results.taxonomy.synonyms.map((syn, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {syn}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {results.taxonomy.taxonomic_issues && results.taxonomy.taxonomic_issues.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Taxonomic Issues</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {results.taxonomy.taxonomic_issues.map((issue, idx) => (
                              <div key={idx} className="p-3 rounded border bg-slate-50">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {getSeverityIcon(issue.severity)}
                                      <span className="text-sm font-medium">{issue.field}</span>
                                    </div>
                                    <p className="text-xs text-slate-600">{issue.issue}</p>
                                    {issue.suggested_correction && (
                                      <p className="text-xs text-emerald-600 mt-1">
                                        Suggested: {issue.suggested_correction}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant={getSeverityBadge(issue.severity)}>
                                    {issue.severity}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {results.taxonomy.recommendations && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              Recommendations
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="text-sm space-y-2">
                              {results.taxonomy.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <ChevronRight className="w-4 h-4 text-blue-600 mt-0.5" />
                                  <span className="text-slate-700">{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="geography" className="mt-4 space-y-4">
                  {results.geography && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-xs">Native Range</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xs space-y-2">
                              <div>
                                <span className="text-slate-600">Continents:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {results.geography.native_range?.continents?.map((c, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {c}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              {results.geography.native_range?.countries && (
                                <div>
                                  <span className="text-slate-600">Countries:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {results.geography.native_range.countries.slice(0, 5).map((c, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {c}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-xs">Habitat Compatibility</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">
                              {(results.geography.habitat_compatibility?.score * 100 || 0).toFixed(1)}%
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {results.geography.habitat_compatibility?.notes || 'No data'}
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {results.geography.geographic_issues && results.geography.geographic_issues.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Geographic Issues</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {results.geography.geographic_issues.map((issue, idx) => (
                              <div key={idx} className="p-3 rounded border bg-slate-50">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {getSeverityIcon(issue.severity)}
                                      <span className="text-sm font-medium capitalize">
                                        {issue.issue_type.replace(/_/g, ' ')}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600">{issue.description}</p>
                                    {issue.location && (
                                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                        <MapPin className="w-3 h-3" />
                                        <span>{issue.location}</span>
                                      </div>
                                    )}
                                    {issue.suggested_correction && (
                                      <p className="text-xs text-emerald-600 mt-1">
                                        Suggested: {issue.suggested_correction}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant={getSeverityBadge(issue.severity)}>
                                    {issue.severity}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {results.geography.recommendations && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <FileText className="w-4 h-4 text-emerald-600" />
                              Geographic Recommendations
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="text-sm space-y-2">
                              {results.geography.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <ChevronRight className="w-4 h-4 text-emerald-600 mt-0.5" />
                                  <span className="text-slate-700">{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={runValidation}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Re-validate
                </Button>
                <Button
                  onClick={() => {
                    if (onClose) onClose();
                  }}
                  className="flex-1 bg-indigo-600 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}