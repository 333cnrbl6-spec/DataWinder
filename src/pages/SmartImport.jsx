import React, { useState, useRef } from 'react';
import { useSearchSounds } from '@/hooks/useSearchSounds';
import {
  Upload, FileText, CheckCircle, AlertCircle, Loader2,
  Database, Sparkles, Info, File, FileArchive, MapPin,
  CloudRain, ChevronRight, X, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import JSZip from 'jszip';

// File types that can be parsed into database records
const IMPORTABLE_EXTS = ['csv', 'xlsx', 'xls', 'json'];
// Geospatial/binary — inform user, can't auto-import
const GEOSPATIAL_EXTS = ['tif', 'tiff', 'asc', 'shp', 'dbf', 'prj', 'shx', 'geojson', 'kml', 'kmz'];
// Text/document files — upload and store as files
const TEXT_EXTS = ['txt', 'pdf', 'doc', 'docx', 'md'];

const getFileExt = (name) => name.split('.').pop().toLowerCase();

const ENTITY_OPTIONS = [
  { key: 'Species', label: 'Species Record', description: 'Taxonomic & conservation data', color: 'emerald' },
  { key: 'ClimateDataset', label: 'Climate Dataset', description: 'Climate layers & variables', color: 'blue' },
  { key: 'MaxentRun', label: 'MAXENT Run', description: 'Model run configuration', color: 'purple' },
  { key: 'SpeciesList', label: 'Species List', description: 'A grouped list of species', color: 'amber' },
  { key: 'SavedSearch', label: 'Saved Search', description: 'Search query record', color: 'slate' },
];

const COLOR_MAP = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  blue: 'bg-blue-50 border-blue-200 text-blue-800',
  purple: 'bg-purple-50 border-purple-200 text-purple-800',
  amber: 'bg-amber-50 border-amber-200 text-amber-800',
  slate: 'bg-slate-50 border-slate-200 text-slate-800',
};

const ENTITY_SCHEMA = {
  Species: { type: 'object', properties: { scientific_name: { type: 'string' }, common_name: { type: 'string' }, kingdom: { type: 'string' }, iucn_status: { type: 'string' } } },
  ClimateDataset: { type: 'object', properties: { name: { type: 'string' }, source: { type: 'string' }, variable_category: { type: 'string' }, description: { type: 'string' } } },
  SpeciesList: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } },
  SavedSearch: { type: 'object', properties: { name: { type: 'string' }, taxonomy_level: { type: 'string' }, search_term: { type: 'string' } } },
};

// WorldClim bioclimatic variable descriptions
const BIOCLIM_VARS = {
  1: 'Annual Mean Temperature', 2: 'Mean Diurnal Range', 3: 'Isothermality',
  4: 'Temperature Seasonality', 5: 'Max Temperature of Warmest Month',
  6: 'Min Temperature of Coldest Month', 7: 'Temperature Annual Range',
  8: 'Mean Temperature of Wettest Quarter', 9: 'Mean Temperature of Driest Quarter',
  10: 'Mean Temperature of Warmest Quarter', 11: 'Mean Temperature of Coldest Quarter',
  12: 'Annual Precipitation', 13: 'Precipitation of Wettest Month',
  14: 'Precipitation of Driest Month', 15: 'Precipitation Seasonality',
  16: 'Precipitation of Wettest Quarter', 17: 'Precipitation of Driest Quarter',
  18: 'Precipitation of Warmest Quarter', 19: 'Precipitation of Coldest Quarter',
};

// Detect WorldClim/CHELSA-style TIF files and parse metadata
function parseGeospatialLayer(name) {
  const fname = name.split('/').pop();
  // WorldClim: wc2.1_10m_bio_1.tif or wc2.1_30s_bio_12.tif
  const wcMatch = fname.match(/^wc([\d.]+)_([\w]+)_(bio)_?(\d+)?\.tif$/i);
  if (wcMatch) {
    const resolution = wcMatch[2]; // e.g. 10m, 30s
    const varNum = wcMatch[4] ? parseInt(wcMatch[4]) : null;
    const varName = varNum ? (BIOCLIM_VARS[varNum] || `BIO${varNum}`) : 'Bioclimatic Layer';
    return {
      type: 'climate',
      record: {
        name: varNum ? `WorldClim BIO${varNum} — ${varName} (${resolution})` : `WorldClim Bioclimatic (${resolution})`,
        source: 'WorldClim',
        variable_category: varNum <= 11 ? 'Temperature' : varNum <= 19 ? 'Precipitation' : 'Bioclimatic',
        scenario: 'Historical/Baseline',
        resolution,
        variables: varNum ? [`BIO${varNum}: ${varName}`] : ['Bioclimatic'],
        description: varNum ? `${varName} — WorldClim v2.1 at ${resolution} resolution` : `WorldClim v2.1 bioclimatic variables at ${resolution} resolution`,
        maxent_ready: true,
      }
    };
  }
  // CHELSA: CHELSA_bio1_1981-2010_V.2.1.tif
  const chelsaMatch = fname.match(/^CHELSA_(bio\d+|[\w]+).*\.tif$/i);
  if (chelsaMatch) {
    return {
      type: 'climate',
      record: {
        name: `CHELSA ${chelsaMatch[1]} layer`,
        source: 'CHELSA',
        variable_category: 'Bioclimatic',
        scenario: 'Historical/Baseline',
        variables: [chelsaMatch[1]],
        description: `CHELSA ${fname}`,
        maxent_ready: true,
      }
    };
  }
  return { type: 'geospatial' };
}

// Classify a single file by extension
function classifyFile(name) {
  const ext = getFileExt(name);
  if (IMPORTABLE_EXTS.includes(ext)) return 'importable';
  if (GEOSPATIAL_EXTS.includes(ext)) return 'geospatial';
  if (TEXT_EXTS.includes(ext)) return 'text';
  return 'unknown';
}

export default function SmartImport() {
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | scanning | results | importing | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [zipName, setZipName] = useState('');

  // Results of scanning a ZIP
  const [importableFiles, setImportableFiles] = useState([]); // { name, file (File obj), analysis, rows, selectedEntity }
  const [textFiles, setTextFiles] = useState([]);             // { name, url, uploaded }
  const [geospatialFiles, setGeospatialFiles] = useState([]); // { name }
  const [climateLayerFiles, setClimateLayerFiles] = useState([]); // { name, record } — auto-detected climate layers
  const [unknownFiles, setUnknownFiles] = useState([]);

  const [importSummary, setImportSummary] = useState([]);

  const inputRef = useRef();
  const { playSuccess, playError, startTicking, stopTicking } = useSearchSounds();

  const reset = () => {
    setPhase('idle');
    setErrorMsg('');
    setZipName('');
    setImportableFiles([]);
    setTextFiles([]);
    setGeospatialFiles([]);
    setClimateLayerFiles([]);
    setUnknownFiles([]);
    setImportSummary([]);
  };

  const handleFile = async (file) => {
    if (!file) return;
    reset();
    setPhase('scanning');
    startTicking(6000);

    try {
      // ── Single non-ZIP file ──────────────────────────────────────────────
      if (!file.name.endsWith('.zip') && file.type !== 'application/zip') {
        const cls = classifyFile(file.name);
        if (cls === 'geospatial') {
          stopTicking();
          setGeospatialFiles([{ name: file.name }]);
          setPhase('results');
          return;
        }
        if (cls === 'text') {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          stopTicking();
          setTextFiles([{ name: file.name, url: file_url, uploaded: true }]);
          setPhase('results');
          return;
        }
        if (cls === 'importable') {
          await analyseAndSetImportable([{ name: file.name, rawFile: file }]); // native File obj — safe
          stopTicking();
          setPhase('results');
          return;
        }
        throw new Error(`Unsupported file type: ${getFileExt(file.name)}`);
      }

      // ── ZIP file ─────────────────────────────────────────────────────────
      setZipName(file.name);

      // Guard against very large ZIPs (> 500 MB) that the browser cannot reliably read
      const MAX_ZIP_BYTES = 500 * 1024 * 1024;
      if (file.size > MAX_ZIP_BYTES) {
        throw new Error(
          `This ZIP archive is too large to process in the browser (${(file.size / 1024 / 1024).toFixed(0)} MB). ` +
          `Please extract it first and upload individual files, or use ArcGIS Tools for large geospatial datasets.`
        );
      }

      const zip = new JSZip();
      await zip.loadAsync(file);

      const entries = Object.values(zip.files).filter(f => !f.dir && !f.name.startsWith('__MACOSX/'));
      if (entries.length === 0) throw new Error('ZIP file is empty');

      const importables = [], texts = [], geospatials = [], climateLayers = [], unknowns = [];

      for (const entry of entries) {
        const cls = classifyFile(entry.name);
        if (cls === 'importable') importables.push(entry);
        else if (cls === 'text') texts.push(entry);
        else if (cls === 'geospatial') {
          const parsed = parseGeospatialLayer(entry.name);
          if (parsed.type === 'climate') climateLayers.push({ name: entry.name.split('/').pop(), record: parsed.record });
          else geospatials.push(entry);
        }
        else unknowns.push(entry);
      }

      setGeospatialFiles(geospatials.map(f => ({ name: f.name })));
      setClimateLayerFiles(climateLayers);
      setUnknownFiles(unknowns.map(f => ({ name: f.name })));

      // Upload text files
      const uploadedTexts = await Promise.all(
        texts.map(async (entry) => {
          const uint8 = await entry.async('uint8array');
          const ext = getFileExt(entry.name);
          const safeFileName = `doc_${Date.now()}.${ext}`;
          const blob = new Blob([uint8], { type: 'text/plain' });
          Object.defineProperty(blob, 'name', { value: safeFileName });
          Object.defineProperty(blob, 'lastModified', { value: Date.now() });
          const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });
          return { name: entry.name, url: file_url, uploaded: true };
        })
      );
      setTextFiles(uploadedTexts);

      // Convert importable ZIP entries to named Blobs for upload
      const importableRaw = await Promise.all(
        importables.map(async (entry) => {
          const uint8 = await entry.async('uint8array');
          const ext = getFileExt(entry.name);
          const mime = { csv: 'text/csv', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', json: 'application/json' }[ext] || 'application/octet-stream';
          // Sanitise filename: strip path, replace special chars, keep extension
          const rawFileName = entry.name.split('/').pop();
          const safeFileName = `data_${Date.now()}.${ext}`;
          const blob = new Blob([uint8], { type: mime });
          Object.defineProperty(blob, 'name', { value: safeFileName });
          Object.defineProperty(blob, 'lastModified', { value: Date.now() });
          return { name: rawFileName, rawFile: blob };
        })
      );

      await analyseAndSetImportable(importableRaw);
      stopTicking();
      setPhase('results');

    } catch (e) {
      stopTicking();
      playError();
      setErrorMsg(e.message || 'Failed to analyse file');
      setPhase('error');
    }
  };

  const analyseAndSetImportable = async (rawFiles) => {
    const results = await Promise.all(
      rawFiles.map(async ({ name, rawFile }) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: rawFile });
        const aiAnalysis = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a biodiversity data analyst. A user uploaded a file named "${name}". Determine: 1. What data it contains 2. Best entity match: Species, ClimateDataset, MaxentRun, SpeciesList, SavedSearch 3. Brief reasoning 4. Key fields detected. Respond JSON only.`,
          file_urls: [file_url],
          response_json_schema: {
            type: 'object',
            properties: {
              suggested_entity: { type: 'string' },
              confidence: { type: 'number' },
              reasoning: { type: 'string' },
              detected_fields: { type: 'array', items: { type: 'string' } },
            }
          }
        });

        const targetSchema = ENTITY_SCHEMA[aiAnalysis.suggested_entity] || ENTITY_SCHEMA['Species'];
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: { type: 'object', properties: { records: { type: 'array', items: targetSchema } } }
        });
        const rows = extracted?.output?.records || (Array.isArray(extracted?.output) ? extracted.output : []);

        return { name, file_url, analysis: aiAnalysis, rows, selectedEntity: aiAnalysis.suggested_entity };
      })
    );
    setImportableFiles(results);
  };

  const updateSelectedEntity = (idx, entity) => {
    setImportableFiles(prev => prev.map((f, i) => i === idx ? { ...f, selectedEntity: entity } : f));
  };

  const handleImportAll = async () => {
    const filesToImport = importableFiles;
    const climatesToImport = climateLayerFiles;
    setPhase('importing');
    startTicking(4000);
    const summary = [];
    try {
      for (const f of filesToImport) {
        if (!f.selectedEntity || f.rows.length === 0) continue;
        const entity = base44.entities[f.selectedEntity];
        if (!entity) continue;
        await entity.bulkCreate(f.rows);
        summary.push({ name: f.name, entity: f.selectedEntity, count: f.rows.length });
      }
      if (climatesToImport.length > 0) {
        await base44.entities.ClimateDataset.bulkCreate(climatesToImport.map(c => c.record));
        summary.push({ name: `${climatesToImport.length} climate layer(s)`, entity: 'ClimateDataset', count: climatesToImport.length });
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

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const totalImportable = importableFiles.reduce((s, f) => s + f.rows.length, 0);
  const hasAnything = importableFiles.length > 0 || textFiles.length > 0 || geospatialFiles.length > 0 || climateLayerFiles.length > 0;

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
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 select-none
            ${dragging ? 'border-bangor-red bg-bangor-red/5 scale-[1.01]' : 'border-slate-300 bg-slate-50 hover:border-bangor-red/50 hover:bg-bangor-red/5'}`}
        >
          <input ref={inputRef} type="file" className="hidden"
            accept=".csv,.xlsx,.xls,.json,.txt,.pdf,.zip,.tif,.tiff,.asc,.shp,.geojson,.kml"
            onChange={(e) => handleFile(e.target.files[0])} />
          <FileArchive className={`w-12 h-12 mx-auto mb-3 transition-colors ${dragging ? 'text-bangor-red' : 'text-slate-300'}`} />
          <p className="text-base font-semibold text-slate-600">
            {dragging ? 'Release to analyse' : 'Drag & drop a file or ZIP archive'}
          </p>
          <p className="text-sm text-slate-400 mt-1">CSV · Excel · JSON · TXT · PDF · ZIP · Shapefile · GeoTIFF</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['Species data', 'Climate datasets', 'IUCN exports', 'GBIF downloads', 'Occurrence records'].map(t => (
              <span key={t} className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Scanning */}
      {phase === 'scanning' && (
        <div className="flex flex-col items-center gap-4 py-16 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-10 h-10 text-bangor-red animate-spin" />
          <div className="text-center">
            <p className="font-semibold text-slate-700">Scanning archive…</p>
            {zipName && <p className="text-sm text-slate-400 mt-1">{zipName}</p>}
            <p className="text-xs text-slate-400 mt-2">Identifying file types, uploading documents, and analysing structured data…</p>
          </div>
        </div>
      )}

      {/* Results */}
      {phase === 'results' && hasAnything && (
        <div className="space-y-6">
          {zipName && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <FileArchive className="w-4 h-4" />
              <span>From: <strong>{zipName}</strong></span>
            </div>
          )}

          {/* Importable structured files */}
          {importableFiles.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-800 text-sm">Structured Data — Ready to Import</span>
                <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200">{importableFiles.length} file{importableFiles.length > 1 ? 's' : ''}</Badge>
              </div>
              <div className="divide-y divide-slate-100">
                {importableFiles.map((f, idx) => (
                  <div key={idx} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{f.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{f.analysis.reasoning}</p>
                        {f.analysis.detected_fields?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {f.analysis.detected_fields.slice(0, 6).map(field => (
                              <span key={field} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{field}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary">{f.rows.length} rows</Badge>
                    </div>
                    {/* Entity selector */}
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1.5">Import into:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {ENTITY_OPTIONS.map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => updateSelectedEntity(idx, opt.key)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                              ${f.selectedEntity === opt.key
                                ? 'border-bangor-red bg-bangor-red/5 text-bangor-red shadow-sm'
                                : `border ${COLOR_MAP[opt.color]}`
                              }`}
                          >
                            {f.selectedEntity === opt.key
                              ? <CheckCircle className="w-3 h-3 shrink-0" />
                              : <Database className="w-3 h-3 shrink-0 opacity-50" />
                            }
                            {opt.label}
                            {f.analysis.suggested_entity === opt.key && f.selectedEntity !== opt.key && (
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

          {/* Text / document files */}
          {textFiles.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-800 text-sm">Documents — Uploaded & Stored</span>
                <Badge className="ml-auto bg-blue-100 text-blue-700 border-blue-200">{textFiles.length} file{textFiles.length > 1 ? 's' : ''}</Badge>
              </div>
              <div className="divide-y divide-slate-100">
                {textFiles.map((f, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{f.name}</span>
                    </div>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="text-xs gap-1 shrink-0">
                        <Download className="w-3 h-3" /> View
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 bg-blue-50/50 border-t border-blue-100">
                <p className="text-xs text-blue-600">These files have been uploaded to secure storage. Copy the links above to reference them.</p>
              </div>
            </section>
          )}

          {/* Geospatial files */}
          {geospatialFiles.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-amber-800 text-sm">Geospatial / Raster Files</span>
                <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200">{geospatialFiles.length} file{geospatialFiles.length > 1 ? 's' : ''}</Badge>
              </div>
              <div className="px-4 py-3 space-y-2">
                {geospatialFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-sm text-slate-600 font-mono">{f.name}</span>
                  </div>
                ))}
                <p className="text-xs text-amber-700 mt-2 pt-2 border-t border-amber-100">
                  Geospatial files cannot be auto-imported. Use <strong>ArcGIS Tools</strong> or <strong>Climate Data</strong> to work with these layers.
                </p>
              </div>
            </section>
          )}

          {/* Unknown files */}
          {unknownFiles.length > 0 && (
            <section className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">Skipped (unrecognised format)</p>
              {unknownFiles.map((f, idx) => (
                <p key={idx} className="text-xs text-slate-400 font-mono">{f.name}</p>
              ))}
            </section>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={reset} className="gap-1">
              <X className="w-4 h-4" /> Start Over
            </Button>
            {importableFiles.length > 0 && totalImportable > 0 && (
              <Button
                className="flex-1 bg-bangor-red hover:bg-bangor-red/90 text-white gap-2"
                onClick={handleImportAll}
              >
                <Database className="w-4 h-4" />
                Import {totalImportable} records into database
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Importing */}
      {phase === 'importing' && (
        <div className="flex flex-col items-center gap-4 py-16 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-10 h-10 text-bangor-red animate-spin" />
          <p className="font-semibold text-slate-700">Importing {totalImportable} records…</p>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
          <CheckCircle className="w-14 h-14 text-emerald-500" />
          <div>
            <p className="text-xl font-bold text-slate-800">Import Complete!</p>
            <div className="mt-3 space-y-1.5">
              {importSummary.map((s, i) => (
                <p key={i} className="text-sm text-slate-600">
                  <strong>{s.count}</strong> records from <em>{s.name}</em> → <strong>{s.entity}</strong>
                </p>
              ))}
              {textFiles.length > 0 && (
                <p className="text-sm text-slate-600"><strong>{textFiles.length}</strong> document{textFiles.length > 1 ? 's' : ''} uploaded to storage</p>
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

      {/* Info footer */}
      {phase === 'idle' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500">
          <div className="bg-white border border-slate-100 rounded-xl p-3 flex gap-2">
            <Database className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div><strong className="text-slate-700">Structured files</strong><br />CSV, Excel, JSON are parsed and imported into the database</div>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-3 flex gap-2">
            <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div><strong className="text-slate-700">Documents</strong><br />TXT, PDF files are uploaded to secure storage with download links</div>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-3 flex gap-2">
            <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div><strong className="text-slate-700">Geospatial</strong><br />SHP, GeoTIFF etc. are identified and directed to ArcGIS Tools</div>
          </div>
        </div>
      )}
    </div>
  );
}