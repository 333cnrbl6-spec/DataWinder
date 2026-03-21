import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CloudDownload, CheckCircle2, AlertCircle, Loader2, Server, Info } from 'lucide-react';

export default function BackendFetchButton({ source, datasetId, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(source?.url || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await base44.functions.invoke('fetchClimateFileToBackend', {
        download_url: url.trim(),
        dataset_name: source?.name || 'Climate Dataset',
        dataset_id: datasetId || null
      });

      if (res.data?.status === 'success') {
        setResult(res.data);
        onSuccess?.(res.data);
      } else {
        setError(res.data?.error || 'Unknown error');
      }
    } catch (e) {
      setError(e.message || 'Failed to fetch file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
        onClick={() => { setOpen(true); setResult(null); setError(null); setUrl(source?.url || ''); }}
      >
        <Server className="w-3 h-3 mr-1" />
        Fetch to Backend
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CloudDownload className="w-4 h-4 text-purple-600" />
              Fetch Dataset to Backend Storage
            </DialogTitle>
          </DialogHeader>

          {!result ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800 space-y-1">
                    <p className="font-semibold">How this works:</p>
                    <p>The server will download the file directly from the source URL — no local download needed. The file will be stored securely in your backend storage and registered in your Climate Datasets.</p>
                    <p className="text-blue-600 mt-1">Note: Many providers (WorldClim, CHELSA etc.) require you to visit their page and copy the direct file download URL.</p>
                  </div>
                </div>
              </div>

              {source && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">{source.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{source.provider} · {source.resolution} · {source.timePeriod}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Direct Download URL</label>
                <Input
                  placeholder="https://biogeo.ucdavis.edu/data/worldclim/v2.1/..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-slate-400">Paste the direct file URL (ZIP, TIF, etc.) — not the provider's webpage URL</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleFetch}
                  disabled={loading || !url.trim()}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fetching…</>
                  ) : (
                    <><CloudDownload className="w-4 h-4 mr-2" />Fetch to Backend</>
                  )}
                </Button>
              </div>

              {loading && (
                <p className="text-xs text-slate-500 text-center">
                  Downloading from source — this may take a minute for large files…
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <div className="text-center space-y-1">
                <p className="font-bold text-slate-700">File Stored Successfully!</p>
                <p className="text-sm text-slate-600">{result.file_name}</p>
                <p className="text-xs text-slate-400">{(result.file_size_bytes / 1024 / 1024).toFixed(1)} MB stored in backend</p>
                <p className="text-xs text-emerald-600 mt-2">{result.message}</p>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setOpen(false)}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}