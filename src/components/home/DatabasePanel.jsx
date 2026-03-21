import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Map, FileSpreadsheet, FolderOpen, Upload, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { generateMaxentCSV, generateArcGISGeoJSON, generateCompleteDatasetCSV, downloadFile, parseUploadedFile, importSpeciesRecords } from '@/lib/speciesDataHandlers';

export default function DatabasePanel({ allSpecies, savedSearches, onLoadSpecies, onRefetch }) {
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  const handleImportFile = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const records = await parseUploadedFile(file);
        const { created, errors } = await importSpeciesRecords(records);
        toast.success(`Import complete! ${created} new species added.`);
        if (errors.length > 0) {
          console.warn('Import errors:', errors);
        }
        onRefetch();
      } catch (err) {
        toast.error('Import failed: ' + err.message);
      }
    };
    input.click();
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-bangor-red/10 to-slate-100">
          <CardTitle className="flex items-center gap-2 text-bangor-red">
            <Database className="w-5 h-5" />
            Database Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Database Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-bangor-red/10 to-bangor-cardinal/10 rounded-lg p-4">
              <div className="text-3xl font-bold text-bangor-red">{allSpecies.length}</div>
              <div className="text-sm text-slate-600 mt-1">Total Species</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">
                {allSpecies.filter(sp => sp.range_data_geojson).length}
              </div>
              <div className="text-sm text-slate-600 mt-1">With Range Data</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">
                {allSpecies.filter(sp => sp.observations?.length > 0 || sp.gbif_occurrences?.length > 0).length}
              </div>
              <div className="text-sm text-slate-600 mt-1">With Occurrences</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">
                {[...new Set(allSpecies.map(sp => sp.family))].filter(Boolean).length}
              </div>
              <div className="text-sm text-slate-600 mt-1">Families</div>
            </div>
          </div>

          {/* ArcGIS Tools */}
          <div className="mb-4">
            <Link to={createPageUrl('ArcGISTools')}>
              <Button
                variant="outline"
                className="w-full justify-start border-blue-200 hover:bg-blue-50"
              >
                <Map className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-blue-700 font-semibold">ArcGIS Tools & API</span>
              </Button>
            </Link>
          </div>

          {/* Export Tools */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Export Data</h3>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  const csv = generateMaxentCSV(allSpecies);
                  downloadFile(csv, `maxent_occurrences_${Date.now()}.csv`);
                }}
                className="w-full justify-start bg-emerald-600 hover:bg-emerald-700"
                disabled={!allSpecies.some(sp => sp.observations?.length > 0 || sp.gbif_occurrences?.length > 0)}
              >
                <Layers className="w-4 h-4 mr-2" />
                Export for MAXENT (Occurrence Data)
              </Button>
              
              <Button
                onClick={() => {
                  const geojson = generateArcGISGeoJSON(allSpecies);
                  downloadFile(JSON.stringify(geojson, null, 2), `arcgis_species_ranges_${Date.now()}.geojson`, 'application/geo+json');
                }}
                className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                disabled={!allSpecies.some(sp => sp.range_data_geojson)}
              >
                <Map className="w-4 h-4 mr-2" />
                Export for ArcGIS (GeoJSON Ranges)
              </Button>
              
              <Button
                onClick={() => {
                  const csv = generateCompleteDatasetCSV(allSpecies);
                  downloadFile(csv, `species_database_${Date.now()}.csv`);
                }}
                className="w-full justify-start bg-green-600 hover:bg-green-700"
                disabled={allSpecies.length === 0}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Complete Dataset (Excel/CSV)
              </Button>
            </div>
          </div>

          {/* Data Quality */}
          {allSpecies.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Data Quality</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Species with IUCN Data:</span>
                  <span className="font-semibold text-slate-900">
                    {allSpecies.filter(sp => sp.iucn_id).length} ({Math.round((allSpecies.filter(sp => sp.iucn_id).length / allSpecies.length) * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Species with iNaturalist Data:</span>
                  <span className="font-semibold text-slate-900">
                    {allSpecies.filter(sp => sp.inat_taxon_id).length} ({Math.round((allSpecies.filter(sp => sp.inat_taxon_id).length / allSpecies.length) * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Species with GBIF Data:</span>
                  <span className="font-semibold text-slate-900">
                    {allSpecies.filter(sp => sp.gbif_id).length} ({Math.round((allSpecies.filter(sp => sp.gbif_id).length / allSpecies.length) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Load Data Options */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Load Data</h3>
            <div className="space-y-2">
              {savedSearches.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-2">Load from Saved Searches:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {savedSearches.map((search) => (
                      <Button
                        key={search.id}
                        onClick={async () => {
                          setIsLoadingSearch(true);
                          try {
                            const filtered = allSpecies.filter(sp => {
                              if (search.taxonomy_level === 'family') {
                                return sp.family === search.search_term;
                              } else if (search.taxonomy_level === 'genus') {
                                return sp.genus === search.search_term;
                              } else if (search.taxonomy_level === 'order') {
                                return sp.order_name === search.search_term;
                              } else if (search.taxonomy_level === 'class') {
                                return sp.class_name === search.search_term;
                              } else if (search.taxonomy_level === 'species') {
                                return sp.scientific_name === search.search_term;
                              }
                              return false;
                            });
                            
                            onLoadSpecies(filtered);
                          } catch (error) {
                            console.error('Error loading search:', error);
                          } finally {
                            setIsLoadingSearch(false);
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        disabled={isLoadingSearch}
                      >
                        <FolderOpen className="w-3 h-3 mr-2" />
                        {search.name} ({search.species_count})
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => onLoadSpecies(allSpecies)}
                variant="outline"
                className="w-full justify-start"
              >
                <Database className="w-4 h-4 mr-2" />
                Load All Species ({allSpecies.length})
              </Button>

              <Button
                onClick={handleImportFile}
                variant="outline"
                className="w-full justify-start"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Data File
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}