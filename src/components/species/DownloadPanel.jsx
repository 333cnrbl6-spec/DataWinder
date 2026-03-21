import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileJson, FileSpreadsheet, Check, X, Database, FileText, Map, Image, ExternalLink, Server, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import JSZip from 'jszip';

const dataFields = [
  { key: 'scientific_name', label: 'Scientific Name', required: true },
  { key: 'common_name', label: 'Common Name' },
  { key: 'data_source', label: 'Data Source' },
  { key: 'iucn_status', label: 'IUCN Status' },
  { key: 'population_trend', label: 'Population Trend' },
  { key: 'population_details', label: 'Population Details' },
  { key: 'status_history', label: 'Conservation Status History' },
  { key: 'geographic_distribution', label: 'Geographic Distribution' },
  { key: 'kingdom', label: 'Kingdom' },
  { key: 'phylum', label: 'Phylum' },
  { key: 'class_name', label: 'Class' },
  { key: 'order_name', label: 'Order' },
  { key: 'family', label: 'Family' },
  { key: 'genus', label: 'Genus' },
  { key: 'habitat', label: 'Habitat' },
  { key: 'habitats_detailed', label: 'Detailed Habitats (IUCN)' },
  { key: 'range_description', label: 'Range Description' },
  { key: 'threats', label: 'Threats' },
  { key: 'threats_detailed', label: 'Detailed Threats (IUCN)' },
  { key: 'conservation_actions', label: 'Conservation Actions' },
  { key: 'assessment_date', label: 'Assessment Date' },
  { key: 'iucn_id', label: 'IUCN ID' },
  { key: 'inat_taxon_id', label: 'iNaturalist Taxon ID' },
  { key: 'observation_count', label: 'Total Observations' },
  { key: 'observations', label: 'Observation Details (iNat)' },
  { key: 'last_observed', label: 'Last Observed Date' },
  { key: 'image_url', label: 'Image URL' },
  { key: 'assessment_pdf_url', label: 'IUCN Assessment PDF' },
  { key: 'range_map_jpg_url', label: 'IUCN Range Map (JPG)' },
  { key: 'range_map_jpg_file_uri', label: 'Range Map JPG (stored)' },
  { key: 'range_data_shp_url', label: 'IUCN Range Polygons (SHP)' },
  { key: 'range_shp_file_uri', label: 'Range Polygons SHP (stored)' },
  { key: 'range_data_csv_url', label: 'IUCN Range Points (CSV)' },
  { key: 'range_csv_file_uri', label: 'Range Points CSV (stored)' },
  { key: 'range_data_geojson', label: 'Range GeoJSON (in-memory)' },
  { key: 'range_geojson_file_uri', label: 'Range GeoJSON (stored)' },
  { key: 'search_results_csv_url', label: 'IUCN Search Results (CSV)' },
  { key: 'search_summary_json', label: 'IUCN Search Summary (JSON)' },
  { key: 'all_images_urls', label: 'All Species Images' }
];

export default function DownloadPanel({ selectedSpecies, onClose, onSaveComplete }) {
  const [fetchingToBackend, setFetchingToBackend] = useState({});
  const [backendFetchResults, setBackendFetchResults] = useState({});

  const fetchIUCNFilesToBackend = async (species) => {
    const key = species.scientific_name;
    setFetchingToBackend(prev => ({ ...prev, [key]: true }));
    try {
      const res = await base44.functions.invoke('downloadIUCNFiles', {
        scientific_name: species.scientific_name,
        assessment_id: species.assessment_id,
        iucn_id: species.iucn_id,
        range_map_jpg_url: species.range_map_jpg_url,
        range_data_shp_url: species.range_data_shp_url,
        range_data_csv_url: species.range_data_csv_url,
      });
      setBackendFetchResults(prev => ({ ...prev, [key]: res.data }));
      // Update the species record in DB if it exists
      if (species.id) {
        const updates = {};
        if (res.data.assessment_pdf_file_uri) updates.assessment_pdf_file_uri = res.data.assessment_pdf_file_uri;
        if (res.data.range_map_jpg_file_uri) updates.range_map_jpg_file_uri = res.data.range_map_jpg_file_uri;
        if (res.data.range_shp_file_uri) updates.range_shp_file_uri = res.data.range_shp_file_uri;
        if (res.data.range_csv_file_uri) updates.range_csv_file_uri = res.data.range_csv_file_uri;
        if (res.data.range_geojson_file_uri) updates.range_geojson_file_uri = res.data.range_geojson_file_uri;
        if (res.data.range_data_geojson) updates.range_data_geojson = res.data.range_data_geojson;
        if (Object.keys(updates).length > 0) {
          await base44.entities.Species.update(species.id, updates);
        }
      }
    } catch (e) {
      setBackendFetchResults(prev => ({ ...prev, [key]: { error: e.message } }));
    } finally {
      setFetchingToBackend(prev => ({ ...prev, [key]: false }));
    }
  };

  const [selectedFields, setSelectedFields] = useState(
   dataFields.filter(f => f.required || ['common_name', 'data_source', 'iucn_status', 'population_trend', 'population_details', 'status_history', 'geographic_distribution', 'family', 'genus', 'range_description', 'range_map_jpg_file_uri', 'range_shp_file_uri', 'range_csv_file_uri', 'range_geojson_file_uri'].includes(f.key)).map(f => f.key)
  );
  const [format, setFormat] = useState('csv');
  const [saveLocation, setSaveLocation] = useState('');
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const toggleField = (key) => {
    const field = dataFields.find(f => f.key === key);
    if (field?.required) return;
    
    setSelectedFields(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const selectAll = () => setSelectedFields(dataFields.map(f => f.key));
  const selectNone = () => setSelectedFields(dataFields.filter(f => f.required).map(f => f.key));

  const saveToDb = async () => {
    setIsSaving(true);
    try {
      // Group by dataset
      const groupedByDataset = selectedSpecies.reduce((acc, species) => {
        const dataset = species.dataset_name || 'ungrouped';
        if (!acc[dataset]) acc[dataset] = [];
        acc[dataset].push(species);
        return acc;
      }, {});

      // Save each dataset
      for (const [datasetName, speciesInDataset] of Object.entries(groupedByDataset)) {
        // Save species to database
        const speciesToSave = speciesInDataset.map(sp => ({
          scientific_name: sp.scientific_name,
          common_name: sp.common_name,
          kingdom: sp.kingdom,
          phylum: sp.phylum,
          class_name: sp.class_name,
          order_name: sp.order_name,
          family: sp.family,
          genus: sp.genus,
          iucn_status: sp.iucn_status,
          population_trend: sp.population_trend,
          population_details: sp.population_details,
          status_history: sp.status_history,
          geographic_distribution: sp.geographic_distribution,
          habitat: sp.habitat,
          range_description: sp.range_description,
          threats: sp.threats,
          conservation_actions: sp.conservation_actions,
          assessment_date: sp.assessment_date,
          iucn_id: sp.iucn_id,
          image_url: sp.image_url,
          assessment_pdf_url: sp.assessment_pdf_url,
          assessment_pdf_file_uri: sp.assessment_pdf_file_uri,
          range_map_jpg_url: sp.range_map_jpg_url,
          range_map_jpg_file_uri: sp.range_map_jpg_file_uri,
          range_data_shp_url: sp.range_data_shp_url,
          range_shp_file_uri: sp.range_shp_file_uri,
          range_data_csv_url: sp.range_data_csv_url,
          range_csv_file_uri: sp.range_csv_file_uri,
          range_data_geojson: sp.range_data_geojson,
          range_geojson_file_uri: sp.range_geojson_file_uri
        }));

        await base44.entities.Species.bulkCreate(speciesToSave);

        // Save search record
        await base44.entities.SavedSearch.create({
          name: saveLocation || datasetName,
          taxonomy_level: 'multiple',
          search_term: datasetName,
          species_count: speciesInDataset.length
        });
      }

      if (onSaveComplete) {
        onSaveComplete();
      }
      onClose();
    } catch (error) {
      console.error('Error saving to database:', error);
      alert('Failed to save to database. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadData = async () => {
    const zip = new JSZip();

    // Group by species (scientific name) with data from all sources
    const speciesByName = {};
    
    selectedSpecies.forEach(species => {
      const name = species.scientific_name;
      if (!speciesByName[name]) {
        speciesByName[name] = [];
      }
      speciesByName[name].push(species);
    });

    // Create files organized by species
    Object.entries(speciesByName).forEach(([scientificName, speciesData]) => {
      const familyName = (speciesData[0].family || 'Unknown_Family').replace(/[^a-z0-9]/gi, '_');
      const speciesName = scientificName.replace(/[^a-z0-9]/gi, '_');

      // Create comprehensive data for this species from all sources
      speciesData.forEach((species, idx) => {
        const dataSource = (species.data_source || 'Unknown_Source').replace(/[^a-z0-9]/gi, '_');
        
        const row = {
          data_source: species.data_source,
          ...selectedFields.reduce((acc, field) => {
            const value = species[field];
            // Handle arrays and objects for detailed data
            if (Array.isArray(value) && value.length > 0) {
              acc[field] = format === 'json' ? value : JSON.stringify(value);
            } else {
              acc[field] = value || '';
            }
            return acc;
          }, {})
        };

        // Add iNaturalist-specific fields if present
        if (species.data_source === 'iNaturalist') {
          row.observation_count = species.observation_count || 0;
          row.recent_observations = species.recent_observations || 0;
          row.last_observed = species.last_observed || '';
          row.inat_taxon_id = species.inat_taxon_id || '';
          row.inat_wikipedia_url = species.inat_wikipedia_url || '';
          if (species.observations) {
            row.observations = format === 'json' ? species.observations : JSON.stringify(species.observations);
          }
        }

        // Add IUCN-specific detailed fields
        if (species.data_source === 'IUCN Red List') {
          if (species.habitats_detailed) {
            row.habitats_detailed = format === 'json' ? species.habitats_detailed : JSON.stringify(species.habitats_detailed);
          }
          if (species.threats_detailed) {
            row.threats_detailed = format === 'json' ? species.threats_detailed : JSON.stringify(species.threats_detailed);
          }
        }

        let content, filename;
        const sourceSuffix = speciesData.length > 1 ? `_${dataSource}` : '';

        if (format === 'json') {
          content = JSON.stringify(row, null, 2);
          filename = `${familyName}/${speciesName}/${speciesName}${sourceSuffix}.json`;
        } else {
          const headers = Object.keys(row).join(',');
          const values = Object.values(row).map(value => {
            const val = String(value || '').replace(/"/g, '""');
            return val.includes(',') || val.includes('"') || val.includes('\n') 
              ? `"${val}"` 
              : val;
          }).join(',');
          content = [headers, values].join('\n');
          filename = `${familyName}/${speciesName}/${speciesName}${sourceSuffix}.csv`;
        }

        zip.file(filename, content);
      });
    });

    // Generate and download the zip file
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `species_data_${format}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden">
            <CardHeader className="border-b bg-slate-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-emerald-600" />
                  Download Species Data
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                {selectedSpecies.length} species selected · Each species exported as separate row
              </p>
            </CardHeader>

            <CardContent className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div>
                <Label className="text-sm font-medium mb-3 block">Save Location</Label>
                <Input
                  value={saveLocation}
                  onChange={(e) => setSaveLocation(e.target.value)}
                  placeholder="e.g., Primate Study 2026, Conservation Project..."
                  className="mb-3"
                />
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <Checkbox
                    checked={saveToDatabase}
                    onCheckedChange={setSaveToDatabase}
                  />
                  <Database className="w-4 h-4" />
                  Save to database for later access
                </label>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Export Format (Download Files)</Label>
                <div className="flex gap-3">
                  <Button
                    variant={format === 'csv' ? 'default' : 'outline'}
                    onClick={() => setFormat('csv')}
                    className={format === 'csv' ? 'bg-emerald-600 text-white' : ''}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant={format === 'json' ? 'default' : 'outline'}
                    onClick={() => setFormat('json')}
                    className={format === 'json' ? 'bg-emerald-600 text-white' : ''}
                  >
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </div>

              {/* IUCN Available Files — fetch to backend instead of local download */}
              {selectedSpecies.some(sp => sp.assessment_pdf_url || sp.range_data_shp_url || sp.range_map_jpg_url || sp.range_data_csv_url || sp.assessment_id) && (
                <div>
                  <Label className="text-sm font-medium mb-1 block">IUCN Files — Store to Backend</Label>
                  <p className="text-xs text-slate-500 mb-3">Files are fetched server-side and stored in your backend — no local download needed.</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedSpecies.map(sp => {
                      const hasFiles = sp.assessment_pdf_url || sp.assessment_id || sp.range_data_shp_url || sp.range_map_jpg_url || sp.range_data_csv_url;
                      if (!hasFiles) return null;
                      const key = sp.scientific_name;
                      const isFetching = fetchingToBackend[key];
                      const fetchResult = backendFetchResults[key];
                      const successCount = fetchResult ? Object.values(fetchResult).filter(v => typeof v === 'string' && v.startsWith('private://')).length : 0;
                      return (
                        <div key={key} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold text-slate-700 italic">{sp.scientific_name}</p>
                            <div className="flex items-center gap-2">
                              {fetchResult && !fetchResult.error && (
                                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> {successCount} file{successCount !== 1 ? 's' : ''} stored
                                </span>
                              )}
                              {fetchResult?.error && (
                                <span className="text-xs text-red-600">{fetchResult.error}</span>
                              )}
                              <button
                                onClick={() => fetchIUCNFilesToBackend(sp)}
                                disabled={isFetching}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 disabled:opacity-50"
                              >
                                {isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3" />}
                                {isFetching ? 'Fetching…' : fetchResult ? 'Re-fetch' : 'Fetch to Backend'}
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(sp.assessment_pdf_url || sp.assessment_id) && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                                <FileText className="w-3 h-3" /> Assessment PDF
                              </span>
                            )}
                            {sp.range_data_shp_url && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                <Map className="w-3 h-3" /> Range Polygons (SHP)
                              </span>
                            )}
                            {sp.range_data_csv_url && sp.range_data_csv_url !== 'available' && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                                <FileSpreadsheet className="w-3 h-3" /> Range Points (CSV)
                              </span>
                            )}
                            {sp.range_map_jpg_url && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                <Image className="w-3 h-3" /> Range Map (JPG)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Data Fields</Label>
                  <div className="flex gap-2">
                    <button 
                      onClick={selectAll}
                      className="text-xs text-emerald-600 underline font-medium"
                    >
                      Select all
                    </button>
                    <span className="text-slate-300">|</span>
                    <button 
                      onClick={selectNone}
                      className="text-xs text-slate-500 underline font-medium"
                    >
                      Select none
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {dataFields.map(field => (
                    <label
                      key={field.key}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedFields.includes(field.key) 
                          ? 'bg-emerald-50 text-emerald-800' 
                          : 'bg-slate-100 text-slate-600'
                      } ${field.required ? 'opacity-75' : ''}`}
                    >
                      <Checkbox
                        checked={selectedFields.includes(field.key)}
                        onCheckedChange={() => toggleField(field.key)}
                        disabled={field.required}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{field.label}</span>
                      {field.required && (
                        <span className="text-xs text-slate-400">(required)</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                {saveToDatabase && (
                  <Button 
                    onClick={saveToDb}
                    disabled={isSaving}
                    className="flex-1 bg-blue-600 text-white"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save to Database'}
                  </Button>
                )}
                <Button 
                  onClick={downloadData}
                  className="flex-1 bg-emerald-600 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download {format.toUpperCase()}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}