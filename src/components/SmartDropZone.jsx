import React, { useState, useRef } from 'react';
import { useSearchSounds } from '@/hooks/useSearchSounds';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Database, Sparkles, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import JSZip from 'jszip';

// File types that can be parsed into database records
const IMPORTABLE_EXTS = ['csv', 'xlsx', 'xls', 'json', 'txt'];
// File types that are geospatial/binary — inform user but can't auto-import
const GEOSPATIAL_EXTS = ['tif', 'tiff', 'asc', 'shp', 'dbf', 'prj', 'shx', 'geojson', 'kml', 'kmz'];

const getFileExt = (name) => name.split('.').pop().toLowerCase();

const ENTITY_OPTIONS = [
  { key: 'Species', label: 'Species Record', description: 'Taxonomic & conservation data', color: 'green' },
  { key: 'ClimateDataset', label: 'Climate Dataset', description: 'Climate layers & variables', color: 'blue' },
  { key: 'MaxentRun', label: 'MAXENT Run', description: 'Model run configuration', color: 'purple' },
  { key: 'SpeciesList', label: 'Species List', description: 'A grouped list of species', color: 'amber' },
  { key: 'SavedSearch', label: 'Saved Search', description: 'Search query record', color: 'slate' },
];

const COLOR_MAP = {
  green: 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100',
  blue: 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100',
  purple: 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100',
  amber: 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100',
  slate: 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100',
};

export default function SmartDropZone({ onImported }) {
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('idle'); // idle | analysing | confirm | importing | done | error
  const [fileInfo, setFileInfo] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [importCount, setImportCount] = useState(0);
  const inputRef = useRef();
  const { playSuccess, playError, startTicking, stopTicking } = useSearchSounds();

  const reset = () => {
    setStep('idle');
    setFileInfo(null);
    setAiResult(null);
    setSelectedEntity(null);
    setParsedRows([]);
    setErrorMsg('');
    setImportCount(0);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setOpen(true);
    setStep('analysing');
    setFileInfo({ name: file.name, size: file.size, type: file.type });
    startTicking(4000);

    try {
      let fileToProcess = file;
      let extractedFrom = null;
      
      // If ZIP file, unzip and get first supported extractable file
      if (file.name.endsWith('.zip') || file.type === 'application/zip') {
        const zip = new JSZip();
        await zip.loadAsync(file);
        
        const files = Object.values(zip.files).filter(f => !f.dir && !f.name.startsWith('__MACOSX/'));
        if (files.length === 0) throw new Error('ZIP file is empty or contains no valid files');
        
        // Prioritize importable file formats; if none found, check if it's all geospatial
        const importableFile = files.find(f => IMPORTABLE_EXTS.includes(getFileExt(f.name)));
        const geospatialFiles = files.filter(f => GEOSPATIAL_EXTS.includes(getFileExt(f.name)));
        
        if (!importableFile && geospatialFiles.length > 0) {
          // ZIP contains only geospatial/raster data — inform user
          setFileInfo({ name: file.name, size: file.size, type: file.type, isGeospatialArchive: true, fileList: files.map(f => f.name) });
          setStep('geospatial');
          return;
        }
        
        const fileToExtract = importableFile || files[0];
        const blob = await fileToExtract.async('blob');
        const ext = getFileExt(fileToExtract.name);
        const mimeTypes = { csv: 'text/csv', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', json: 'application/json', txt: 'text/plain' };
        const mimeType = mimeTypes[ext] || blob.type || 'application/octet-stream';
        
        fileToProcess = new File([blob], fileToExtract.name, { type: mimeType });
        extractedFrom = file.name;
        setFileInfo({ name: fileToExtract.name, size: blob.size, type: mimeType, extractedFrom });
      } else {
        // Single file — check if it's a non-importable geospatial type
        const ext = getFileExt(file.name);
        if (GEOSPATIAL_EXTS.includes(ext)) {
          setFileInfo({ name: file.name, size: file.size, type: file.type, isGeospatial: true });
          setStep('geospatial');
          return;
        }
      }

      // Upload file first to get URL
      const { file_url } = await base44.integrations.Core.UploadFile({ file: fileToProcess });

      // Ask AI what this data is
      const aiAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a biodiversity data analyst. A user has uploaded a file named "${fileToProcess.name}". 
      Examine the file content and determine:
      1. What type of data it contains (species records, climate data, occurrence records, etc.)
      2. Which database entity it best matches: Species, ClimateDataset, MaxentRun, SpeciesList, or SavedSearch
      3. A brief 1-sentence explanation of your reasoning
      4. Key fields you detected in the data

      Respond with JSON only.`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            suggested_entity: { type: 'string' },
            confidence: { type: 'number' },
            reasoning: { type: 'string' },
            detected_fields: { type: 'array', items: { type: 'string' } },
            sample_values: { type: 'object' }
          }
        }
      });

      // Extract structured data
      const entitySchema = {
        Species: { type: 'object', properties: { scientific_name: { type: 'string' }, common_name: { type: 'string' }, kingdom: { type: 'string' }, iucn_status: { type: 'string' } } },
        ClimateDataset: { type: 'object', properties: { name: { type: 'string' }, source: { type: 'string' }, variable_category: { type: 'string' }, description: { type: 'string' } } },
        SpeciesList: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } },
        SavedSearch: { type: 'object', properties: { name: { type: 'string' }, taxonomy_level: { type: 'string' }, search_term: { type: 'string' } } },
      };

      const targetSchema = entitySchema[aiAnalysis.suggested_entity] || entitySchema['Species'];

      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            records: {
              type: 'array',
              items: targetSchema
            }
          }
        }
      });

      const rows = extracted?.output?.records || (Array.isArray(extracted?.output) ? extracted.output : []);
      setParsedRows(rows);
      setAiResult(aiAnalysis);
      setSelectedEntity(aiAnalysis.suggested_entity);
      stopTicking();
      setStep('confirm');
    } catch (e) {
      stopTicking();
      playError();
      setErrorMsg(e.message || 'Failed to analyse file');
      setStep('error');
    }
  };

  const handleImport = async () => {
    if (!selectedEntity || parsedRows.length === 0) return;
    setStep('importing');
    startTicking(4000);
    try {
      const entity = base44.entities[selectedEntity];
      if (!entity) throw new Error(`Unknown entity: ${selectedEntity}`);
      await entity.bulkCreate(parsedRows);
      stopTicking();
      playSuccess();
      setImportCount(parsedRows.length);
      setStep('done');
      onImported && onImported(selectedEntity, parsedRows.length);
    } catch (e) {
      stopTicking();
      playError();
      setErrorMsg(e.message || 'Import failed');
      setStep('error');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <>
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 select-none
          ${dragging
            ? 'border-bangor-red bg-bangor-red/5 scale-[1.01]'
            : 'border-slate-300 bg-slate-50 hover:border-bangor-red/50 hover:bg-bangor-red/5'
          }`}
      >
        <input ref={inputRef} type="file" className="hidden"
          accept=".csv,.xlsx,.xls,.json,.txt,.zip,.tif,.tiff,.asc,.shp,.geojson,.kml"
          onChange={(e) => handleFile(e.target.files[0])} />
        <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors ${dragging ? 'text-bangor-red' : 'text-slate-400'}`} />
        <p className="text-sm font-semibold text-slate-600">
          {dragging ? 'Release to analyse & import' : 'Drag & drop a file to import'}
        </p>
        <p className="text-xs text-slate-400 mt-1">CSV · Excel · JSON · ZIP — DataWinder will identify where your data belongs</p>
      </div>

      {/* Smart Import Modal */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); setOpen(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-bangor-red" />
              Smart Data Import
            </DialogTitle>
          </DialogHeader>

          {/* Analysing */}
          {step === 'analysing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-bangor-red animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-slate-700">Analysing your file…</p>
                <p className="text-sm text-slate-500 mt-1">{fileInfo?.extractedFrom || fileInfo?.name}</p>
                {fileInfo?.extractedFrom && (
                  <p className="text-xs text-emerald-600 mt-1">📦 Extracted: {fileInfo.name}</p>
                )}
                <p className="text-xs text-slate-400 mt-2">DataWinder is examining the data structure and content…</p>
              </div>
            </div>
          )}

          {/* Confirm */}
          {step === 'confirm' && aiResult && (
            <div className="space-y-4">
              {/* AI Summary */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">DataWinder's Analysis</p>
                    <p className="text-xs text-emerald-700 mt-0.5">{aiResult.reasoning}</p>
                    {aiResult.detected_fields?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {aiResult.detected_fields.slice(0, 8).map(f => (
                          <span key={f} className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Record count */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Records found:</span>
                <Badge variant="secondary" className="font-bold">{parsedRows.length} rows</Badge>
              </div>

              {/* Entity selection */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Import into which database table?</p>
                <div className="grid grid-cols-1 gap-2">
                  {ENTITY_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setSelectedEntity(opt.key)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all
                        ${selectedEntity === opt.key
                          ? 'border-bangor-red bg-bangor-red/5 shadow-sm'
                          : `border-transparent ${COLOR_MAP[opt.color]}`
                        }`}
                    >
                      <Database className="w-4 h-4 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-xs opacity-70">{opt.description}</p>
                      </div>
                      {aiResult.suggested_entity === opt.key && (
                        <span className="text-[10px] bg-bangor-red text-white px-1.5 py-0.5 rounded font-semibold shrink-0">DW Pick</span>
                      )}
                      {selectedEntity === opt.key && <CheckCircle className="w-4 h-4 text-bangor-red shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => { reset(); setOpen(false); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-bangor-red hover:bg-bangor-red/90 text-white"
                  disabled={!selectedEntity || parsedRows.length === 0}
                  onClick={handleImport}
                >
                  Import {parsedRows.length} records → {selectedEntity}
                </Button>
              </div>
            </div>
          )}

          {/* Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-bangor-red animate-spin" />
              <p className="font-semibold text-slate-700">Importing {parsedRows.length} records into {selectedEntity}…</p>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
              <div className="text-center">
                <p className="font-bold text-slate-700 text-lg">Import Complete!</p>
                <p className="text-sm text-slate-500 mt-1">{importCount} records added to <strong>{selectedEntity}</strong></p>
              </div>
              <Button className="bg-bangor-red hover:bg-bangor-red/90 text-white" onClick={() => { reset(); setOpen(false); }}>
                Done
              </Button>
            </div>
          )}

          {/* Geospatial / raster file — can't auto-import */}
          {step === 'geospatial' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-bold text-slate-700">Geospatial / Raster File Detected</p>
                <p className="text-sm text-slate-600">
                  <strong>{fileInfo?.name}</strong> is a geospatial or raster file (e.g. GeoTIFF, Shapefile). 
                  These files cannot be imported directly into the species database.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left mt-2">
                  <p className="text-xs font-semibold text-blue-800 mb-1">What to do instead:</p>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li>Use <strong>ArcGIS Tools</strong> to work with raster/vector layers</li>
                    <li>Use <strong>Climate Data</strong> to register climate datasets</li>
                    <li>To import occurrence data, convert to CSV first</li>
                  </ul>
                </div>
                {fileInfo?.fileList && (
                  <div className="mt-2 text-left">
                    <p className="text-xs text-slate-500 mb-1">Files in archive:</p>
                    <div className="max-h-24 overflow-y-auto space-y-0.5">
                      {fileInfo.fileList.slice(0, 8).map((f, i) => (
                        <p key={i} className="text-xs text-slate-400 font-mono">{f}</p>
                      ))}
                      {fileInfo.fileList.length > 8 && <p className="text-xs text-slate-400">+{fileInfo.fileList.length - 8} more</p>}
                    </div>
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>Close</Button>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <div className="text-center">
                <p className="font-bold text-slate-700">Something went wrong</p>
                <p className="text-sm text-red-500 mt-1">{errorMsg}</p>
              </div>
              <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}