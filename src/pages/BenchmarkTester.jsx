import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlayCircle, CheckCircle2, AlertCircle, XCircle, Loader2, Download, BarChart3, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SCENARIOS = [
  {
    id: 'climate_sensitive',
    name: 'Climate-Sensitive Species',
    description: 'Test with families highly vulnerable to climate change (tree frogs, amphibians, primates)',
    focus: 'Climate impact research readiness'
  },
  {
    id: 'amphibian_threat',
    name: 'Amphibian Threat Assessment',
    description: 'Comprehensive amphibian testing (class, order, family)',
    focus: 'Chytrid fungus + climate interactions'
  },
  {
    id: 'marine_vulnerable',
    name: 'Marine Species Vulnerability',
    description: 'Ocean-dependent taxa (turtles, whales, coral)',
    focus: 'Acidification and warming impacts'
  },
  {
    id: 'arctic_boreal',
    name: 'Arctic & Boreal Systems',
    description: 'High-latitude species with rapid climate change exposure',
    focus: 'Phenological mismatch, sea ice loss'
  }
];

export default function BenchmarkTester() {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [verbose, setVerbose] = useState(false);

  const runTest = async () => {
    if (!selectedScenario) return;
    setRunning(true);
    try {
      const response = await base44.functions.invoke('runBenchmarkTests', {
        test_scenario: selectedScenario,
        verbose
      });
      setResults(response.data);
      setShowDetail(true);
    } catch (err) {
      alert('Test failed: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  const exportResults = () => {
    if (!results) return;
    const json = JSON.stringify(results, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark_${selectedScenario}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-900 flex items-center justify-center gap-3">
            <Zap className="w-8 h-8 text-bangor-red" />
            End-to-End Benchmark Testing
          </h1>
          <p className="text-slate-600">
            Validate app functionality with climate-sensitive species and comprehensive data pipelines
          </p>
        </div>

        {/* Test Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCENARIOS.map((scenario) => (
            <motion.div
              key={scenario.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-200 ${
                  selectedScenario === scenario.id
                    ? 'ring-2 ring-bangor-red shadow-lg'
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedScenario(scenario.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{scenario.name}</h3>
                    {selectedScenario === scenario.id && (
                      <CheckCircle2 className="w-5 h-5 text-bangor-red" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mb-3">{scenario.description}</p>
                  <Badge variant="outline" className="text-xs">{scenario.focus}</Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verbose}
                  onChange={(e) => setVerbose(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-slate-700">Verbose logging</span>
              </label>
            </div>
            
            <Button
              onClick={runTest}
              disabled={!selectedScenario || running}
              className="w-full bg-bangor-red hover:bg-bangor-red/90 text-white text-lg py-6"
            >
              {running ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Running tests...
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Run Benchmark Test
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-bangor-red" />
                  Test Results Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Status indicator */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    {results.status === 'success' ? (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-6 h-6" />
                        <span className="font-semibold">All Tests Passed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle className="w-6 h-6" />
                        <span className="font-semibold">Completed with Issues</span>
                      </div>
                    )}
                    <p className="text-sm text-slate-600 mt-1">{results.summary.pipeline_completeness}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-slate-900">
                      {results.passed}/{results.test_count}
                    </p>
                    <p className="text-xs text-slate-500">scenarios passed</p>
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Passed</p>
                    <p className="text-2xl font-bold text-green-600">{results.passed}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Partial</p>
                    <p className="text-2xl font-bold text-amber-600">{results.partial}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Total Time</p>
                    <p className="text-2xl font-bold text-slate-700">{(results.execution_time_ms / 1000).toFixed(1)}s</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Data Sources</p>
                    <p className="text-xl font-bold text-slate-700">Multi-source</p>
                    <p className="text-xs text-slate-500">IUCN, iNat, GBIF</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Range Data</p>
                    <p className="text-2xl font-bold text-slate-700">{results.summary.range_data_coverage}</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Assessment</p>
                  <p className="text-sm text-slate-600">{results.summary.app_functionality}</p>
                  <p className="text-sm text-slate-600 mt-2">{results.summary.data_integration}</p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowDetail(true)}
                    variant="outline"
                    className="flex-1"
                  >
                    View Details
                  </Button>
                  <Button
                    onClick={exportResults}
                    className="flex-1 bg-slate-700 hover:bg-slate-800 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detailed Test Results</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {results?.results?.map((result, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-3">
                
                {/* Species result header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900">{result.name}</h4>
                    <p className="text-sm text-slate-600">{result.description}</p>
                  </div>
                  <div className="text-right">
                    {result.status === 'passed' ? (
                      <Badge className="bg-green-100 text-green-800">Passed</Badge>
                    ) : result.status === 'partial' ? (
                      <Badge className="bg-amber-100 text-amber-800">Partial</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">Failed</Badge>
                    )}
                    <p className="text-xs text-slate-500 mt-2">{result.metrics.execution_time_ms}ms</p>
                  </div>
                </div>

                {/* Checks grid */}
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(result.checks).map(([check, data]) => (
                    <div
                      key={check}
                      className={`p-2 rounded text-xs font-medium flex items-center gap-2 ${
                        data.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {data.passed ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>{check.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>

                {/* Metrics */}
                {result.metrics && (
                  <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                    <p>Pass rate: <span className="font-semibold">{result.metrics.pass_rate}</span></p>
                    <p>Total occurrences: <span className="font-semibold">{result.metrics.total_occurrences}</span></p>
                    <p>Range formats: <span className="font-semibold">{result.metrics.total_range_formats}/4</span></p>
                  </div>
                )}

                {/* Errors */}
                {result.errors?.length > 0 && (
                  <div className="text-xs text-red-700 bg-red-50 p-2 rounded">
                    {result.errors.map((err, i) => <p key={i}>{err}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}