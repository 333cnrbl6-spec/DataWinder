import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileJson, FileSpreadsheet, Check, X, Database } from 'lucide-react';
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
  { key: 'kingdom', label: 'Kingdom' },
  { key: 'phylum', label: 'Phylum' },
  { key: 'class_name', label: 'Class' },
  { key: 'order_name', label: 'Order' },
  { key: 'family', label: 'Family' },
  { key: 'genus', label: 'Genus' },
  { key: 'habitat', label: 'Habitat' },
  { key: 'range_description', label: 'Range Description' },
  { key: 'threats', label: 'Threats' },
  { key: 'conservation_actions', label: 'Conservation Actions' },
  { key: 'assessment_date', label: 'Assessment Date' },
  { key: 'iucn_id', label: 'IUCN ID' },
  { key: 'inat_taxon_id', label: 'iNaturalist Taxon ID' },
  { key: 'observation_count', label: 'Total Observations' },
  { key: 'last_observed', label: 'Last Observed Date' },
  { key: 'image_url', label: 'Image URL' }
];

export default function DownloadPanel({ selectedSpecies, onClose, onSaveComplete }) {
  const [selectedFields, setSelectedFields] = useState(
    dataFields.filter(f => f.required || ['common_name', 'data_source', 'iucn_status', 'population_trend', 'family', 'genus', 'range_description'].includes(f.key)).map(f => f.key)
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
          habitat: sp.habitat,
          range_description: sp.range_description,
          threats: sp.threats,
          conservation_actions: sp.conservation_actions,
          assessment_date: sp.assessment_date,
          iucn_id: sp.iucn_id,
          image_url: sp.image_url
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

    // Group by data source first, then by family
    selectedSpecies.forEach(species => {
      const row = {
        data_source: species.data_source,
        ...selectedFields.reduce((acc, field) => {
          acc[field] = species[field] || '';
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
      }

      const dataSource = (species.data_source || 'Unknown_Source').replace(/[^a-z0-9]/gi, '_');
      const familyName = (species.family || 'Unknown_Family').replace(/[^a-z0-9]/gi, '_');
      const speciesName = species.scientific_name.replace(/[^a-z0-9]/gi, '_');

      let content, filename;

      if (format === 'json') {
        content = JSON.stringify(row, null, 2);
        filename = `${dataSource}/${familyName}/${speciesName}.json`;
      } else {
        const headers = Object.keys(row).join(',');
        const values = Object.values(row).map(value => {
          const val = String(value || '').replace(/"/g, '""');
          return val.includes(',') || val.includes('"') || val.includes('\n') 
            ? `"${val}"` 
            : val;
        }).join(',');
        content = [headers, values].join('\n');
        filename = `${dataSource}/${familyName}/${speciesName}.csv`;
      }

      zip.file(filename, content);
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
                    className={format === 'csv' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant={format === 'json' ? 'default' : 'outline'}
                    onClick={() => setFormat('json')}
                    className={format === 'json' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  >
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Data Fields</Label>
                  <div className="flex gap-2">
                    <button 
                      onClick={selectAll}
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-slate-300">|</span>
                    <button 
                      onClick={selectNone}
                      className="text-xs text-slate-500 hover:underline"
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
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
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
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save to Database'}
                  </Button>
                )}
                <Button 
                  onClick={downloadData}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
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