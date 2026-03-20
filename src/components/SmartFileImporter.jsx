import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Upload, CheckCircle2, FileArchive, Loader, File, MapPin, Table2, Code2 } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const getFileIcon = (dataType) => {
  const icons = {
    geospatial_raster: MapPin,
    geospatial_vector: MapPin,
    tabular_data: Table2,
    json_data: Code2,
    geojson_data: MapPin,
    spreadsheet: Table2,
    document_pdf: File,
    default: File
  };
  return icons[dataType] || icons.default;
};

export default function SmartFileImporter({ onFileAnalyzed, onClose }) {
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    await analyzeFile(files[0]);
  };

  const analyzeFile = async (file) => {
    setError(null);
    setAnalyzing(true);

    try {
      // Upload file first
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      if (!uploadRes.file_url) {
        throw new Error('Failed to upload file');
      }

      // Analyze
      const analysisRes = await base44.functions.invoke('smartAnalyzeFile', {
        file_url: uploadRes.file_url,
        file_name: file.name
      });

      if (analysisRes.data?.status !== 'success') {
        throw new Error(analysisRes.data?.error || 'Analysis failed');
      }

      setAnalysis(analysisRes.data.analysis);
      toast.success('File analyzed successfully');
      
      if (onFileAnalyzed) {
        onFileAnalyzed(analysisRes.data.analysis, uploadRes.file_url);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message);
      toast.error('Failed to analyze file: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const FileIcon = analysis ? getFileIcon(analysis.data_type) : Upload;

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {!analysis && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? 'border-bangor-red bg-bangor-red/5'
                  : 'border-slate-300 bg-slate-50 hover:border-bangor-red/50'
              }`}
            >
              <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-bangor-red' : 'text-slate-400'}`} />
              <p className="font-semibold text-slate-900 mb-1">Drop your file here</p>
              <p className="text-xs text-slate-600 mb-4">
                ZIP archives, TIFF, Shapefiles, CSV, JSON, or any other data file
              </p>
              <input
                type="file"
                onChange={(e) => e.target.files?.[0] && analyzeFile(e.target.files[0])}
                className="hidden"
                id="file-input"
              />
              <Button
                onClick={() => document.getElementById('file-input').click()}
                disabled={analyzing}
                variant="outline"
                className="mx-auto"
              >
                {analyzing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Browse Files'
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900">File Analyzed Successfully</p>
                    <p className="text-sm text-green-700 mt-1">{analysis.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileIcon className="w-4 h-4" />
                  File Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 font-medium">File Name</p>
                    <p className="text-slate-900 font-mono text-xs mt-1 truncate">{analysis.original_file}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Type</p>
                    <Badge className="mt-1 bg-bangor-red/10 text-bangor-red">
                      {analysis.data_type.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">File Size</p>
                    <p className="text-slate-900 mt-1">
                      {(analysis.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {analysis.is_zip && (
                    <div>
                      <p className="text-slate-600 font-medium">Files in Archive</p>
                      <p className="text-slate-900 mt-1">{analysis.total_files} files</p>
                    </div>
                  )}
                </div>

                {/* Contents */}
                {analysis.is_zip && analysis.contents.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Archive Contents</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {analysis.contents.slice(0, 10).map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <File className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-slate-600 truncate">{file.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs ml-2 shrink-0">
                            .{file.extension}
                          </Badge>
                        </div>
                      ))}
                      {analysis.contents.length > 10 && (
                        <p className="text-xs text-slate-500 p-2">
                          +{analysis.contents.length - 10} more files
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* File Types Found */}
                {analysis.file_types_found && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 mb-2">File Types</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(analysis.file_types_found).map(([ext, count]) => (
                        <Badge key={ext} variant="outline" className="text-xs">
                          .{ext} ({count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setAnalysis(null);
                  setError(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Analyze Another
              </Button>
              <Button onClick={onClose} className="flex-1 bg-bangor-red hover:bg-bangor-red/90">
                Done
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}