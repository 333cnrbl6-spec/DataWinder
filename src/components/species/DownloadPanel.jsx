import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileJson, FileSpreadsheet, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const dataFields = [
  { key: 'scientific_name', label: 'Scientific Name', required: true },
  { key: 'common_name', label: 'Common Name' },
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
  { key: 'iucn_id', label: 'IUCN ID' }
];

export default function DownloadPanel({ selectedSpecies, onClose }) {
  const [selectedFields, setSelectedFields] = useState(
    dataFields.filter(f => f.required || ['common_name', 'iucn_status', 'population_trend', 'family', 'genus', 'range_description'].includes(f.key)).map(f => f.key)
  );
  const [format, setFormat] = useState('csv');

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

  const downloadData = () => {
    // Group species by their dataset
    const groupedByDataset = selectedSpecies.reduce((acc, species) => {
      const dataset = species.dataset_name || 'ungrouped';
      if (!acc[dataset]) acc[dataset] = [];
      acc[dataset].push(species);
      return acc;
    }, {});

    const datasets = Object.keys(groupedByDataset);

    // If multiple datasets, create a structured download
    if (datasets.length > 1) {
      datasets.forEach(datasetName => {
        const speciesInDataset = groupedByDataset[datasetName];
        const data = speciesInDataset.map(species => {
          const row = {};
          selectedFields.forEach(field => {
            row[field] = species[field] || '';
          });
          return row;
        });

        let content, filename, mimeType;
        const safeName = datasetName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        if (format === 'json') {
          content = JSON.stringify(data, null, 2);
          filename = `iucn_${safeName}.json`;
          mimeType = 'application/json';
        } else {
          const headers = selectedFields.join(',');
          const rows = data.map(row => 
            selectedFields.map(field => {
              const value = String(row[field] || '').replace(/"/g, '""');
              return value.includes(',') || value.includes('"') || value.includes('\n') 
                ? `"${value}"` 
                : value;
            }).join(',')
          );
          content = [headers, ...rows].join('\n');
          filename = `iucn_${safeName}.csv`;
          mimeType = 'text/csv';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } else {
      // Single dataset download
      const data = selectedSpecies.map(species => {
        const row = {};
        selectedFields.forEach(field => {
          row[field] = species[field] || '';
        });
        return row;
      });

      let content, filename, mimeType;

      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = 'iucn_species_data.json';
        mimeType = 'application/json';
      } else {
        const headers = selectedFields.join(',');
        const rows = data.map(row => 
          selectedFields.map(field => {
            const value = String(row[field] || '').replace(/"/g, '""');
            return value.includes(',') || value.includes('"') || value.includes('\n') 
              ? `"${value}"` 
              : value;
          }).join(',')
        );
        content = [headers, ...rows].join('\n');
        filename = 'iucn_species_data.csv';
        mimeType = 'text/csv';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
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
                <Label className="text-sm font-medium mb-3 block">Export Format</Label>
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

              <Button 
                onClick={downloadData}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download {format.toUpperCase()} ({selectedSpecies.length} species
                {(() => {
                  const datasets = new Set(selectedSpecies.map(s => s.dataset_name).filter(Boolean));
                  return datasets.size > 1 ? ` across ${datasets.size} files` : '';
                })()})
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}