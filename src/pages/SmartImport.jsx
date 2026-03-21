import React from 'react';
import { PackageOpen } from 'lucide-react';
import SmartDropZone from '@/components/SmartDropZone';
import { useQueryClient } from '@tanstack/react-query';

export default function SmartImport() {
  const queryClient = useQueryClient();

  const handleImported = () => {
    queryClient.invalidateQueries({ queryKey: ['allSpecies'] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <header className="bg-white border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bangor-red/10 rounded-xl">
              <PackageOpen className="w-6 h-6 text-bangor-red" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-bangor-red">Smart Import</h1>
              <p className="text-sm text-slate-600">Drag & drop any data file — DataWinder will identify and import it automatically</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8">
          <SmartDropZone onImported={handleImported} />

          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-2">
            <p className="font-semibold text-slate-700">Supported formats:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>CSV / Excel / JSON</strong> — species records, climate datasets, occurrence data</li>
              <li><strong>ZIP archives</strong> — automatically extracted and analysed</li>
              <li><strong>Geospatial files</strong> (GeoTIFF, Shapefile, KML) — detected and redirected to appropriate tools</li>
            </ul>
            <p className="text-xs text-slate-400 pt-1">DataWinder uses AI to identify the content and suggest the correct database table.</p>
          </div>
        </div>
      </main>
    </div>
  );
}