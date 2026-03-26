import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function RangeOverlayBackendExtractor({ species, onResultReady }) {
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState([]);
  const [minOverlap, setMinOverlap] = useState('0');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const speciesWithRanges = species.filter(sp => sp.range_data_geojson);

  const handleExtract = async () => {
    if (selectedSpeciesIds.length < 2) {
      toast.error('Select at least 2 species');
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await base44.functions.invoke('extractRangeOverlays', {
        species_ids: selectedSpeciesIds,
        min_overlap_area: parseInt(minOverlap) || 0
      });

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setResult(response.data);
      if (onResultReady && response.data?.result) {
        onResultReady(response.data.result);
      }
      toast.success(`Found ${response.data?.overlap_count || 0} overlaps`);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Extraction failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  const exportResult = () => {
    if (!result?.result) return;
    
    const blob = new Blob([JSON.stringify(result.result, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `range_overlays_backend_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exported overlay results');
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-indigo-600" />
        <h4 className="font-semibold text-sm text-slate-700">Backend Extraction</h4>
      </div>

      <div className="space-y-3">
        {/* Species selector */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            Species ({selectedSpeciesIds.length}/{speciesWithRanges.length})
          </label>
          <div className="max-h-32 overflow-y-auto border rounded-lg bg-white divide-y">
            {speciesWithRanges.length === 0 ? (
              <div className="p-2 text-xs text-slate-400">No species with range data</div>
            ) : (
              speciesWithRanges.map(sp => (
                <label key={sp.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSpeciesIds.includes(sp.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSpeciesIds(prev => [...prev, sp.id]);
                      } else {
                        setSelectedSpeciesIds(prev => prev.filter(id => id !== sp.id));
                      }
                    }}
                    className="w-3 h-3"
                  />
                  <span className="text-xs text-slate-700">{sp.common_name || sp.scientific_name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Min overlap filter */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            Min overlap (km²)
          </label>
          <input
            type="number"
            value={minOverlap}
            onChange={(e) => setMinOverlap(e.target.value)}
            min="0"
            className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Extract button */}
        <Button
          onClick={handleExtract}
          disabled={selectedSpeciesIds.length < 2 || running}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm h-8"
        >
          {running ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Extracting…
            </>
          ) : (
            <>
              <Zap className="w-3 h-3 mr-1.5" />
              Extract Overlays
            </>
          )}
        </Button>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{result.overlap_count} overlaps found</p>
                <p className="text-green-600 text-[11px]">{result.message}</p>
              </div>
            </div>

            {result.result?.features?.length > 0 && (
              <div>
                <div className="max-h-24 overflow-y-auto rounded-lg border bg-white divide-y text-[11px]">
                  {result.result.features.slice(0, 5).map((f, i) => (
                    <div key={i} className="px-2 py-1">
                      <span className="italic">{f.properties.species_1}</span> ⊗{' '}
                      <span className="italic">{f.properties.species_2}</span>
                      {f.properties.overlap_area_km2 && (
                        <span className="text-slate-500"> · {f.properties.overlap_area_km2.toLocaleString()} km²</span>
                      )}
                    </div>
                  ))}
                  {result.result.features.length > 5 && (
                    <div className="px-2 py-1 text-slate-500">+{result.result.features.length - 5} more</div>
                  )}
                </div>
                <Button
                  onClick={exportResult}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-xs h-7"
                >
                  Export GeoJSON
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}