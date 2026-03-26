import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, CheckCircle2, XCircle, Loader2, Info, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Fetches IUCN files (assessment PDF + range map JPG) for species that have an
 * assessment_id but are missing range GeoJSON. The actual range polygon SHP/GeoJSON
 * cannot be fetched programmatically — it requires a bulk IUCN account download.
 * This component fetches what IS accessible: PDFs and map images.
 */
export default function IUCNRangeFetcher({ species = [], onComplete }) {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [currentSpecies, setCurrentSpecies] = useState(null);

  // Species that have an assessment_id but no range GeoJSON — candidates for fetching
  const candidates = species.filter(sp => sp.assessment_id && !sp.range_data_geojson);
  // Species with assessment_id AND range data — already done
  const complete = species.filter(sp => sp.range_data_geojson);
  // Species with no assessment_id — cannot fetch anything
  const noAssessment = species.filter(sp => !sp.assessment_id && !sp.range_data_geojson);

  const fetchForSpecies = async (sp) => {
    setCurrentSpecies(sp.scientific_name);
    try {
      const res = await base44.functions.invoke('downloadIUCNFiles', {
        scientific_name: sp.scientific_name,
        assessment_id: sp.assessment_id,
        range_map_jpg_url: sp.range_map_jpg_url || null,
        range_data_shp_url: sp.range_data_shp_url || null,
        range_data_csv_url: sp.range_data_csv_url || null,
      });

      const data = res.data;
      const filesGot = [];
      if (data.assessment_pdf_file_uri) filesGot.push('PDF');
      if (data.range_map_jpg_file_uri) filesGot.push('Map JPG');
      if (data.range_shp_file_uri) filesGot.push('SHP');
      if (data.range_csv_file_uri) filesGot.push('CSV');

      // Batch fetch both records at once (avoid N+1)
      const [rangeRecords, assessmentRecords] = await Promise.all([
        base44.entities.IUCNRangeData.filter({ species_id: sp.id }),
        base44.entities.IUCNAssessment.filter({ species_id: sp.id })
      ]);

      // Update IUCNRangeData if exists
      if (rangeRecords.length > 0) {
        const updates = {};
        if (data.range_map_jpg_file_uri) updates.range_map_jpg_file_uri = data.range_map_jpg_file_uri;
        if (data.range_shp_file_uri) updates.range_shp_file_uri = data.range_shp_file_uri;
        if (data.range_csv_file_uri) updates.range_csv_file_uri = data.range_csv_file_uri;
        if (Object.keys(updates).length > 0) {
          await base44.entities.IUCNRangeData.update(rangeRecords[0].id, updates);
        }
      }

      // Update IUCNAssessment if exists and has PDF
      if (assessmentRecords.length > 0 && data.assessment_pdf_file_uri) {
        await base44.entities.IUCNAssessment.update(assessmentRecords[0].id, {
          assessment_pdf_file_uri: data.assessment_pdf_file_uri
        });
      }

      setResults(prev => ({
        ...prev,
        [sp.id]: {
          status: filesGot.length > 0 ? 'success' : 'nothing',
          files: filesGot,
          logs: data.logs || [],
          note: filesGot.length === 0
            ? 'No files accessible — range SHP requires IUCN bulk download account'
            : null
        }
      }));

      if (filesGot.length > 0) {
        toast.success(`${sp.scientific_name}: fetched ${filesGot.join(', ')}`);
      }
    } catch (err) {
      setResults(prev => ({
        ...prev,
        [sp.id]: { status: 'error', error: err.message }
      }));
    }
  };

  const runAll = async () => {
     setRunning(true);
     setResults({});
     // Batch in groups of 3 to avoid overwhelming backend
     for (let i = 0; i < candidates.length; i += 3) {
       await Promise.all(candidates.slice(i, i + 3).map(fetchForSpecies));
     }
     setCurrentSpecies(null);
     setRunning(false);
     onComplete?.();
   };

  if (candidates.length === 0 && complete.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
      <CardHeader className="border-b border-blue-100 pb-3">
        <CardTitle className="text-blue-700 text-base flex items-center gap-2">
          <Download className="w-4 h-4" />
          IUCN File Fetcher
          <Badge variant="outline" className="ml-auto text-blue-600 border-blue-300">
            {candidates.length} pending · {complete.length} have range data
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">

        <Alert className="border-blue-200 bg-white text-sm">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-slate-700 mt-1">
            <strong>What this fetches:</strong> Assessment PDFs and range map images (publicly accessible via IUCN website).<br />
            <strong className="text-amber-700">Range polygon SHP/GeoJSON</strong> — requires a registered IUCN bulk-download account and must be uploaded manually via SmartImport.
          </AlertDescription>
        </Alert>

        {/* Status summary */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <div className="text-lg font-bold text-green-700">{complete.length}</div>
            <div className="text-green-600">Have range data</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
            <div className="text-lg font-bold text-amber-700">{candidates.length}</div>
            <div className="text-amber-600">Can fetch files</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
            <div className="text-lg font-bold text-slate-600">{noAssessment.length}</div>
            <div className="text-slate-500">No IUCN ID</div>
          </div>
        </div>

        {/* Action buttons */}
        {candidates.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={runAll}
              disabled={running}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              {running ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fetching {currentSpecies}…</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Fetch Files for All {candidates.length} Species</>
              )}
            </Button>
            <a
              href="https://www.iucnredlist.org/resources/spatial-data-download"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="shrink-0">
                <ExternalLink className="w-4 h-4 mr-1" />
                IUCN SHP Download
              </Button>
            </a>
          </div>
        )}

        {/* Per-species results */}
        {Object.keys(results).length > 0 && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {candidates.map(sp => {
              const r = results[sp.id];
              if (!r) return (
                <div key={sp.id} className="flex items-center gap-2 text-xs text-slate-400 py-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{sp.scientific_name}</span>
                </div>
              );
              return (
                <div key={sp.id} className="flex items-center gap-2 text-xs py-1 border-b border-slate-100 last:border-0">
                  {r.status === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : r.status === 'error' ? (
                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="font-medium text-slate-700 flex-1">{sp.scientific_name}</span>
                  {r.files?.length > 0 && (
                    <div className="flex gap-1">
                      {r.files.map(f => (
                        <Badge key={f} variant="secondary" className="text-xs px-1 py-0">{f}</Badge>
                      ))}
                    </div>
                  )}
                  {r.note && <span className="text-slate-400 truncate max-w-[180px]">{r.note}</span>}
                  {r.error && <span className="text-red-400 truncate max-w-[180px]">{r.error}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Shapefile upload reminder */}
        {noAssessment.length > 0 && (
          <p className="text-xs text-slate-500">
            {noAssessment.length} species have no IUCN ID and cannot be fetched automatically.
            Use <strong>SmartImport</strong> to upload shapefiles for these manually.
          </p>
        )}
      </CardContent>
    </Card>
  );
}