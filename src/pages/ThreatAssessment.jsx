import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Search } from 'lucide-react';
import ThreatGauge from '@/components/threat/ThreatGauge';
import ThreatComponentBreakdown from '@/components/threat/ThreatComponentBreakdown';
import RecommendationsList from '@/components/threat/RecommendationsList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ThreatAssessment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [threatData, setThreatData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  // Fetch species for search
  const { data: allSpecies, isLoading: speciesLoading } = useQuery({
    queryKey: ['allSpecies'],
    queryFn: async () => {
      const result = await base44.entities.Species.list('-updated_date', 100);
      return result || [];
    }
  });

  // Filter species by search
  const filteredSpecies = allSpecies?.filter(sp =>
    sp.scientific_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sp.common_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate threat score
  const calculateThreat = async (species) => {
    setLoading(true);
    setLoadingId(species.id);
    try {
      const response = await base44.functions.invoke('calculateThreatScore', {
        speciesId: species.id,
        scientificName: species.scientific_name
      });
      if (response.data) {
        setThreatData(response.data);
        setSelectedSpecies(species);
      }
    } catch (error) {
      console.error('Error calculating threat score:', error);
    } finally {
      setLoading(false);
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Conservation Threat Assessment</h1>
          <p className="text-slate-600 mt-2">
            Evaluate extinction risk and conservation priorities for primate species using multi-dimensional threat analysis.
          </p>
        </div>

        {/* Search section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Species</CardTitle>
            <CardDescription>
              Search for a species to assess its conservation status
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

            {/* Species list */}
            {searchTerm && filteredSpecies.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {filteredSpecies.slice(0, 20).map(sp => (
                  <Button
                     key={sp.id}
                     onClick={() => calculateThreat(sp)}
                     variant={selectedSpecies?.id === sp.id ? 'default' : 'outline'}
                     className="justify-start text-left h-auto py-2 px-3"
                     disabled={loading}
                   >
                     <div className="flex items-center gap-2 w-full">
                       {loadingId === sp.id && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                       <div>
                         <div className="font-semibold text-sm">{sp.scientific_name}</div>
                         {sp.common_name && (
                           <div className="text-xs text-slate-500">{sp.common_name}</div>
                         )}
                       </div>
                     </div>
                   </Button>
                ))}
              </div>
            )}

            {searchTerm && filteredSpecies.length === 0 && (
              <div className="text-center py-6 text-slate-500">
                <p>No species found. Try a different search term.</p>
              </div>
            )}

            {!searchTerm && (
              <div className="text-center py-6 text-slate-500">
                <p>Start typing to search for species...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mr-3" />
            <span className="text-slate-600">Calculating threat assessment...</span>
          </div>
        )}

        {/* Results */}
        {threatData && !loading && (
          <div className="space-y-6">
            {/* Header info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{threatData.scientific_name}</CardTitle>
                <CardDescription>
                  Assessment date: {threatData.assessment_date}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="text-xs text-slate-600">IUCN Status</div>
                  <div className="font-semibold text-slate-900">{threatData.iucn_status}</div>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="text-xs text-slate-600">Population Trend</div>
                  <div className="font-semibold text-slate-900 capitalize">{threatData.population_trend}</div>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="text-xs text-slate-600">Habitat Loss</div>
                  <div className="font-semibold text-slate-900">{threatData.habitat_loss_percent.toFixed(1)}%</div>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="text-xs text-slate-600">Occurrences</div>
                  <div className="font-semibold text-slate-900">{threatData.occurrence_count}</div>
                </div>
              </CardContent>
            </Card>

            {/* Main threat gauge */}
            <ThreatGauge 
              score={threatData.threat_score}
              category={threatData.threat_category}
            />

            {/* Component breakdown */}
            <ThreatComponentBreakdown breakdown={threatData.threat_breakdown} />

            {/* Recommendations */}
            <RecommendationsList
              recommendations={threatData.recommendations}
              threatCategory={threatData.threat_category}
            />

            {/* Info alert */}
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                <strong>Methodology:</strong> Threat scores are calculated from habitat loss estimation (GBIF data), 
                IUCN conservation status, population trends, climate vulnerability (occurrence range), disease risk 
                (tropical zone density), and protection gaps. This assessment complements but does not replace formal 
                IUCN Red List evaluations.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Empty state */}
        {!threatData && !loading && selectedSpecies && (
          <Alert>
            <AlertDescription>
              No assessment data. Try selecting another species.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}