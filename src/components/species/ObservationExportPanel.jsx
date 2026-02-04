import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileJson, FileSpreadsheet, X, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const observationFields = [
  { key: 'scientific_name', label: 'Scientific Name', required: true },
  { key: 'common_name', label: 'Common Name' },
  { key: 'data_source', label: 'Data Source', required: true },
  { key: 'latitude', label: 'Latitude', required: true },
  { key: 'longitude', label: 'Longitude', required: true },
  { key: 'location', label: 'Location Description' },
  { key: 'observed_on', label: 'Observation Date' },
  { key: 'user', label: 'Observer' },
  { key: 'iucn_status', label: 'IUCN Status' },
  { key: 'family', label: 'Family' },
  { key: 'genus', label: 'Genus' },
  { key: 'observation_count', label: 'Total Observations' },
  { key: 'photo_url', label: 'Photo URL' }
];

export default function ObservationExportPanel({ observations, onClose }) {
  const [selectedFields, setSelectedFields] = useState(
    observationFields.filter(f => f.required || ['common_name', 'location', 'observed_on', 'iucn_status'].includes(f.key)).map(f => f.key)
  );
  const [format, setFormat] = useState('csv');

  const toggleField = (key) => {
    const field = observationFields.find(f => f.key === key);
    if (field?.required) return;
    
    setSelectedFields(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const selectAll = () => setSelectedFields(observationFields.map(f => f.key));
  const selectNone = () => setSelectedFields(observationFields.filter(f => f.required).map(f => f.key));

  const downloadData = () => {
    const exportData = observations.map(obs => {
      const row = {};
      selectedFields.forEach(field => {
        if (field === 'scientific_name' || field === 'common_name' || field === 'data_source' || 
            field === 'iucn_status' || field === 'family' || field === 'genus' || field === 'observation_count') {
          row[field] = obs.species[field] || '';
        } else {
          row[field] = obs[field] || '';
        }
      });
      return row;
    });

    let content, filename;

    if (format === 'json') {
      content = JSON.stringify(exportData, null, 2);
      filename = `map_observations_${Date.now()}.json`;
    } else {
      const headers = selectedFields.join(',');
      const rows = exportData.map(row => 
        selectedFields.map(field => {
          const val = String(row[field] || '').replace(/"/g, '""');
          return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val;
        }).join(',')
      );
      content = [headers, ...rows].join('\n');
      filename = `map_observations_${Date.now()}.csv`;
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    onClose();
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
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Export Map Observations
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                {observations.length} observation points (filtered)
              </p>
            </CardHeader>

            <CardContent className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div>
                <Label className="text-sm font-medium mb-3 block">Export Format</Label>
                <div className="flex gap-3">
                  <Button
                    variant={format === 'csv' ? 'default' : 'outline'}
                    onClick={() => setFormat('csv')}
                    className={format === 'csv' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant={format === 'json' ? 'default' : 'outline'}
                    onClick={() => setFormat('json')}
                    className={format === 'json' ? 'bg-blue-600 hover:bg-blue-700' : ''}
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
                      className="text-xs text-blue-600 hover:underline"
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
                  {observationFields.map(field => (
                    <label
                      key={field.key}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedFields.includes(field.key) 
                          ? 'bg-blue-50 text-blue-800' 
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
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download {format.toUpperCase()}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}