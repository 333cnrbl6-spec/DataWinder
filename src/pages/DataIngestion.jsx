import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import SpeciesIngestionModule from '@/components/ingestion/SpeciesIngestionModule';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, FileSpreadsheet, FileArchive, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function DataIngestion() {
  const queryClient = useQueryClient();
  const [lastImport, setLastImport] = useState(null);

  const handleImportComplete = (result) => {
    setLastImport(result);
    
    // Invalidate species queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['species'] });
    
    toast.success('Data import completed successfully');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Data Ingestion
          </h1>
          <p className="text-slate-600">
            Import species observations from CSV or Darwin Core Archive files
          </p>
        </div>
        <Badge variant="outline" className="bg-blue-100 text-blue-800">
          <Database className="w-3 h-3 mr-1" />
          Automated Import
        </Badge>
      </div>

      {/* Main Ingestion Module */}
      <SpeciesIngestionModule onImportComplete={handleImportComplete} />

      {/* Information Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              CSV Format Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p><strong>Required Fields:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>scientificName (or scientific_name, species)</li>
            </ul>
            
            <p className="mt-3"><strong>Recommended Fields:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>decimalLatitude, decimalLongitude</li>
              <li>eventDate (or date, observationDate)</li>
              <li>country, locality</li>
              <li>commonName</li>
              <li>recordedBy (collector/observer)</li>
            </ul>

            <p className="mt-3"><strong>Supported Column Names:</strong></p>
            <p className="text-xs text-slate-500">
              The system automatically maps common variations like "scientific_name", "species", 
              "taxon" to the Darwin Core term "scientificName".
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileArchive className="w-4 h-4 text-blue-600" />
              Darwin Core Archive
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p><strong>What is DwC-A?</strong></p>
            <p className="text-xs">
              Darwin Core Archive is a standard format for sharing biodiversity data. 
              It's a ZIP file containing CSV data files and metadata (EML or meta.xml).
            </p>

            <p className="mt-3"><strong>What Gets Imported:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li>Occurrence data (species observations)</li>
              <li>Taxonomic information</li>
              <li>Geographic data</li>
              <li>Event details (dates, collectors)</li>
              <li>Metadata and citations</li>
            </ul>

            <p className="mt-3"><strong>Auto-Mapping:</strong></p>
            <p className="text-xs">
              All Darwin Core terms are automatically recognized and mapped to the 
              appropriate fields in the database.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Validation Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Automatic Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold text-slate-700 mb-2">Data Quality Checks</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Coordinate validation (-90 to 90, -180 to 180)</li>
                <li>• Date format verification</li>
                <li>• Required field checking</li>
                <li>• Duplicate detection</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-slate-700 mb-2">Taxonomic Validation</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Scientific name format</li>
                <li>• Existing species check</li>
                <li>• Taxonomic hierarchy</li>
                <li>• Synonym detection (LLM-powered)</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-slate-700 mb-2">Geographic Validation</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Country code verification</li>
                <li>• Coordinate-country match</li>
                <li>• Range violation detection</li>
                <li>• Habitat compatibility</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Import Summary */}
      {lastImport && !lastImport.error && (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Last Import Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-emerald-700">Total Records</p>
                <p className="text-2xl font-bold text-emerald-900">{lastImport.summary.total_records}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-700">Species Created</p>
                <p className="text-2xl font-bold text-emerald-900">{lastImport.summary.created_species}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-700">Validation Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">{lastImport.summary.validation_warnings}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-700">Errors</p>
                <p className="text-2xl font-bold text-red-600">{lastImport.summary.errors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Need Help?</p>
          <p>
            For detailed documentation on supported formats, validation rules, and troubleshooting, 
            refer to the <strong>Data Ingestion Guide</strong> or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}