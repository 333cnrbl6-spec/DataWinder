import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Zap, BookOpen, Lightbulb, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SpeciesAIEnhancement() {
  const [species, setSpecies] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enhancing, setEnhancing] = useState(false);
  const [activeTab, setActiveTab] = useState('literature');
  const [results, setResults] = useState(null);

  useEffect(() => {
    loadSpecies();
  }, []);

  const loadSpecies = async () => {
    try {
      const data = await base44.entities.Species.list();
      setSpecies(data);
      if (data.length > 0) setSelectedSpecies(data[0].id);
    } catch (error) {
      toast.error('Failed to load species');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrichLiterature = async () => {
    if (!selectedSpecies) return;
    setEnhancing(true);
    try {
      const res = await base44.functions.invoke('enrichSpeciesWithLiterature', {
        species_id: selectedSpecies
      });
      setResults(res.data);
      setActiveTab('literature');
      toast.success(`Added ${res.data.papers_added} papers`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setEnhancing(false);
    }
  };

  const handleSuggestStrategy = async () => {
    if (!selectedSpecies) return;
    setEnhancing(true);
    try {
      const res = await base44.functions.invoke('suggestConservationStrategy', {
        species_id: selectedSpecies
      });
      setResults(res.data);
      setActiveTab('strategy');
      toast.success('Conservation strategies generated');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setEnhancing(false);
    }
  };

  const handleDetectAnomalies = async () => {
    if (!selectedSpecies) return;
    setEnhancing(true);
    try {
      const res = await base44.functions.invoke('detectObservationAnomalies', {
        species_id: selectedSpecies
      });
      setResults(res.data);
      setActiveTab('anomalies');
      toast.success('Anomaly detection complete');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setEnhancing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const currentSpecies = species.find(s => s.id === selectedSpecies);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">AI Species Enhancement</h1>
          <p className="text-slate-600 mt-1">Enrich data, suggest strategies, and detect anomalies</p>
        </div>

        {/* Species Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Species</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedSpecies || ''}
              onChange={(e) => setSelectedSpecies(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {species.map(s => (
                <option key={s.id} value={s.id}>
                  {s.scientific_name} ({s.common_name || 'No common name'})
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={handleEnrichLiterature}
            disabled={enhancing}
            className="w-full h-20 flex flex-col items-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            <span>Enrich with Literature</span>
          </Button>
          <Button
            onClick={handleSuggestStrategy}
            disabled={enhancing}
            className="w-full h-20 flex flex-col items-center gap-2"
          >
            <Lightbulb className="w-5 h-5" />
            <span>Suggest Strategies</span>
          </Button>
          <Button
            onClick={handleDetectAnomalies}
            disabled={enhancing}
            className="w-full h-20 flex flex-col items-center gap-2"
          >
            <AlertCircle className="w-5 h-5" />
            <span>Detect Anomalies</span>
          </Button>
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-4">
            {/* Literature Tab */}
            {activeTab === 'literature' && results.papers_added !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Literature Enrichment Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600">{results.summary}</p>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="font-semibold text-slate-900">{results.papers_added} papers added</p>
                    {results.new_papers && results.new_papers.length > 0 && (
                      <ul className="mt-3 space-y-2 text-sm">
                        {results.new_papers.map((paper, idx) => (
                          <li key={idx} className="text-slate-700">
                            • {paper.title} ({paper.year})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strategy Tab */}
            {activeTab === 'strategy' && results.strategies && (
              <Card>
                <CardHeader>
                  <CardTitle>Conservation Strategies for {results.species_name}</CardTitle>
                  <p className="text-sm text-slate-600 mt-2">Status: {results.iucn_status}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-blue-900 text-sm">{results.overall_recommendation}</p>
                  </div>
                  <div className="space-y-3">
                    {results.strategies.map((strategy, idx) => (
                      <div key={idx} className="border border-slate-200 p-4 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900">{strategy.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            strategy.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            strategy.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {strategy.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{strategy.description}</p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500">Impact:</span>
                            <p className="font-semibold text-slate-900">{strategy.estimated_impact}/10</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Timeline:</span>
                            <p className="font-semibold text-slate-900">{strategy.timeline} months</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs text-slate-600"><strong>Resources:</strong> {strategy.required_resources}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Anomalies Tab */}
            {activeTab === 'anomalies' && results.anomalies !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle>Observation Anomaly Detection</CardTitle>
                  <p className="text-sm text-slate-600 mt-2">
                    Analyzed {results.observation_count} observations | Data Quality: {results.data_quality_score}%
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-100 p-4 rounded-lg text-sm text-slate-700">{results.summary}</div>
                  
                  {results.anomalies.length > 0 ? (
                    <div className="space-y-2">
                      {results.anomalies.map((anom, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border ${
                          anom.severity === 'high' ? 'bg-red-50 border-red-200' :
                          anom.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-blue-50 border-blue-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">{anom.type}</p>
                              <p className="text-xs text-slate-600 mt-1">{anom.description}</p>
                              <p className="text-xs text-slate-600 mt-1"><strong>Action:</strong> {anom.recommended_action}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ml-2 ${
                              anom.severity === 'high' ? 'bg-red-100 text-red-800' :
                              anom.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {anom.severity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">✓ No anomalies detected</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}