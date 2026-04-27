import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader, AlertCircle, Globe, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ExternalDatabaseQuery({ onResultsLoaded }) {
  const [speciesName, setSpeciesName] = useState('');
  const [loading, setLoading] = useState(false);
  const [gbifData, setGbifData] = useState(null);
  const [iucnData, setIucnData] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!speciesName.trim()) {
      toast.error('Please enter a species name');
      return;
    }

    setLoading(true);
    setError(null);
    setGbifData(null);
    setIucnData(null);

    try {
      // Query both databases in parallel
      const [gbifRes, iucnRes] = await Promise.all([
        base44.functions.invoke('queryGBIFData', { species_name: speciesName }),
        base44.functions.invoke('queryIUCNData', { species_name: speciesName }),
      ]);

      if (gbifRes.data?.success) {
        setGbifData(gbifRes.data);
      }

      if (iucnRes.data?.success) {
        setIucnData(iucnRes.data);
      }

      if (!gbifRes.data?.success && !iucnRes.data?.success) {
        setError('Species not found in either GBIF or IUCN databases');
        toast.error('No results found');
      } else {
        onResultsLoaded?.({ gbif: gbifRes.data, iucn: iucnRes.data });
      }
    } catch (err) {
      console.error('Query error:', err);
      setError('Failed to query external databases');
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Query External Databases
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter species name (e.g., Panthera leo)"
            value={speciesName}
            onChange={(e) => setSpeciesName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            disabled={loading}
          />
          <Button
            onClick={handleSearch}
            disabled={loading || !speciesName.trim()}
            className="bg-bangor-red hover:bg-bangor-red/90"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>

        {/* Database Info */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-blue-50 border border-blue-200 p-2 rounded">
            <p className="font-semibold text-blue-900">GBIF</p>
            <p className="text-blue-800">Global occurrence records</p>
          </div>
          <div className="bg-red-50 border border-red-200 p-2 rounded">
            <p className="font-semibold text-red-900">IUCN Red List</p>
            <p className="text-red-800">Conservation status & threats</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{error}</p>
          </div>
        )}

        {/* Results Summary */}
        {(gbifData || iucnData) && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="font-medium text-slate-900">Query Results</p>
            
            {gbifData?.success && (
              <div className="text-sm">
                <p className="font-semibold text-slate-700">
                  {gbifData.species.scientific_name}
                </p>
                <p className="text-slate-600">
                  GBIF: {gbifData.occurrences.total_count.toLocaleString()} global occurrence records
                </p>
              </div>
            )}

            {iucnData?.success && (
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">
                    IUCN Status:
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    iucnData.conservation_status.iucn_status === 'EX' ? 'bg-gray-600 text-white' :
                    iucnData.conservation_status.iucn_status === 'EW' ? 'bg-red-700 text-white' :
                    iucnData.conservation_status.iucn_status === 'CR' ? 'bg-red-600 text-white' :
                    iucnData.conservation_status.iucn_status === 'EN' ? 'bg-red-500 text-white' :
                    iucnData.conservation_status.iucn_status === 'VU' ? 'bg-orange-500 text-white' :
                    iucnData.conservation_status.iucn_status === 'NT' ? 'bg-yellow-500 text-white' :
                    'bg-green-500 text-white'
                  }`}>
                    {iucnData.conservation_status.iucn_status}
                  </span>
                </div>
                <p className="text-slate-600 mt-1 text-xs">
                  Population trend: {iucnData.conservation_status.population_trend || 'Unknown'}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}