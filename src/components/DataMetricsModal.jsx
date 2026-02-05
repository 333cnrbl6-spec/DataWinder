import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Search, Trash2 } from 'lucide-react';
import SpeciesGrid from './species/SpeciesGrid';
import MapView from './species/MapView';
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from '@tanstack/react-query';

export default function DataMetricsModal({ 
  isOpen, 
  onClose, 
  title, 
  type, 
  data, 
  allSpecies 
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSelect = (sp) => {
    const id = sp.id || sp.scientific_name;
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getFilteredData = () => {
    if (!data) return [];
    return data.filter(item => {
      if (typeof item === 'string') {
        return item.toLowerCase().includes(searchTerm.toLowerCase());
      }
      const name = item.scientific_name || item.family || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  const filteredData = getFilteredData();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-bangor-red">{title}</DialogTitle>
        </DialogHeader>

        {/* Search Bar and Actions */}
        {(type === 'species' || type === 'families' || type === 'completeness' || type === 'range' || type === 'occurrences') && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setSelectedIds(filteredData.map(sp => sp.id || sp.scientific_name))}
                size="sm"
                variant="outline"
              >
                Select All
              </Button>
              <Button
                onClick={() => setSelectedIds([])}
                size="sm"
                variant="outline"
              >
                Deselect All
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {type === 'species' && (
            <SpeciesGrid
              species={filteredData}
              selectedIds={selectedIds}
              onSelect={handleSelect}
            />
          )}

          {type === 'map' && (
            <MapView
              species={filteredData}
              selectedIds={selectedIds}
              onSelect={handleSelect}
            />
          )}

          {type === 'families' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
              {filteredData.map((family, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-bangor-red/10 to-bangor-sun/10 rounded-lg p-4 border border-bangor-sun/30 cursor-pointer hover:shadow-lg transition-all"
                >
                  <p className="font-semibold text-slate-800">{family}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {allSpecies.filter(sp => sp.family === family).length} species
                  </p>
                </div>
              ))}
            </div>
          )}

          {type === 'completeness' && (
            <div className="space-y-3 p-4">
              {filteredData.map((sp, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all"
                >
                  <div className="font-semibold text-slate-800">{sp.scientific_name}</div>
                  <div className="text-sm text-slate-600 mt-1">{sp.common_name || 'No common name'}</div>
                  {sp.iucn_status && (
                    <div className="text-xs text-bangor-red font-semibold mt-2">
                      IUCN Status: {sp.iucn_status}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}