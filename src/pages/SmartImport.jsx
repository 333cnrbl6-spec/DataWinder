import React, { useState, useRef } from 'react';
import { useSearchSounds } from '@/hooks/useSearchSounds';
import {
  FileText, CheckCircle, AlertCircle, Loader2,
  Database, Sparkles, Info, FileArchive, MapPin,
  CloudRain, ChevronRight, X, Download, FileQuestion
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import JSZip from 'jszip';

// ── Constants ────────────────────────────────────────────────────────────────

const IMPORTABLE_EXTS  = new Set(['csv', 'xlsx', 'xls', 'json', 'dbf']);
const GEOSPATIAL_EXTS  = new Set(['tif', 'tiff', 'asc', 'shp', 'geojson', 'kml', 'kmz']);
const DOCUMENT_EXTS    = new Set(['txt', 'pdf', 'doc', 'docx', 'md']);
// Shapefile companions — skip silently
const SHP_SIDECARS     = new Set(['prj', 'shx', 'cpg', 'sbn', 'sbx']);

const MIME = {
  csv:  'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls:  'application/vnd.ms-excel',
  json: 'application/json',
  pdf:  'application/pdf',
  dbf:  'application/octet-stream',
};

const ENTITY_OPTIONS = [
  { key: 'Species',       label: 'Species',        color: 'emerald' },
  { key: 'ClimateDataset',label: 'Climate Dataset', color: 'blue'    },
  { key: 'SpeciesList',   label: 'Species List',    color: 'amber'   },
  { key: 'MaxentRun',     label: 'MAXENT Run',      color: 'purple'  },
  { key: 'SavedSearch',   label: 'Saved Search',    color: 'slate'   },
];

const ENTITY_SCHEMA = {
  Species:        { type: 'object', properties: { scientific_name: { type: 'string' }, common_name: { type: 'string' }, iucn_status: { type: 'string' }, kingdom: { type: 'string' } } },
  ClimateDataset: { type: 'object', properties: { name: { type: 'string' }, source: { type: 'string' }, variable_category: { type: 'string' }, description: { type: 'string' } } },
  SpeciesList:    { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } },
  SavedSearch:    { type: 'object', properties: { name: { type: 'string' }, taxonomy_level: { type: 'string' }, search_term: { type: 'string' } } },
};

const BTN_COLOR = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  blue:    'bg-blue-50 border-blue-200 text-blue-800',
  amber:   'bg-amber-50 border-amber-200 text-amber-800',
  purple:  'bg-purple-50 border-purple-200 text-purple-800',
  slate:   'bg-slate-50 border-slate-200 text-slate-700',
};

// ── WorldClim / CHELSA auto-detect ───────────────────────────────────────────

const BIOCLIM = {
  1:'Annual Mean Temperature',2:'Mean Diurnal Range',3:'Isothermality',
  4:'Temperature Seasonality',5:'Max Temp Warmest Month',6:'Min Temp Coldest Month',
  7:'Temperature Annual Range',8:'Mean Temp Wettest Quarter',9:'Mean Temp Driest Quarter',
  10:'Mean Temp Warmest Quarter',11:'Mean Temp Coldest Quarter',12:'Annual Precipitation',
  13:'Precipitation Wettest Month',14:'Precipitation Driest Month',15:'Precipitation Seasonality',
  16:'Precipitation Wettest Quarter',17:'Precipitation Driest Quarter',
  18:'Precipitation Warmest Quarter',19:'Precipitation Coldest Quarter',
};

function detectClimateLayer(filename) {
  const f = filename.split('/').pop();
  const wc = f.match(/^wc[\d.]+_([\w]+)_bio_?(\d+)?\.tif$/i);
  if (wc) {
    const res = wc[1], n = wc[2] ? parseInt(wc[2]) : null;
    return { source: 'WorldClim', resolution: res, variable_category: n <= 11 ? 'Temperature' : 'Precipitation',
      name: n ? `WorldClim BIO${n} — ${BIOCLIM[n] || `BIO${n}`} (${res})` : `WorldClim Bioclimatic (${res})`,
      scenario: 'Historical/Baseline', maxent_ready: true };
  }
  const ch = f.match(/^CHELSA_([\w\d]+).*\.tif$/i);
  if (ch) return { source: 'CHELSA', variable_category: 'Bioclimatic', name: `CHELSA ${ch[1]}`, scenario: 'Historical/Baseline', maxent_ready: true };
  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ext = (name) => name.split('.').pop().toLowerCase();

function classifyEntry(name) {
  const e = ext(name);
  if (SHP_SIDECARS.has(e))  return 'skip';
  if (IMPORTABLE_EXTS.has(e)) return 'importable';
  if (DOCUMENT_EXTS.has(e))   return 'document';
  if (GEOSPATIAL_EXTS.has(e)) return 'geospatial';
  return 'unknown';
}

function toFile(bytes, name) {
  const e = ext(name);
  const safe = `file_${Date.now()}_${Math.random().toString(36).slice(2,5)}.${e}`;
  return new globalThis.File([bytes], safe, { type: MIME[e] || 'application/octet-stream' });
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SmartImport() {
  const [phase, setPhase]           = useState('idle');
  const [dragging, setDragging]     = useState(false);
  const [zipName, setZipName]       = useState('');
  const [errorMsg, setErrorMsg]     = useState('');
  const [importables, setImportables] = useState([]); // { name, file_url, analysis, rows, selectedEntity }
  const [documents, setDocuments]   = useState([]);   // { name, url }
  const [geospatials, setGeospatials] = useState([]); // { name, climateRecord? }
  const [importSummary, setImportSummary] = useState([]);

  const inputRef = useRef();
  const { playSuccess, playError, startTicking, stopTicking } = useSearchSounds();

  const reset = () => {
    setPhase('idle'); setErrorMsg(''); setZipName('');
    setImportables([]); setDocuments([]); setGeospatials([]); setImportSummary([]);
  };

  // ── Analyse one importable file (already uploaded) ────────────────────────
  const analyseFile = async (name, file_url) => {
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Biodiversity data analyst. File: "${name}".
Hints:
- inat/inaturalist/observations/occurrences/gbif/specieslink → Species
- iucn/redlist/data_0/binomial/presence/origin/binominal → Species (IUCN range data)
- climate/worldclim/chelsa/bio/bioclim → ClimateDataset
- list of species names → SpeciesList
Identify: 1) data type 2) best entity (Species/ClimateDataset/MaxentRun/SpeciesList/SavedSearch) 3) one-line reason 4) key fields. JSON only.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          suggested_entity:  { type: 'string' },
          confidence:        { type: 'number' },
          reasoning:         { type: 'string' },
          detected_fields:   { type: 'array', items: { type: 'string' } },
        }
      }
    });

    const schema = ENTITY_SCHEMA[analysis.suggested_entity] || ENTITY_SCHEMA.Species;
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: { type: 'object', properties: { records: { type: 'array', items: schema } } }
    });
    const rows = extracted?.output?.records || (Array.isArray(extracted?.output) ? extracted.output : []);
    return { name, file_url, analysis, rows, selectedEntity: analysis.suggested_entity };
  };

  // ── Process a single dropped file or ZIP ─────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return;
    reset();
    setPhase('scanning');
    startTicking(8000);

    try {
      const isZip = file.name.endsWith('.zip') || file.type === 'application/zip';

      // ── Single file (non-ZIP) ─────────────────────────────────────────────
      if (!isZip) {
        const cls = classifyEntry(file.name);

        if (cls === 'importable') {
          const f = toFile(await file.arrayBuffer(), file.name);
          const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
          const result = await analyseFile(file.name, file_url);
          setImportables([result]);
          stopTicking(); setPhase('results'); return;
        }

        if (cls === 'document') {
          const f = toFile(await file.arrayBuffer(), file.name);
          const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
          setDocuments([{ name: file.name, url: file_url }]);
          stopTicking(); setPhase('results'); return;
        }

        if (cls === 'geospatial') {
          const cr = detectClimateLayer(file.name);
          setGeospatials([{ name: file.name, climateRecord: cr }]);
          stopTicking(); setPhase('results'); return;
        }

        setGeospatials([{ name: file.name }]);
        stopTicking(); setPhase('results'); return;
      }

      // ── ZIP ───────────────────────────────────────────────────────────────
      setZipName(file.name);
      if (file.size > 500 * 1024 * 1024) throw new Error('ZIP too large (>500 MB). Extract and upload files individually.');

      const zip = new JSZip();
      await zip.loadAsync(file);
      const entries = Object.values(zip.files).filter(f => !f.dir && !f.name.startsWith('__MACOSX/'));
      if (entries.length === 0) throw new Error('ZIP is empty.');

      const toImport = [], toDocs = [], toGeo = [];

      for (const entry of entries) {
        const cls = classifyEntry(entry.name);
        if (cls === 'skip') continue;
        if (cls === 'importable') toImport.push(entry);
        else if (cls === 'document') toDocs.push(entry);
        else if (cls === 'geospatial') toGeo.push(entry);
        // unknown: silently skip
      }

      // Upload & analyse importable files
      const importableResults = await Promise.all(
        toImport.map(async (entry) => {
          const bytes = await entry.async('uint8array');
          const rawName = entry.name.split('/').pop();
          const f = toFile(bytes, rawName);
          const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
          return analyseFile(rawName, file_url);
        })
      );
      setImportables(importableResults);

      // Upload documents
      const docResults = [];
      for (const entry of toDocs) {
        const bytes = await entry.async('uint8array');
        const rawName = entry.name.split('/').pop();
        const f = toFile(bytes, rawName);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        docResults.push({ name: rawName, url: file_url });
      }
      setDocuments(docResults);

      // Geospatial — detect climate layers
      setGeospatials(toGeo.map(entry => {
        const rawName = entry.name.split('/').pop();
        return { name: rawName, climateRecord: detectClimateLayer(rawName) };
      }));

      stopTicking();
      setPhase('results');

    } catch (e) {
      stopTicking();
      playError();
      setErrorMsg(e.message || 'Failed to process file');
      setPhase('error');
    }
  };

  // ── Import confirmed records ──────────────────────────────────────────────
  const handleImportAll = async () => {
    setPhase('importing');
    startTicking(4000);
    const summary = [];
    try {
      for (const f of importables) {
        if (!f.selectedEntity || !f.rows?.length) continue;
        const entity = base44.entities[f.selectedEntity];
        if (!entity) continue;
        await entity.bulkCreate(f.rows);
        summary.push({ name: f.name, entity: f.selectedEntity, count: f.rows.length });
      }
      stopTicking();
      playSuccess();
      setImportSummary(summary);
      setPhase('done');
    } catch (e) {
      stopTicking();
      playError();
      setErrorMsg(e.message || 'Import failed');
      setPhase('error');
    }
  };

  const updateEntity = (idx, entity) =>
    setImportables(prev => prev.map((f, i) => i === idx ? { ...f, selectedEntity: entity } : f));

  const totalRows = importables.reduce((s, f) => s + (f.rows?.length || 0), 0);
  const hasResults = importables.length > 0 || documents.length > 0 || geospatials.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-bangor-red" />
          Smart Import
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Drop any file or ZIP archive — DataWinder will identify each file, import structured data into the database, and safely store documents and attachments.
        </p>
      </div>

      {/* Drop Zone */}
      {phase === 'idle' && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 select-none
              ${dragging ? 'border-bangor-red bg-bangor-red/5 scale-[1.01]' : 'border-slate-300 bg-slate-50 hover:border-bangor-red/50 hover:bg-bangor-red/5'}`}
          >
            <input ref={inputRef} type="file" className="hidden"
              accept=".csv,.xlsx,.xls,.json,.txt,.pdf,.zip,.tif,.tiff,.asc,.shp,.geojson,.kml,.dbf"
              onChange={(e) => handleFile(e.target.files[0])} />
            <FileArchive className={`w-12 h-12 mx-auto mb-3 transition-colors ${dragging ? 'text-bangor-red' : 'text-slate-300'}`} />
            <p className="text-base font-semibold text-slate-600">
              {dragging ? 'Release to analyse' : 'Drag & drop a file or ZIP archive'}
            </p>
            <p className="text-sm text-slate-400 mt-1">CSV · Excel · JSON · DBF · PDF · ZIP · Shapefile · GeoTIFF</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['Species data', 'IUCN exports', 'GBIF downloads', 'Climate datasets', 'Occurrence records'].map(t => (
                <span key={t} className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>

          {/* Info tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500">
            <div className="bg-white border border-slate-100 rounded-xl p-3 flex gap-2">
              <Database className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div><strong className="text-slate-700">Structured files</strong><br />CSV, Excel, JSON, DBF parsed and imported</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-xl p-3 flex gap-2">
              <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div><strong className="text-slate-700">Documents</strong><br />PDF, TXT uploaded to secure storage</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-xl p-3 flex gap-2">
              <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div><strong className="text-slate-700">Geospatial</strong><br />SHP, GeoTIFF directed to ArcGIS Tools</div>
            </div>
          </div>
        </>
      )}

      {/* Scanning */}
      {phase === 'scanning' && (
        <div className="flex flex-col items-center gap-4 py-20 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-10 h-10 text-bangor-red animate-spin" />
          <div className="text-center">
            <p className="font-semibold text-slate-700">Scanning{zipName ? ' archive' : ' file'}…</p>
            {zipName && <p className="text-sm text-slate-400 mt-1">{zipName}</p>}
            <p className="text-xs text-slate-400 mt-2">Identifying types, uploading documents, and analysing structured data…</p>
          </div>
        </div>
      )}

      {/* Results */}
      {phase === 'results' && hasResults && (
        <div className="space-y-6">
          {zipName && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <FileArchive className="w-4 h-4" />
              <span>From: <strong>{zipName}</strong></span>
            </div>
          )}

          {/* Importable structured files */}
          {importables.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-800 text-sm">Structured Data — Ready to Import</span>
                <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200">{importables.length} file{importables.length !== 1 ? 's' : ''}</Badge>
              </div>
              <div className="divide-y divide-slate-100">
                {importables.map((f, idx) => (
                  <div key={idx} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{f.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{f.analysis?.reasoning}</p>
                        {f.analysis?.detected_fields?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {f.analysis.detected_fields.slice(0, 6).map(field => (
                              <span key={field} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{field}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0">{f.rows?.length ?? 0} rows</Badge>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1.5">Import into:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {ENTITY_OPTIONS.map(opt => (
                          <button key={opt.key} onClick={() => updateEntity(idx, opt.key)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                              ${f.selectedEntity === opt.key
                                ? 'border-bangor-red bg-bangor-red/5 text-bangor-red shadow-sm'
                                : `border ${BTN_COLOR[opt.color]}`}`}
                          >
                            {f.selectedEntity === opt.key
                              ? <CheckCircle className="w-3 h-3 shrink-0" />
                              : <Database className="w-3 h-3 shrink-0 opacity-40" />}
                            {opt.label}
                            {f.analysis?.suggested_entity === opt.key && f.selectedEntity !== opt.key && (
                              <span className="ml-auto text-[9px] bg-bangor-red/10 text-bangor-red px-1 rounded">AI</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-800 text-sm">Documents — Uploaded & Stored</span>
                <Badge className="ml-auto bg-blue-100 text-blue-700 border-blue-200">{documents.length}</Badge>
              </div>
              <div className="divide-y divide-slate-100">
                {documents.map((f, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{f.name}</span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <a href={f.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="text-xs gap-1">
                          <Download className="w-3 h-3" /> View
                        </Button>
                      </a>
                      <Button size="sm" variant="outline" className="text-xs gap-1 border-blue-300 text-blue-700"
                        onClick={() => { window.location.href = '/LiteratureLibrary'; }}>
                        <FileText className="w-3 h-3" /> Literature Library
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="px-4 py-2 text-xs text-blue-600 bg-blue-50/50 border-t border-blue-100">
                Files stored securely. Open in Literature Library to attach to species research.
              </p>
            </section>
          )}

          {/* Geospatial / Climate layers */}
          {geospatials.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-amber-800 text-sm">Geospatial / Raster Files</span>
                <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200">{geospatials.length}</Badge>
              </div>
              <div className="px-4 py-3 space-y-1.5">
                {geospatials.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-sm text-slate-600 font-mono truncate">{f.name}</span>
                    {f.climateRecord && <Badge variant="secondary" className="text-[10px] shrink-0">Climate</Badge>}
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-amber-50/60 border-t border-amber-100 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs border-amber-300 text-amber-800"
                  onClick={() => { window.location.href = '/ArcGISTools'; }}>
                  <MapPin className="w-3.5 h-3.5" /> Open in ArcGIS Tools
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs border-blue-300 text-blue-800"
                  onClick={() => { window.location.href = '/ClimateProjections'; }}>
                  <CloudRain className="w-3.5 h-3.5" /> Open in Climate Data
                </Button>
                {geospatials.some(f => f.climateRecord) && (
                  <Button size="sm" className="gap-1.5 text-xs bg-slate-700 hover:bg-slate-800 text-white"
                    onClick={async () => {
                      const records = geospatials.filter(f => f.climateRecord).map(f => ({ ...f.climateRecord, description: f.climateRecord.description || f.name }));
                      await base44.entities.ClimateDataset.bulkCreate(records);
                      setGeospatials([]);
                    }}>
                    <Database className="w-3.5 h-3.5" /> Register Climate Layers in DB
                  </Button>
                )}
              </div>
            </section>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={reset} className="gap-1">
              <X className="w-4 h-4" /> Start Over
            </Button>
            {totalRows > 0 && (
              <Button className="flex-1 bg-bangor-red hover:bg-bangor-red/90 text-white gap-2" onClick={handleImportAll}>
                <Database className="w-4 h-4" />
                Import {totalRows} records into database
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Importing */}
      {phase === 'importing' && (
        <div className="flex flex-col items-center gap-4 py-20 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-10 h-10 text-bangor-red animate-spin" />
          <p className="font-semibold text-slate-700">Importing {totalRows} records…</p>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
          <CheckCircle className="w-14 h-14 text-emerald-500" />
          <div>
            <p className="text-xl font-bold text-slate-800">Import Complete!</p>
            <div className="mt-3 space-y-1">
              {importSummary.map((s, i) => (
                <p key={i} className="text-sm text-slate-600">
                  <strong>{s.count}</strong> records from <em>{s.name}</em> → <strong>{s.entity}</strong>
                </p>
              ))}
              {documents.length > 0 && (
                <p className="text-sm text-slate-600"><strong>{documents.length}</strong> document{documents.length !== 1 ? 's' : ''} uploaded to storage</p>
              )}
            </div>
          </div>
          <Button className="bg-bangor-red hover:bg-bangor-red/90 text-white" onClick={reset}>
            Import Another File
          </Button>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <div>
            <p className="font-bold text-slate-700">Something went wrong</p>
            <p className="text-sm text-red-500 mt-1">{errorMsg}</p>
          </div>
          <Button variant="outline" onClick={reset}>Try Again</Button>
        </div>
      )}
    </div>
  );
}