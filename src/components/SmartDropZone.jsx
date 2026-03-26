import React, { useState, useRef } from 'react';
import { useSearchSounds } from '@/hooks/useSearchSounds';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Database, Sparkles, Info, Globe, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import JSZip from 'jszip';

// File types that can be parsed into database records
// Note: xlsx/xls are binary and not parseable as text — users must convert to CSV first
const IMPORTABLE_EXTS = ['csv', 'json', 'txt', 'geojson'];
// File types that are geospatial/binary — inform user, store for later use
const GEOSPATIAL_EXTS = ['tif', 'tiff', 'asc', 'shp', 'dbf', 'prj', 'shx', 'kml', 'kmz'];
// File types that can be stored/archived
const ARCHIVABLE_EXTS = ['zip', 'tar', 'gz', 'rar', '7z'];

// Datasource-specific patterns
const DATASOURCE_PATTERNS = {
  inat: /inat|naturalist/i,
  gbif: /gbif|occurrence/i,
  specieslink: /specieslink|museum|herbarium/i,
  iucn: /iucn|redlist|assessment/i
};

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

export default function SmartDropZone({ onImported, targetSpecies = null }) {
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('idle'); // idle | analysing | confirm | importing | done | error | bulk_mammals
  const [fileInfo, setFileInfo] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [importCount, setImportCount] = useState(0);
  const [fileUrl, setFileUrl] = useState(null);
  const [fileUri, setFileUri] = useState(null); // private storage URI
  const [archiveName, setArchiveName] = useState('');
  const [archiveDesc, setArchiveDesc] = useState('');
  const [genusFilter, setGenusFilter] = useState('Callithrix');
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
    setFileUrl(null);
    setFileUri(null);
    setArchiveName('');
    setArchiveDesc('');
    setGenusFilter('Callithrix');
  };

  const detectDatasource = (fileName) => {
    for (const [source, pattern] of Object.entries(DATASOURCE_PATTERNS)) {
      if (pattern.test(fileName)) return source;
    }
    return null;
  };

  const handleFile = async (file) => {
    if (!file) return;
    setOpen(true);
    setStep('analysing');
    const datasource = detectDatasource(file.name);
    setFileInfo({ name: file.name, size: file.size, type: file.type, datasource });
    startTicking(4000);

    try {
      let fileToProcess = file;
      let extractedFrom = null;
      // Use local variable — don't rely on fileInfo state which hasn't updated yet
      const fileDatasource = datasource;

      // If ZIP file, unzip and get first supported extractable file
      if (file.name.endsWith('.zip') || file.type === 'application/zip') {
        const zip = new JSZip();
        await zip.loadAsync(file);
        
        const files = Object.values(zip.files).filter(f => !f.dir && !f.name.startsWith('__MACOSX/'));
        if (files.length === 0) throw new Error('ZIP file is empty or contains no valid files');
        
        // Check for Shapefile FIRST — before any CSV/importable file check
        // IUCN ZIPs often contain both a .shp/.dbf AND a summary CSV — we must prefer the shapefile pipeline
        const hasShp = files.some(f => getFileExt(f.name) === 'shp');
        const hasDbf = files.some(f => getFileExt(f.name) === 'dbf');

        if (hasShp && hasDbf) {
          // Detect IUCN bulk Terrestrial Mammals download (large file, 100MB+)
          // These need special handling: save to private storage, then extract target species only
          const isBulkMammals = file.size > 50 * 1024 * 1024 || // >50MB suggests bulk
            /MAMMALS_TERRESTRIAL|terrestrial_mammals|TERRESTRIAL_MAMMALS/i.test(file.name);

          if (isBulkMammals) {
            // Save to private backend storage (so we can re-use without re-uploading)
            setFileInfo({ name: file.name, size: file.size, type: file.type, isBulkMammals: true, fileList: files.map(f => f.name) });
            stopTicking();
            setStep('bulk_mammals_saving');

            try {
              const saved = await base44.integrations.Core.UploadPrivateFile({ file });
              const file_uri = saved.file_uri;
              setFileUri(file_uri);

              // Add to shared library so all users can reuse
              try {
                const user = await base44.auth.me();
                await base44.entities.IUCNBulkLibrary.create({
                  label: file.name.replace(/\.zip$/i, ''),
                  taxon_group: /marine|fish|shark|ray/i.test(file.name) ? 'Marine' : 'Terrestrial Mammals',
                  file_uri,
                  file_size_mb: Math.round(file.size / 1024 / 1024 * 10) / 10,
                  uploaded_by_email: user?.email || '',
                  uploaded_by_name: user?.full_name || '',
                });
              } catch (libErr) {
                console.warn('Could not add to shared library:', libErr.message);
              }

              setStep('bulk_mammals');
            } catch (e) {
              setErrorMsg(`Failed to save file to backend: ${e.message}`);
              setStep('error');
            }
            return;
          }

          // Standard (small) shapefile — upload publicly then call processShapefileData
          const uploadedFile = await base44.integrations.Core.UploadFile({ file });
          setFileUrl(uploadedFile.file_url);
          setFileInfo({ name: file.name, size: file.size, type: file.type, isShapefile: true, fileList: files.map(f => f.name) });
          stopTicking();
          setStep('shapefile');
          return;
        }

        // Prioritize importable file formats (prefer csv/json over txt); if none found, check if it's all geospatial
        const importableFile = 
          files.find(f => ['csv', 'json', 'geojson'].includes(getFileExt(f.name))) ||
          files.find(f => IMPORTABLE_EXTS.includes(getFileExt(f.name)));
        const geospatialFiles = files.filter(f => GEOSPATIAL_EXTS.includes(getFileExt(f.name)));

        if (!importableFile && geospatialFiles.length > 0) {
            // Other geospatial/raster data — upload and inform user
            const uploadedFile = await base44.integrations.Core.UploadFile({ file });
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
            setFileUrl(uploadedFile.file_url);
            setArchiveName(nameWithoutExt);
            setArchiveDesc(`Geospatial reference file for spatial analysis. Files: ${files.filter(f => !f.dir).length} items`);
            setFileInfo({ name: file.name, size: file.size, type: file.type, isGeospatialArchive: true, fileList: files.map(f => f.name) });
            stopTicking();
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
        // Excel files are binary — backend cannot parse them, give clear guidance
        if (ext === 'xlsx' || ext === 'xls') {
          throw new Error('Excel files (.xlsx/.xls) are not yet supported. Please open the file in Excel and save as CSV (File → Save As → CSV UTF-8), then re-upload.');
        }
        if (GEOSPATIAL_EXTS.includes(ext)) {
          const uploadedFile = await base44.integrations.Core.UploadFile({ file });
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          setFileUrl(uploadedFile.file_url);
          setArchiveName(nameWithoutExt);
          setArchiveDesc(`Geospatial reference file: ${file.name}`);
          setFileInfo({ name: file.name, size: file.size, type: file.type, isGeospatial: true });
          stopTicking();
          setStep('geospatial');
          return;
        }
      }

      // Upload file to get a URL
      const uploadedFile = await base44.integrations.Core.UploadFile({ file: fileToProcess });
      const originalName = fileToProcess.name;

      // Guess entity from filename/datasource for initial suggestion
      let guessedEntity = 'Species';
      // fileDatasource is reliable here (local var); fileInfo?.datasource would be stale state
      if (fileDatasource === 'inat' || fileDatasource === 'gbif' || fileDatasource === 'specieslink' || fileDatasource === 'iucn') guessedEntity = 'Species';

      // Use our own backend function to parse — avoids ExtractDataFromUploadedFile hashed-filename issue
      let parseResult;
      try {
        parseResult = await base44.functions.invoke('parseAndImportFile', {
          file_url: uploadedFile.file_url,
          original_name: originalName,
          suggested_entity: guessedEntity,
        });
      } catch (invokeErr) {
        // Axios throws for non-2xx responses — extract the error message from response body if available
        const serverMsg = invokeErr?.response?.data?.error || invokeErr?.response?.data?.message;
        throw new Error(serverMsg || invokeErr.message || 'Import service error (code 500)');
      }

      if (parseResult.data?.error) throw new Error(parseResult.data.error);

      const rows = parseResult.data?.records || [];
      const detectedCols = parseResult.data?.detected_columns || [];

      // Build a lightweight aiResult for the UI
      const aiResult = {
        suggested_entity: guessedEntity,
        confidence: 0.9,
        reasoning: `Parsed ${parseResult.data?.total_raw || 0} raw rows → ${rows.length} mapped records. Detected columns: ${detectedCols.slice(0, 6).join(', ')}${detectedCols.length > 6 ? '…' : ''}`,
        detected_fields: detectedCols,
      };

      setParsedRows(rows);
      setAiResult(aiResult);
      setSelectedEntity(guessedEntity);
      setFileUrl(uploadedFile.file_url);
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
      const created = await entity.bulkCreate(parsedRows);

      // Log the import so it can be reverted later
      try {
        const user = await base44.auth.me();
        const recordIds = Array.isArray(created) ? created.map(r => r.id).filter(Boolean) : [];
        await base44.entities.ImportLog.create({
          user_email: user?.email || '',
          user_name: user?.full_name || '',
          entity_type: selectedEntity,
          file_name: fileInfo?.name || '',
          record_count: parsedRows.length,
          record_ids: recordIds,
          status: 'completed',
        });
      } catch (logErr) {
        // Log failure is non-fatal — import already succeeded
        console.warn('Failed to write import log:', logErr.message);
      }

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

  const handleShapefileImport = async () => {
    if (!fileUrl) return;
    setStep('importing');
    startTicking(8000);
    try {
      const result = await base44.functions.invoke('processShapefileData', {
        file_url: fileUrl,
        file_name: fileInfo?.name || 'shapefile.zip'
      });
      if (result.data?.error) throw new Error(result.data.error);
      stopTicking();
      playSuccess();
      setImportCount(result.data?.species_count || 0);
      setStep('done');
      // Use species_count for the done message
      setAiResult({ shapefile: true, message: result.data?.message, species: result.data?.species });
      onImported && onImported('IUCNRangeData', result.data?.species_count || 0);
    } catch (e) {
      stopTicking();
      playError();
      const serverMsg = e?.response?.data?.error || e.message || 'Shapefile import failed';
      setErrorMsg(serverMsg);
      setStep('error');
    }
  };

  const handleArchiveGeospatial = async () => {
    if (!archiveName.trim() || !fileUrl) return;
    setStep('importing');
    startTicking(3000);
    try {
      await base44.entities.ExportedFile.create({
        name: archiveName,
        description: archiveDesc || `Geospatial file: ${fileInfo?.name}`,
        file_uri: fileUrl,
        file_type: fileInfo?.name?.split('.').pop()?.toUpperCase() || 'FILE',
        species_count: 1,
        status: 'ready'
      });
      stopTicking();
      playSuccess();
      setStep('done');
      onImported && onImported('ExportedFile', 1);
    } catch (e) {
      stopTicking();
      playError();
      setErrorMsg(e.message || 'Failed to archive file');
      setStep('error');
    }
  };

  const handleBulkMammalsExtract = async () => {
    if (!fileUri) return;
    setStep('importing');
    startTicking(30000);
    try {
      const payload = { file_uri: fileUri };
      if (targetSpecies && targetSpecies.length > 0) {
        payload.target_species = targetSpecies;
      } else if (genusFilter.trim()) {
        payload.genus_filter = genusFilter.trim();
      }

      const result = await base44.functions.invoke('extractIUCNBulkSpecies', payload);
      if (result.data?.error) throw new Error(result.data.error);

      stopTicking();
      playSuccess();
      setImportCount(result.data?.species_count || 0);
      setAiResult({ shapefile: true, message: result.data?.message, species: result.data?.species });
      setStep('done');
      onImported && onImported('IUCNRangeData', result.data?.species_count || 0);
    } catch (e) {
      stopTicking();
      playError();
      const serverMsg = e?.response?.data?.error || e.message || 'Extraction failed';
      setErrorMsg(serverMsg);
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
           accept=".csv,.xlsx,.xls,.json,.txt,.zip,.tif,.tiff,.asc,.shp,.dbf,.prj,.shx,.geojson,.kml,.kmz,.tar,.gz,.rar,.7z"
           onChange={(e) => handleFile(e.target.files[0])} />
        <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors ${dragging ? 'text-bangor-red' : 'text-slate-400'}`} />
        <p className="text-sm font-semibold text-slate-600">
           {dragging ? 'Release to smart analyse & import' : 'Drag & drop any file to smart import'}
         </p>
         <p className="text-xs text-slate-400 mt-1">Supported: CSV · Excel · JSON · GeoJSON · Shapefile · KML · GeoTIFF · ZIP · All formats</p>
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
                <p className="font-semibold text-slate-700">Smart analysing your file…</p>
                <p className="text-sm text-slate-500 mt-1">{fileInfo?.extractedFrom || fileInfo?.name}</p>
                {fileInfo?.extractedFrom && (
                  <p className="text-xs text-emerald-600 mt-1">📦 Extracted from archive: {fileInfo.name}</p>
                )}
                {fileInfo?.datasource && (
                  <p className="text-xs text-blue-600 mt-1">📊 Detected source: {fileInfo.datasource.toUpperCase()}</p>
                )}
                <p className="text-xs text-slate-400 mt-2">Identifying data structure, content type, and optimal destination…</p>
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
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-800">AI Analysis Result</p>
                    <p className="text-xs text-emerald-700 mt-0.5">{aiResult.reasoning}</p>
                    {aiResult.detected_fields?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {aiResult.detected_fields.slice(0, 8).map(f => (
                          <span key={f} className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{f}</span>
                        ))}
                        {aiResult.detected_fields.length > 8 && <span className="text-[10px] text-emerald-600">+{aiResult.detected_fields.length - 8} more</span>}
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
                {aiResult?.shapefile ? (
                  <>
                    <p className="text-sm text-slate-500 mt-1">{aiResult.message || `${importCount} species range${importCount !== 1 ? 's' : ''} imported`}</p>
                    {aiResult.species?.length > 0 && (
                      <div className="mt-3 text-left bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto w-full">
                        {aiResult.species.map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-xs py-0.5">
                            <span className="italic text-slate-700">{s.scientific_name}</span>
                            <span className={`px-1.5 py-0.5 rounded font-semibold ${s.action === 'created' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{s.action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500 mt-1">{importCount} records added to <strong>{selectedEntity}</strong></p>
                )}
              </div>
              <Button className="bg-bangor-red hover:bg-bangor-red/90 text-white" onClick={() => { reset(); setOpen(false); }}>
                Done
              </Button>
            </div>
          )}

          {/* Shapefile — IUCN range import */}
          {step === 'shapefile' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-900">IUCN Shapefile Detected</p>
                    <p className="text-sm text-emerald-700 mt-1">DataWinder found <strong>.shp + .dbf</strong> files — this is an IUCN species range archive.</p>
                    <p className="text-xs text-emerald-600 mt-2">Importing will: parse species attributes from the DBF, convert polygons to GeoJSON, and store range data linked to Species records.</p>
                  </div>
                </div>
              </div>

              {fileInfo?.fileList && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Files detected ({fileInfo.fileList.length}):</p>
                  <div className="max-h-24 overflow-y-auto space-y-0.5">
                    {fileInfo.fileList.map((f, i) => (
                      <p key={i} className="text-xs text-slate-500 font-mono">{f}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                ⏳ Processing may take 10–30 seconds depending on the number of range polygons.
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { reset(); setOpen(false); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleShapefileImport}
                >
                  Import IUCN Range Data
                </Button>
              </div>
            </div>
          )}

          {/* Geospatial / raster file — archive option */}
          {step === 'geospatial' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-900">Geospatial File Detected</p>
                    <p className="text-sm text-blue-700 mt-1"><strong>{fileInfo?.name}</strong> is a reference file (GeoTIFF, Shapefile, KML, etc.)</p>
                    <p className="text-xs text-blue-600 mt-2">You can store it for later use in spatial analysis, or discard it.</p>
                  </div>
                </div>
              </div>

              {/* Archive Option */}
              <div className="space-y-3 border-t pt-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Archive this file?</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 'Coral Range Map 2024'" 
                    value={archiveName} 
                    onChange={(e) => setArchiveName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-bangor-red focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1.5 block">Description (optional)</label>
                  <textarea 
                    placeholder="What is this file for? (e.g. species range boundary, climate baseline)" 
                    value={archiveDesc} 
                    onChange={(e) => setArchiveDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-bangor-red focus:border-transparent resize-none h-20"
                  />
                </div>
              </div>

              {fileInfo?.fileList && (
                <div className="text-left bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Files in archive ({fileInfo.fileList.length}):</p>
                  <div className="max-h-20 overflow-y-auto space-y-0.5">
                    {fileInfo.fileList.slice(0, 5).map((f, i) => (
                      <p key={i} className="text-xs text-slate-500 font-mono">{f}</p>
                    ))}
                    {fileInfo.fileList.length > 5 && <p className="text-xs text-slate-400">+{fileInfo.fileList.length - 5} more</p>}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { reset(); setOpen(false); }}>
                  Don't Archive
                </Button>
                <Button
                  className="flex-1 bg-bangor-red hover:bg-bangor-red/90 text-white"
                  disabled={!archiveName.trim()}
                  onClick={handleArchiveGeospatial}
                >
                  Save & Archive
                </Button>
              </div>
            </div>
          )}

          {/* Bulk Mammals — saving to backend */}
          {step === 'bulk_mammals_saving' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-slate-700">Saving to backend storage…</p>
                <p className="text-sm text-slate-500 mt-1">{fileInfo?.name}</p>
                <p className="text-xs text-slate-400 mt-2">Large file detected — uploading to secure backend so you can extract species multiple times without re-uploading.</p>
              </div>
            </div>
          )}

          {/* Bulk Mammals — ready to extract */}
          {step === 'bulk_mammals' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-900">IUCN Bulk Mammals Shapefile Saved ✓</p>
                    <p className="text-sm text-blue-700 mt-1">
                      <strong>{fileInfo?.name}</strong> ({(fileInfo?.size / 1024 / 1024).toFixed(0)} MB) has been saved to secure backend storage.
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Now choose which species to extract. Only matching polygons will be processed and saved as individual range records.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-sm font-semibold text-slate-700">Extract by genus</span>
                  </div>
                  <input
                    type="text"
                    value={genusFilter}
                    onChange={e => setGenusFilter(e.target.value)}
                    placeholder="e.g. Callithrix"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Extracts all species whose name starts with this prefix. Leave blank to extract everything (slow for all mammals).
                  </p>
                </div>

                {targetSpecies && targetSpecies.length > 0 && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                    <p className="font-semibold mb-1">✓ Will also match {targetSpecies.length} specific species from your checklist:</p>
                    <p className="text-emerald-700 italic">{targetSpecies.slice(0, 5).join(', ')}{targetSpecies.length > 5 ? `… +${targetSpecies.length - 5} more` : ''}</p>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                ⏳ Extraction may take 30–90 seconds — the function must read and parse the full shapefile before filtering.
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { reset(); setOpen(false); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!genusFilter.trim() && (!targetSpecies || targetSpecies.length === 0)}
                  onClick={handleBulkMammalsExtract}
                >
                  Extract {genusFilter.trim() || 'Target'} Species →
                </Button>
              </div>
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