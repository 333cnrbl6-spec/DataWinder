import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileSpreadsheet, 
  FileArchive, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  Database,
  FileText,
  MapPin,
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SpeciesIngestionModule({ onImportComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [autoValidate, setAutoValidate] = useState(true);
  const [projectId, setProjectId] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validTypes = ['text/csv', 'application/zip', 'application/x-zip-compressed'];
      const validExtensions = ['csv', 'zip'];
      const extension = droppedFile.name.split('.').pop().toLowerCase();
      
      if (validTypes.includes(droppedFile.type) || validExtensions.includes(extension)) {
        setFile(droppedFile);
      } else {
        toast.error('Please upload a CSV or ZIP file');
      }
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    setProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('autoValidate', autoValidate.toString());
      if (projectId) {
        formData.append('projectId', projectId);
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await base44.functions.invoke('ingestSpeciesObservations', {
        file: file,
        autoValidate,
        projectId
      });

      clearInterval(progressInterval);
      setProgress(100);
      setResult(response.data);

      toast.success(`Imported ${response.data.summary.created_species} species`);
      
      if (onImportComplete) {
        onImportComplete(response.data);
      }
    } catch (error) {
      toast.error(`Import failed: ${error.message}`);
      setResult({ error: error.message });
    } finally {
      setUploading(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    setProjectId('');
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-12 h-12 text-slate-400" />;
    if (file.name.endsWith('.zip')) return <FileArchive className="w-12 h-12 text-blue-600" />;
    return <FileSpreadsheet className="w-12 h-12 text-green-600" />;
  };

  const getFileType = () => {
    if (!file) return 'No file selected';
    if (file.name.endsWith('.zip')) return 'Darwin Core Archive';
    return 'CSV File';
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Species Data Ingestion
        </CardTitle>
        <CardDescription>
          Upload CSV or Darwin Core Archive files to automatically import species observations
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!result && !uploading && (
          <>
            {/* File Upload Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv,.zip"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  {getFileIcon()}
                  <div>
                    <p className="text-lg font-semibold text-slate-700">
                      {file ? file.name : 'Drag & drop your file here'}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {file ? getFileType() : 'or click to browse (CSV or ZIP)'}
                    </p>
                  </div>
                  {file && (
                    <Badge variant="outline" className="mt-2">
                      {(file.size / 1024).toFixed(1)} KB
                    </Badge>
                  )}
                </div>
              </label>
            </div>

            {/* Import Options */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Import Options</Label>
              
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <Checkbox
                  checked={autoValidate}
                  onCheckedChange={setAutoValidate}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium">Auto-validate Data</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Automatically check for duplicates, validate coordinates, and assess data quality
                  </p>
                </div>
              </label>

              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Project ID (Optional)
                </Label>
                <Input
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="e.g., PRIMATE-2026, CONSERVATION-001"
                  className="max-w-md"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Tag imported records with a project identifier for organization
                </p>
              </div>
            </div>

            {/* Supported Formats Info */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    CSV Format
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 space-y-1">
                  <p>• Scientific name (required)</p>
                  <p>• Common name</p>
                  <p>• Latitude/Longitude</p>
                  <p>• Event date</p>
                  <p>• Country, locality</p>
                  <p>• Collector/observer</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileArchive className="w-4 h-4 text-blue-600" />
                    Darwin Core Archive
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 space-y-1">
                  <p>• Standard DwC-A format</p>
                  <p>• ZIP with CSV + metadata</p>
                  <p>• Auto-maps Darwin Core terms</p>
                  <p>• Preserves all metadata</p>
                  <p>• Supports extensions</p>
                </CardContent>
              </Card>
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!file}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <Upload className="w-5 h-5 mr-2" />
              {file ? `Import ${file.name}` : 'Select a File to Import'}
            </Button>
          </>
        )}

        {/* Uploading State */}
        {uploading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <h3 className="text-lg font-semibold text-slate-700">
              Processing Import...
            </h3>
            <p className="text-slate-500 text-center max-w-md">
              Parsing {file?.name} and validating species observations
            </p>
            <div className="w-full max-w-xs space-y-2">
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-slate-500 text-center">
                {progress < 30 && 'Reading file...'}
                {progress >= 30 && progress < 60 && 'Parsing data...'}
                {progress >= 60 && progress < 90 && 'Validating records...'}
                {progress >= 90 && 'Creating species records...'}
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !uploading && (
          <div className="space-y-6">
            {result.error ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Database className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {result.summary.total_records}
                          </p>
                          <p className="text-xs text-slate-500">Total Records</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        <div>
                          <p className="text-2xl font-bold text-emerald-600">
                            {result.summary.created_species}
                          </p>
                          <p className="text-xs text-slate-500">Species Created</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-yellow-600" />
                        <div>
                          <p className="text-2xl font-bold text-yellow-600">
                            {result.summary.validation_warnings}
                          </p>
                          <p className="text-xs text-slate-500">Warnings</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-8 h-8 text-red-600" />
                        <div>
                          <p className="text-2xl font-bold text-red-600">
                            {result.summary.errors}
                          </p>
                          <p className="text-xs text-slate-500">Errors</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Metadata */}
                {result.metadata && Object.keys(result.metadata).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        File Metadata
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {result.metadata.extracted && (
                        <>
                          {result.metadata.extracted.title && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Title:</span>
                              <span className="font-medium">{result.metadata.extracted.title}</span>
                            </div>
                          )}
                          {result.metadata.extracted.creator && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Creator:</span>
                              <span className="font-medium">{result.metadata.extracted.creator}</span>
                            </div>
                          )}
                          {result.metadata.extracted.pubDate && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Date:</span>
                              <span className="font-medium">{result.metadata.extracted.pubDate}</span>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Created Species Preview */}
                {result.created_species && result.created_species.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        Created Species (First {result.created_species.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {result.created_species.map((species, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50">
                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                {species.scientific_name}
                              </p>
                              {species.common_name && (
                                <p className="text-xs text-slate-500">{species.common_name}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Created
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Errors */}
                {result.errors && result.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        Import Errors ({result.errors.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {result.errors.map((error, idx) => (
                          <div key={idx} className="p-2 rounded bg-red-50 border border-red-200">
                            <p className="text-sm font-medium text-red-700">{error.observation}</p>
                            <p className="text-xs text-red-600">{error.error}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={resetImport}
                    variant="outline"
                    className="flex-1"
                  >
                    Import Another File
                  </Button>
                  {onImportComplete && (
                    <Button
                      onClick={() => onImportComplete(result)}
                      className="flex-1 bg-blue-600 text-white"
                    >
                      View Imported Data
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}