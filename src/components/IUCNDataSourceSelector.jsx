import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Database, Upload, FolderOpen, CheckCircle2, Loader2,
  HardDrive, Users, User, ChevronRight, X, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Upload a file to private backend storage and save a library record ──────
async function uploadBulkToLibrary({ file, label, taxonGroup, iucnVersion, notes, user }) {
  // Upload to private storage
  const uploaded = await base44.integrations.Core.UploadPrivateFile({ file });
  const file_uri = uploaded.file_uri;

  // Save a library record so others can reuse it
  await base44.entities.IUCNBulkLibrary.create({
    label: label || file.name,
    taxon_group: taxonGroup || 'Unknown',
    iucn_version: iucnVersion || '',
    file_uri,
    file_size_mb: Math.round(file.size / 1024 / 1024 * 10) / 10,
    uploaded_by_email: user?.email || '',
    uploaded_by_name: user?.full_name || '',
    notes: notes || ''
  });

  return file_uri;
}

// ── Modes ────────────────────────────────────────────────────────────────────
const MODES = [
  {
    id: 'app_data',
    icon: Database,
    title: 'Use app data',
    subtitle: "Extract from species already in this app's database",
    color: 'border-blue-300 bg-blue-50 text-blue-800',
    activeColor: 'border-blue-500 ring-2 ring-blue-300 bg-blue-50'
  },
  {
    id: 'shared_library',
    icon: Users,
    title: 'Use shared bulk file',
    subtitle: 'Pick a bulk ZIP already uploaded by another user',
    color: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    activeColor: 'border-emerald-500 ring-2 ring-emerald-300 bg-emerald-50'
  },
  {
    id: 'my_upload',
    icon: Upload,
    title: 'Upload your own bulk ZIP',
    subtitle: 'Upload an IUCN bulk shapefile ZIP — it will be shared in the library for others too',
    color: 'border-amber-300 bg-amber-50 text-amber-800',
    activeColor: 'border-amber-500 ring-2 ring-amber-300 bg-amber-50'
  }
];

export default function IUCNDataSourceSelector({ open, onClose, onSourceSelected }) {
  const [mode, setMode] = useState(null);
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

  useEffect(() => {
    if (open) {
      setMode(null);
      setSelectedLibraryId(null);
      setUploadFile(null);
      setUploadError('');
    }
  }, [open]);

  useEffect(() => {
    if (mode === 'shared_library') {
      setLoadingLibrary(true);
      base44.entities.IUCNBulkLibrary.list('-created_date', 100)
        .then(setLibrary)
        .finally(() => setLoadingLibrary(false));
    }
  }, [mode]);

  const handleConfirm = async () => {
    if (mode === 'app_data') {
      onSourceSelected({ type: 'app_data' });
      onClose();
      return;
    }

    if (mode === 'shared_library') {
      const entry = library.find(l => l.id === selectedLibraryId);
      if (!entry) return;
      onSourceSelected({ type: 'bulk', file_uri: entry.file_uri, label: entry.label, iucn_version: entry.iucn_version });
      onClose();
      return;
    }

    if (mode === 'my_upload') {
      if (!uploadFile) { setUploadError('Please select a ZIP file first.'); return; }
      setUploading(true);
      setUploadError('');
      try {
        const user = await base44.auth.me();
        const file_uri = await uploadBulkToLibrary({
          file: uploadFile,
          label: uploadLabel || uploadFile.name,
          taxonGroup: uploadTaxon,
          iucnVersion: uploadVersion,
          notes: uploadNotes,
          user
        });
        onSourceSelected({ type: 'bulk', file_uri, label: uploadLabel || uploadFile.name, iucn_version: uploadVersion });
        onClose();
      } catch (e) {
        setUploadError(e.message || 'Upload failed.');
      } finally {
        setUploading(false);
      }
    }
  };

  const canConfirm =
    mode === 'app_data' ||
    (mode === 'shared_library' && selectedLibraryId) ||
    (mode === 'my_upload' && uploadFile && !uploading);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            Select IUCN Data Source
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500 -mt-2">
          Choose where to load spatial data from. Bulk ZIPs you upload are stored securely and shared with all users.
        </p>

        {/* Mode cards */}
        <div className="space-y-2 mt-1">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all',
                mode === m.id ? m.activeColor : 'border-slate-200 hover:border-slate-300 bg-white'
              )}
            >
              <m.icon className={cn('w-5 h-5 mt-0.5 shrink-0', mode === m.id ? '' : 'text-slate-400')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{m.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{m.subtitle}</p>
              </div>
              {mode === m.id && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-1" />}
            </button>
          ))}
        </div>

        {/* Shared library picker */}
        {mode === 'shared_library' && (
          <div className="mt-2 border rounded-xl overflow-hidden">
            {loadingLibrary ? (
              <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading library…
              </div>
            ) : library.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                <HardDrive className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No bulk files in the shared library yet.<br />
                <span className="text-xs">Be the first to upload one!</span>
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

        {/* Upload form */}
        {mode === 'my_upload' && (
          <div className="mt-2 space-y-2">
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Your file will be uploaded to private backend storage and added to the shared library for all users.
            </div>

            {/* File picker */}
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
                  Click to select your bulk ZIP file
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

            {/* Metadata fields */}
            <input
              type="text"
              placeholder="Label (e.g. Terrestrial Mammals 2025-2)"
              value={uploadLabel}
              onChange={e => setUploadLabel(e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Taxon group (e.g. Marine Fish)"
                value={uploadTaxon}
                onChange={e => setUploadTaxon(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="text"
                placeholder="IUCN version (e.g. 2025-2)"
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

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || uploading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {uploading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</>
              : <><ChevronRight className="w-4 h-4 mr-1" />Continue</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}