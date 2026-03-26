import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, CheckCircle2, AlertCircle, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function IUCNBackendExtractor() {
  const [selectedLibraryId, setSelectedLibraryId] = useState(null);
  const [genusFilter, setGenusFilter] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const { data: library = [], isLoading: libLoading } = useQuery({
    queryKey: ['iucnBulkLibrary'],
    queryFn: () => base44.entities.IUCNBulkLibrary.list('-created_date', 100)
  });

  const handleExtract = async () => {
    if (!selectedLibraryId) {
      toast.error('Please select a bulk file');
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);

    try {
       // Create timeout controller (20 min max - allows for large file processing)
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), 20 * 60 * 1000);

       const response = await base44.functions.invoke('automatedIUCNExtract', {
         library_id: selectedLibraryId,
         ...(genusFilter.trim() ? { genus_filter: genusFilter.trim() } : {})
       });

       clearTimeout(timeoutId);

       if (response.data?.error) {
         throw new Error(response.data.error);
       }

       if (response.status >= 400) {
         throw new Error(response.data?.error || `Server error: ${response.status}`);
       }

       setResult(response.data);
       toast.success(`Extracted ${response.data?.species_count || 0} species`);
     } catch (err) {
       const statusCode = err?.response?.status;
       let msg = err?.response?.data?.error || err.message || 'Extraction failed';

       // Handle specific error cases
       if (statusCode === 502 || statusCode === 504) {
         msg = 'Processing exceeded timeout. Try with a more specific genus filter (e.g., "Callithrix" vs "Callitrichidae").';
       } else if (err.name === 'AbortError') {
         msg = 'Request cancelled (timeout).';
       }

       setError(msg);
       toast.error(msg);
     } finally {
       setRunning(false);
     }
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-slate-700">Backend Extraction</h3>
      </div>

      <div className="space-y-4">
        {/* Library selector */}
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase block mb-2">
            Bulk File
          </label>
          {libLoading ? (
            <div className="flex items-center justify-center py-6 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
            </div>
          ) : library.length === 0 ? (
            <p className="text-sm text-slate-500">No bulk files available</p>
          ) : (
            <select
              value={selectedLibraryId || ''}
              onChange={(e) => setSelectedLibraryId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select a bulk file…</option>
              {library.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label} ({entry.file_size_mb} MB)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Genus filter */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <label className="text-xs font-semibold text-slate-600 uppercase">
              Filter (optional)
            </label>
          </div>
          <input
            type="text"
            value={genusFilter}
            onChange={(e) => setGenusFilter(e.target.value)}
            placeholder="e.g. Panthera, Callithrix"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Extract button */}
        <Button
          onClick={handleExtract}
          disabled={!selectedLibraryId || running}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Extracting…
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Extract Now
            </>
          )}
        </Button>

        {/* Error state */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success state */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{result.species_count} species extracted</p>
                <p className="text-xs text-green-600 mt-0.5">{result.message}</p>
              </div>
            </div>

            {/* Species list */}
            {result.species?.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border bg-white divide-y text-sm">
                {result.species.slice(0, 10).map((sp, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2">
                    <span className="italic text-slate-700 text-xs">{sp.scientific_name}</span>
                    <Badge 
                      variant={sp.action === 'created' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {sp.action}
                    </Badge>
                  </div>
                ))}
                {result.species.length > 10 && (
                  <div className="px-3 py-2 text-xs text-slate-500">
                    +{result.species.length - 10} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}