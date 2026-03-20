import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Table2, Code2, FileArchive } from 'lucide-react';
import SmartFileImporter from '@/components/SmartFileImporter';
import { motion } from 'framer-motion';

export default function SmartDataImport() {
  const [step, setStep] = useState('intro'); // intro, import, results
  const [analyzedFile, setAnalyzedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);

  const handleFileAnalyzed = (analysis, url) => {
    setAnalyzedFile(analysis);
    setFileUrl(url);
    setStep('results');
  };

  const getWorkflowRoute = (dataType) => {
    const routes = {
      geospatial_raster: { page: 'ArcGISTools', label: 'Spatial Analysis Tool' },
      geospatial_vector: { page: 'ArcGISTools', label: 'Spatial Analysis Tool' },
      tabular_data: { page: 'DataPreparation', label: 'Data Preparation' },
      json_data: { page: 'DataManagement', label: 'Data Management' },
      geojson_data: { page: 'ArcGISTools', label: 'Spatial Analysis Tool' },
      spreadsheet: { page: 'DataPreparation', label: 'Data Preparation' },
      unknown: null
    };
    return routes[dataType];
  };

  const workflowRoute = analyzedFile ? getWorkflowRoute(analyzedFile.data_type) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-bangor-sun/8 to-bangor-red/3">
      <header className="bg-white border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-bangor-red">Smart Data Import</h1>
          <p className="text-sm text-slate-600 mt-1">Universal file analyzer — unzip, examine, route automatically</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'intro' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Capabilities */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">What This Does</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: FileArchive, title: 'Auto-Unzip', desc: 'Automatically extracts ZIP archives' },
                  { icon: MapPin, title: 'Examine', desc: 'Inspects all file types and contents' },
                  { icon: Code2, title: 'Detect', desc: 'Identifies data type automatically' },
                  { icon: ArrowRight, title: 'Route', desc: 'Guides you to the right workflow' }
                ].map((item, i) => (
                  <Card key={i} className="border-slate-200">
                    <CardContent className="pt-6">
                      <item.icon className="w-8 h-8 text-bangor-red mb-3" />
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-600 mt-1">{item.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Start */}
            <Button
              onClick={() => setStep('import')}
              className="w-full bg-bangor-red hover:bg-bangor-red/90 py-6 text-base"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload and Analyze File
            </Button>
          </motion.div>
        )}

        {step === 'import' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <SmartFileImporter
              onFileAnalyzed={handleFileAnalyzed}
              onClose={() => setStep('intro')}
            />
          </motion.div>
        )}

        {step === 'results' && analyzedFile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Success Message */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-bold">✓</span>
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">Ready to Import</p>
                    <p className="text-sm text-green-700 mt-1">
                      Your {analyzedFile.data_type.replace(/_/g, ' ')} file is ready for processing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{analyzedFile.original_file}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 font-medium">Size</p>
                    <p className="text-slate-900 mt-1 font-semibold">
                      {(analyzedFile.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Type</p>
                    <p className="text-slate-900 mt-1 font-semibold uppercase text-xs">
                      {analyzedFile.data_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  {analyzedFile.total_files && (
                    <div>
                      <p className="text-slate-600 font-medium">Files</p>
                      <p className="text-slate-900 mt-1 font-semibold">{analyzedFile.total_files}</p>
                    </div>
                  )}
                  {analyzedFile.file_types_found && (
                    <div>
                      <p className="text-slate-600 font-medium">Formats</p>
                      <p className="text-slate-900 mt-1 font-semibold">
                        {Object.keys(analyzedFile.file_types_found).length} types
                      </p>
                    </div>
                  )}
                </div>

                {/* File Types */}
                {analyzedFile.file_types_found && (
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Contains</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(analyzedFile.file_types_found).map(ext => (
                        <span key={ext} className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-700">
                          .{ext}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Steps */}
            {workflowRoute && (
              <Card className="border-bangor-red/30 bg-bangor-red/5">
                <CardHeader>
                  <CardTitle className="text-base">Recommended Next Step</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-700">
                    Based on the file type, we recommend processing this in:
                  </p>
                  <Button
                    onClick={() => window.location.href = `/${workflowRoute.page}`}
                    className="w-full bg-bangor-red hover:bg-bangor-red/90 py-6 text-base"
                  >
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Go to {workflowRoute.label}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setStep('intro');
                  setAnalyzedFile(null);
                  setFileUrl(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep('import')}
                variant="outline"
                className="flex-1"
              >
                Import Another
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}