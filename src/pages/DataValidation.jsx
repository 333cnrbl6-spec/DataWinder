import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, AlertTriangle, Loader2, Upload, Download, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DataValidation() {
  const [speciesList, setSpeciesList] = useState('');
  const [validationType, setValidationType] = useState('all');
  const [expandedSpecies, setExpandedSpecies] = useState(null);
  const [showDetails, setShowDetails] = useState({});

  const validateMutation = useMutation({
    mutationFn: async (species) => {
      const response = await base44.functions.invoke('validateSpeciesData', {
        species,
        validationType,
      });
      return response.data;
    },
  });

  const handleValidate = () => {
    const species = speciesList
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (species.length === 0) return;
    validateMutation.mutate(species);
  };

  const handleUploadCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').slice(1); // Skip header
    const species = lines
      .map(line => {
        const parts = line.split(',');
        return parts[0]?.trim() || '';
      })
      .filter(s => s.length > 0);

    setSpeciesList(species.join('\n'));
  };

  const results = validateMutation.data?.validationResults || [];
  const validCount = results.filter(r => r.isValid).length;
  const issueCount = results.filter(r => !r.isValid).length;
  const warningCount = results.reduce((sum, r) => sum + r.warnings.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Data Validation</h1>
          <p className="text-slate-600">
            Validate taxonomic and geographic data against IUCN and GBIF databases before generating papers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Input Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Input Species Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Validation Type Selector */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">
                  Validation Type
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'all', label: 'Complete Check' },
                    { value: 'iucn', label: 'IUCN Only' },
                    { value: 'gbif', label: 'GBIF Only' },
                    { value: 'geographic', label: 'Geographic' },
                  ].map(opt => (
                    <Button
                      key={opt.value}
                      variant={validationType === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setValidationType(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Text Input */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">
                  Enter Species Names (one per line)
                </label>
                <textarea
                  value={speciesList}
                  onChange={e => setSpeciesList(e.target.value)}
                  placeholder="e.g. Callithrix jacchus&#10;Callithrix penicillata&#10;Callithrix kuhlii"
                  className="w-full h-40 p-3 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-bangor-red/50"
                />
              </div>

              {/* CSV Upload */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">
                  Or Upload CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleUploadCSV}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-bangor-red file:text-white hover:file:bg-bangor-red/90 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleValidate}
                  disabled={!speciesList.trim() || validateMutation.isPending}
                  className="flex-1 gap-2"
                >
                  {validateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Validate Data'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSpeciesList('')}
                  disabled={!speciesList.trim()}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Validation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total Species</span>
                  <span className="text-xl font-bold">{results.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    Valid
                  </span>
                  <span className="text-lg font-bold text-green-600">{validCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    Issues
                  </span>
                  <span className="text-lg font-bold text-red-600">{issueCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Warnings
                  </span>
                  <span className="text-lg font-bold text-amber-600">{warningCount}</span>
                </div>
              </div>

              {results.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${(validCount / results.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    {Math.round((validCount / results.length) * 100)}% pass rate
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Validation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All ({results.length})</TabsTrigger>
                  <TabsTrigger value="issues">Issues ({issueCount})</TabsTrigger>
                  <TabsTrigger value="warnings">Warnings ({warningCount})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-2 mt-4">
                  {results.map((result, idx) => (
                    <SpeciesRow
                      key={idx}
                      result={result}
                      isExpanded={expandedSpecies === idx}
                      onToggle={() => setExpandedSpecies(expandedSpecies === idx ? null : idx)}
                      showDetails={showDetails[idx] || false}
                      onToggleDetails={() => setShowDetails(prev => ({
                        ...prev,
                        [idx]: !prev[idx],
                      }))}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="issues" className="space-y-2 mt-4">
                  {results
                    .filter(r => !r.isValid)
                    .map((result, idx) => (
                      <SpeciesRow
                        key={idx}
                        result={result}
                        isExpanded={expandedSpecies === idx}
                        onToggle={() => setExpandedSpecies(expandedSpecies === idx ? null : idx)}
                        showDetails={showDetails[idx] || false}
                        onToggleDetails={() => setShowDetails(prev => ({
                          ...prev,
                          [idx]: !prev[idx],
                        }))}
                      />
                    ))}
                </TabsContent>

                <TabsContent value="warnings" className="space-y-2 mt-4">
                  {results
                    .filter(r => r.warnings.length > 0)
                    .map((result, idx) => (
                      <SpeciesRow
                        key={idx}
                        result={result}
                        isExpanded={expandedSpecies === idx}
                        onToggle={() => setExpandedSpecies(expandedSpecies === idx ? null : idx)}
                        showDetails={showDetails[idx] || false}
                        onToggleDetails={() => setShowDetails(prev => ({
                          ...prev,
                          [idx]: !prev[idx],
                        }))}
                      />
                    ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SpeciesRow({ result, isExpanded, onToggle, showDetails, onToggleDetails }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          {result.isValid ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-semibold text-slate-900 italic">{result.species}</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              {result.issues.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {result.issues.length} issue{result.issues.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {result.warnings.length > 0 && (
                <Badge variant="outline" className="text-xs border-amber-300 bg-amber-50 text-amber-700">
                  {result.warnings.length} warning{result.warnings.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-4">
          {/* Issues */}
          {result.issues.length > 0 && (
            <div>
              <h4 className="font-semibold text-red-700 text-sm mb-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Issues
              </h4>
              <ul className="space-y-1 text-sm text-slate-700">
                {result.issues.map((issue, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-red-600">•</span> {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div>
              <h4 className="font-semibold text-amber-700 text-sm mb-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Warnings
              </h4>
              <ul className="space-y-1 text-sm text-slate-700">
                {result.warnings.map((warn, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-600">•</span> {warn}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* API Data Details */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleDetails}
            className="w-full justify-center gap-2"
          >
            {showDetails ? (
              <>
                <EyeOff className="w-3.5 h-3.5" /> Hide API Data
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" /> Show API Data
              </>
            )}
          </Button>

          {showDetails && (
            <div className="space-y-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
              {result.iucnData && (
                <div>
                  <p className="font-semibold text-slate-700 mb-1">IUCN Data</p>
                  <div className="text-slate-600 space-y-0.5 font-mono">
                    <p>Status: <span className="text-slate-900">{result.iucnData.status || 'N/A'}</span></p>
                    <p>Taxonomy: <span className="text-slate-900">{[result.iucnData.kingdom, result.iucnData.phylum, result.iucnData.class, result.iucnData.order, result.iucnData.family, result.iucnData.genus, result.iucnData.species].filter(Boolean).join(' > ')}</span></p>
                  </div>
                </div>
              )}
              {result.gbifData && (
                <div>
                  <p className="font-semibold text-slate-700 mb-1">GBIF Data</p>
                  <div className="text-slate-600 space-y-0.5 font-mono">
                    <p>Match Type: <span className="text-slate-900">{result.gbifData.matchType || 'N/A'}</span></p>
                    {result.gbifData.acceptedName && (
                      <p>Accepted Name: <span className="text-slate-900">{result.gbifData.acceptedName}</span></p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}