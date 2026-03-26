/**
 * IUCNBulkExtractPanel
 *
 * Lets any user choose a data source for IUCN spatial extraction:
 *   1. App data  — species already in the DB (no extraction needed)
 *   2. Shared library — pick a bulk ZIP previously uploaded by anyone
 *   3. Upload own — upload a new bulk ZIP (saved to backend library for all)
 *
 * Then runs extractIUCNBulkSpecies against the chosen file_uri.
 */
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Database, Upload, Users, HardDrive, CheckCircle2,
  Loader2, Filter, X, Info, User, ChevronRight, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Mode definitions ──────────────────────────────────────────────────────────
const MODES = [
  {
    id: 'app_data',
    icon: Database,
    title: 'Use existing app data',
    subtitle: 'Work with species range data already in the database',
    border: 'border-blue-300',
    active: 'border-blue-500 ring-2 ring-blue-300 bg-blue-50',
  },
  {
    id: 'shared_library',
    icon: Users,
    title: 'Use shared bulk file',
    subtitle: 'Pick from bulk ZIPs already uploaded by other users',
    border: 'border-emerald-300',
    active: 'border-emerald-500 ring-2 ring-emerald-300 bg-emerald-50',
  },
  {
    id: 'my_upload',
    icon: Upload,
    title: 'Upload your own bulk ZIP',
    subtitle: 'Upload any IUCN bulk shapefile — saved to the shared library for everyone',
    border: 'border-amber-300',
    active: 'border-amber-500 ring-2 ring-amber-300 bg-amber-50',
  },
];

export default function IUCNBulkExtractPanel({ onDone }) {
  const [mode, setMode] = useState(null);

  // Shared library state
  const [library, setLibrary] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadTaxon, setUploadTaxon] = useState('');
  const [uploadVersion, setUploadVersion] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef();

  // Extraction state
  const [genusFilter, setGenusFilter] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState(null);
  const [extractError, setExtractError] = useState('');
  const [phase, setPhase] = useState('select'); // select | extract | done | error

  useEffect(() => {
    if (mode === 'shared_library') {
      setLoadingLibrary(true);
      base44.entities.IUCNBulkLibrary.list('-created_date', 100)
        .then(setLibrary)
        .finally(() => setLoadingLibrary(false));
    }
  }, [mode]);

  // ── Upload a new bulk ZIP to private storage + library ───────────────────
  const handleUploadAndExtract = async () => {
    if (!uploadFile) { setUploadError('Please select a ZIP file.'); return; }
    setUploading(true);
    setUploadError('');
    try {
      const user = await base44.auth.me();

      // Save to private backend
      const uploaded = await base44.integrations.Core.UploadPrivateFile({ file: uploadFile });
      const file_uri = uploaded.file_uri;

      // Add to shared library
      await base44.entities.IUCNBulkLibrary.create({
        label: uploadLabel || uploadFile.name,
        taxon_group: uploadTaxon || 'Unknown',
        iucn_version: uploadVersion || '',
        file_uri,
        file_size_mb: Math.round(uploadFile.size / 1024 / 1024 * 10) / 10,
        uploaded_by_email: user?.email || '',
        uploaded_by_name: user?.full_name || '',
        notes: uploadNotes || '',
      });

      setUploading(false);
      runExtraction(file_uri, uploadVersion);
    } catch (e) {
      setUploadError(e.message || 'Upload failed.');
      setUploading(false);
    }
  };

  // ── Run extraction against a file_uri ─────────────────────────────────────
  const runExtraction = async (file_uri, iucnVersion, modeType = 'shared_library') => {
    setExtracting(true);
    setExtractError('');
    setPhase('extract');

    try {
      const payload = modeType === 'app_data' ? { mode: 'app_data' } : { file_uri };
      if (genusFilter.trim()) payload.genus_filter = genusFilter.trim();

      // Create a custom abort controller with longer timeout (15 minutes for large files)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000);

      const result = await base44.functions.invoke('extractIUCNBulkSpecies', {
        ...payload,
        iucn_version: iucnVersion || ''
      });

      clearTimeout(timeoutId);

      if (result.data?.error) throw new Error(result.data.error);
      if (result.status >= 400) {
        throw new Error(result.data?.error || `Server error: ${result.status}`);
      }

      setExtractResult(result.data);
      setPhase('done');
      onDone?.();
    } catch (e) {
      const errorMsg = e?.response?.data?.error || e.message;
      const statusCode = e?.response?.status;

      let msg = errorMsg || 'Extraction failed';
      if (statusCode === 502 || statusCode === 504) {
        msg = 'Processing is taking too long. Try again with a smaller file or a more specific genus filter (like "Callithrix").';
      }

      setExtractError(msg);
      setPhase('error');
    } finally {
      setExtracting(false);
    }
  };

  // ── Confirm: start extract based on chosen mode ───────────────────────────
  const handleConfirm = () => {
    if (mode === 'app_data') {
      runExtraction(null, null, 'app_data');
      return;
    }
    if (mode === 'shared_library') {
      const entry = library.find(l => l.id === selectedLibraryId);
      if (!entry) return;
      runExtraction(entry.file_uri, entry.iucn_version, 'shared_library');
      return;
    }
    if (mode === 'my_upload') {
      handleUploadAndExtract();
    }
  };

  const canConfirm =
    (mode === 'app_data') ||
    (mode === 'shared_library' && !!selectedLibraryId) ||
    (mode === 'my_upload' && !!uploadFile && !uploading);

  // ── Extraction in progress ────────────────────────────────────────────────
  if (phase === 'extract') {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <div>
          <p className="font-semibold text-slate-700">Extracting species from bulk shapefile…</p>
          <p className="text-sm text-slate-400 mt-1">Large files (500MB+) can take 2–10 minutes. Please keep the window open.</p>
          {genusFilter && <p className="text-xs text-emerald-600 mt-1">✓ Using genus filter: <span className="font-medium">{genusFilter}</span> (faster)</p>}
        </div>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        <div>
          <p className="font-bold text-slate-700 text-lg">Extraction complete!</p>
          <p className="text-sm text-slate-500 mt-1">{extractResult?.message}</p>
        </div>
        {extractResult?.species?.length > 0 && (
          <div className="w-full max-h-40 overflow-y-auto rounded-lg bg-slate-50 border divide-y text-left">
            {extractResult.species.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="italic text-slate-700">{s.scientific_name}</span>
                <Badge variant={s.action === 'created' ? 'default' : 'secondary'} className="text-[10px]">{s.action}</Badge>
              </div>
            ))}
          </div>
        )}
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setPhase('select'); setMode(null); setExtractResult(null); }}>
          Extract more
        </Button>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <X className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <p className="font-bold text-slate-700">Extraction failed</p>
          <p className="text-sm text-red-500 mt-1">{extractError}</p>
        </div>
        <Button variant="outline" onClick={() => { setPhase('select'); setExtractError(''); }}>Try again</Button>
      </div>
    );
  }

  // ── Select mode ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-1">Choose your data source</p>
        <p className="text-xs text-slate-400">Different taxa need different bulk files — upload yours and it's shared with everyone.</p>
      </div>

      {/* Mode cards */}
      <div className="space-y-2">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              'w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all bg-white',
              mode === m.id ? m.active : `${m.border} hover:border-slate-400`
            )}
          >
            <m.icon className={cn('w-5 h-5 mt-0.5 shrink-0', mode === m.id ? 'text-slate-700' : 'text-slate-400')} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{m.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.subtitle}</p>
            </div>
            {mode === m.id && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-1" />}
          </button>
        ))}
      </div>

      {/* ── Shared library picker ── */}
      {mode === 'shared_library' && (
        <div className="rounded-xl border overflow-hidden">
          {loadingLibrary ? (
            <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : library.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">
              <HardDrive className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No bulk files yet — be the first to upload one!
            </div>
          ) : (
            <div className="divide-y max-h-52 overflow-y-auto">
              {library.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedLibraryId(entry.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors',
                    selectedLibraryId === entry.id && 'bg-emerald-50'
                  )}
                >
                  <HardDrive className={cn('w-4 h-4 mt-0.5 shrink-0', selectedLibraryId === entry.id ? 'text-emerald-600' : 'text-slate-400')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{entry.label}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {entry.taxon_group && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{entry.taxon_group}</Badge>}
                      {entry.iucn_version && <Badge variant="outline" className="text-[10px] px-1.5 py-0">v{entry.iucn_version}</Badge>}
                      {entry.file_size_mb && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{entry.file_size_mb} MB</Badge>}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <User className="w-2.5 h-2.5" /> {entry.uploaded_by_name || entry.uploaded_by_email || 'Unknown'}
                    </p>
                  </div>
                  {selectedLibraryId === entry.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Upload form ── */}
      {mode === 'my_upload' && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Your file is saved to private backend storage and added to the shared library for all users.
          </div>

          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-amber-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {uploadFile ? (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                <HardDrive className="w-4 h-4 text-amber-500" />
                <span className="font-medium">{uploadFile.name}</span>
                <span className="text-slate-400">({Math.round(uploadFile.size / 1024 / 1024 * 10) / 10} MB)</span>
                <button onClick={e => { e.stopPropagation(); setUploadFile(null); }}>
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                </button>
              </div>
            ) : (
              <div className="text-sm text-slate-400">
                <Upload className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                Click to select bulk ZIP file
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  setUploadFile(f);
                  if (!uploadLabel) setUploadLabel(f.name.replace(/\.zip$/i, ''));
                }
              }}
            />
          </div>

          <input
            type="text"
            placeholder="Label (e.g. Marine Fish 2025-1)"
            value={uploadLabel}
            onChange={e => setUploadLabel(e.target.value)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Taxon group (e.g. Sharks)"
              value={uploadTaxon}
              onChange={e => setUploadTaxon(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              type="text"
              placeholder="IUCN version (e.g. 2025-1)"
              value={uploadVersion}
              onChange={e => setUploadVersion(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <textarea
            placeholder="Notes (optional)"
            value={uploadNotes}
            onChange={e => setUploadNotes(e.target.value)}
            rows={2}
            className="w-full border rounded-lg px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        </div>
      )}

      {/* ── Genus filter (for bulk modes) ── */}
      {(mode === 'shared_library' || mode === 'my_upload') && (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Filter by genus / taxon</span>
          </div>
          <input
            type="text"
            value={genusFilter}
            onChange={e => setGenusFilter(e.target.value)}
            placeholder="e.g. Callithrix, Carcharhinus, Chelonia…"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-slate-400 mt-1">
            Leave blank to extract all species in the file (may be slow for large ZIPs).
          </p>
        </div>
      )}

      {/* ── Confirm button ── */}
      {mode && (
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={!canConfirm || uploading || extracting}
          onClick={handleConfirm}
          >
          {uploading
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading to library…</>
          : mode === 'app_data'
            ? <><Database className="w-4 h-4 mr-2" />Extract from app data →</>
            : <><Globe className="w-4 h-4 mr-2" />Extract species ranges →</>
          }
        </Button>
      )}
    </div>
  );
}