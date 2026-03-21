import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Search } from 'lucide-react';
import ScenarioComparison from '@/components/scenario/ScenarioComparison';
import RefugiaViewer from '@/components/scenario/RefugiaViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ClimateScenarioComparison() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [scenarioData, setScenarioData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch species
  const { data: allSpecies, isLoading: speciesLoading } = useQuery({
    queryKey: ['speciesForScenario'],
    queryFn: async () => {
      const result = await base44.entities.Species.list('-updated_date', 100);
      return result || [];
    }
  });

  const filteredSpecies = allSpecies?.filter(sp =>
    sp.scientific_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sp.common_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate ensemble scenarios
  const calculateScenarios = async (species) => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('aggregateEnsembleScenarios', {
        speciesId: species.id,
        speciesName: species.scientific_name
      });
      if (response.data) {
        setScenarioData(response.data);
        setSelectedSpecies(species);
      }
    } catch (error) {
      console.error('Error calculating scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Climate Scenario Comparison</h1>
          <p className="text-slate-600 mt-2">
            Analyze ensemble predictions across current and future climate scenarios to assess range stability and identify climate refugia.
          </p>
        </div>

        {/* Species selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Species</CardTitle>
            <CardDescription>
              Choose a species with completed MAXENT runs to compare climate scenarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by scientific or common name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchTerm && filteredSpecies.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {filteredSpecies.slice(0, 20).map(sp => (
                  <Button
                    key={sp.id}
                    onClick={() => calculateScenarios(sp)}
                    variant={selectedSpecies?.id === sp.id ? 'default' : 'outline'}
                    className="justify-start text-left h-auto py-2 px-3"
                    disabled={loading}
                  >
                    <div>
                      <div className="font-semibold text-sm">{sp.scientific_name}</div>
                      {sp.common_name && (
                        <div className="text-xs text-slate-500">{sp.common_name}</div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {!searchTerm && (
              <div className="text-center py-6 text-slate-500">
                <p>Start typing to search for species...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mr-3" />
            <span className="text-slate-600">Aggregating ensemble scenarios...</span>
          </div>
        )}

        {/* Results */}
        {scenarioData && !loading && (
          <div className="space-y-6">
            {/* Header */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{scenarioData.species_name}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="text-xs text-slate-600">Total Models</div>
                  <div className="font-semibold text-slate-900">{scenarioData.ensemble_summary.total_runs_analyzed}</div>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="text-xs text-slate-600">Scenarios Covered</div>
                  <div className="font-semibold text-slate-900">{scenarioData.ensemble_summary.timeperiods_covered.length}</div>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="text-xs text-slate-600">Ensemble AUC</div>
                  <div className="font-semibold text-slate-900">{scenarioData.ensemble_summary.mean_ensemble_auc}</div>
                </div>
              </CardContent>
            </Card>

            {/* Scenario comparison */}
            <ScenarioComparison 
              scenarios={scenarioData.scenarios}
              rangeShiftTrend={scenarioData.range_shift_trend}
            />

            {/* Refugia */}
            <RefugiaViewer refugia={scenarioData.refugia} />

            {/* Uncertainty quantification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Uncertainty</CardTitle>
                <CardDescription>
                  Quantifies disagreement across ensemble models
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-sm font-semibold text-amber-900 mb-2">
                    Coefficient of Variation: {scenarioData.uncertainty_quantification.cv_across_scenarios}
                  </div>
                  <div className="text-xs text-amber-800 mb-3">
                    Variability in predictions across models and scenarios
                  </div>
                  <div className="text-sm text-amber-900">
                    <strong>Interpretation:</strong> {scenarioData.uncertainty_quantification.recommendation}
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 text-sm">
                    <strong>Best practice:</strong> Use ensemble means for habitat management planning. 
                    High uncertainty areas should receive conservative protection to account for model disagreement.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty state */}
        {!scenarioData && !loading && selectedSpecies && (
          <Alert>
            <AlertDescription>
              No scenario data found. This species may not have MAXENT runs for multiple climate scenarios.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}