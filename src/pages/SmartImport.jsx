import React from 'react';
import { PackageOpen, Zap, Shield, Database } from 'lucide-react';
import UniversalFileUploader from '@/components/UniversalFileUploader';
import { useQueryClient } from '@tanstack/react-query';

export default function SmartImport() {
  const queryClient = useQueryClient();

  const handleImported = (entity, count) => {
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
              <h1 className="text-xl font-bold text-bangor-red">Universal File Import</h1>
              <p className="text-sm text-slate-600">AI-powered classification with Claude Opus 4.6 + automated compliance checks</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8">
          <UniversalFileUploader onImported={handleImported} />

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-purple-600" />
                <p className="text-xs font-bold text-purple-800">AI Classification</p>
              </div>
              <p className="text-xs text-purple-700">
                Claude Opus 4.6 analyzes file content to determine type, structure, and optimal entity destination
              </p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-800">Compliance Check</p>
              </div>
              <p className="text-xs text-emerald-700">
                Automated validation against IUCN, GBIF, Natural England, and BTO standards before import
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-bold text-blue-800">Smart Routing</p>
              </div>
              <p className="text-xs text-blue-700">
                Automatically routes data to correct entity with field mapping and transformation suggestions
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-2">
            <p className="font-semibold text-slate-700">Supported formats:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>CSV / JSON / GeoJSON</strong> — Species records, occurrence data, climate datasets</li>
              <li><strong>Excel (.xlsx)</strong> — Tabular biodiversity data (converted internally)</li>
              <li><strong>PDF</strong> — Research papers, reports (content extraction via AI)</li>
              <li><strong>ZIP archives</strong> — Automatically extracted and analyzed</li>
            </ul>
            <p className="text-xs text-slate-400 pt-1">
              Powered by Claude Opus 4.6 for high-accuracy classification • Full audit trail • GDPR compliant
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}