import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ExternalDatabaseQuery from '@/components/biodiversity/ExternalDatabaseQuery';
import ComparisonResults from '@/components/biodiversity/ComparisonResults';

export default function BiodiversityDataComparison() {
  const [queryResults, setQueryResults] = useState(null);
  const [selectedSpecies, setSelectedSpecies] = useState(null);

  // Fetch internal observations for comparison
  const { data: internalObservations = [] } = useQuery({
    queryKey: ['internalObservations', selectedSpecies],
    queryFn: async () => {
      if (!selectedSpecies) return [];
      return await base44.entities.Occurrence.filter({
        species_name: selectedSpecies,
      });
    },
    enabled: !!selectedSpecies,
  });

  const handleResultsLoaded = (results) => {
    setQueryResults(results);
    const speciesName = results.gbif?.species?.scientific_name || 
                       results.iucn?.species?.scientific_name;
    setSelectedSpecies(speciesName);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Biodiversity Data Comparison</h1>
          <p className="text-sm text-slate-600 mt-2">
            Query GBIF and IUCN databases to compare global occurrence records and conservation status with your field observations.
          </p>
        </div>

        {/* Query Panel */}
        <ExternalDatabaseQuery onResultsLoaded={handleResultsLoaded} />

        {/* Results */}
        {queryResults && (
          <ComparisonResults
            gbifData={queryResults.gbif}
            iucnData={queryResults.iucn}
            internalObservations={internalObservations}
          />
        )}

      </div>
    </div>
  );
}