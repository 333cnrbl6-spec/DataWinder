import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Grid3x3, Map, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import SpeciesGrid from '@/components/species/SpeciesGrid';
import MapView from '@/components/species/MapView';
import OccurrenceSourceMap from '@/components/species/OccurrenceSourceMap';
import SelectionBar from '@/components/species/SelectionBar';

export default function ResultsPanel({ 
  species, 
  selectedIds, 
  onSelect, 
  searchInfo, 
  onSelectAll, 
  onDeselectAll,
  onDownload,
  onCompare,
  onManageLists,
  onAddNote,
  onSaveSearch,
  onEnrichWithINaturalist,
  onDelete
}) {
  const [viewMode, setViewMode] = useState('grid');
  const selectedSpecies = species.filter(sp => selectedIds.includes(sp.id || sp.scientific_name));

  return (
    <Card className="shadow-lg border-slate-200">
      <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-bangor-red/10 to-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-bangor-red">Search Results ({species.length})</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-bangor-red text-white' : 'bg-slate-100 text-slate-800'}
            >
              <Grid3x3 className="w-4 h-4 mr-1" />
              Grid
            </Button>
            <Button
              size="sm"
              onClick={() => setViewMode('map')}
              className={viewMode === 'map' ? 'bg-bangor-red text-white' : 'bg-slate-100 text-slate-800'}
            >
              <Map className="w-4 h-4 mr-1" />
              Map
            </Button>
            <Button
              size="sm"
              onClick={() => setViewMode('sources')}
              className={viewMode === 'sources' ? 'bg-bangor-red text-white' : 'bg-slate-100 text-slate-800'}
            >
              <Layers className="w-4 h-4 mr-1" />
              Sources
            </Button>
          </div>
        </div>
        {searchInfo && (
          <div className="text-sm text-slate-500 mt-2">
            Showing species from <span className="font-medium text-slate-700">{searchInfo.level}</span>: <span className="font-medium text-bangor-red">{searchInfo.terms}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <SelectionBar
          totalCount={species.length}
          selectedCount={selectedIds.length}
          onSelectAll={onSelectAll}
          onDeselectAll={onDeselectAll}
          onDownload={onDownload}
          onCompare={() => selectedSpecies.length >= 2 && onCompare()}
          onManageLists={onManageLists}
          onAddNote={onAddNote}
          onSaveSearch={onSaveSearch}
          selectedSpecies={selectedSpecies}
        />

        <div className="mt-4 max-h-[600px] overflow-y-auto">
          {viewMode === 'grid' ? (
            <SpeciesGrid
              species={species}
              selectedIds={selectedIds}
              onSelect={onSelect}
              onEnrichWithINaturalist={onEnrichWithINaturalist}
            />
          ) : viewMode === 'map' ? (
            <MapView
              species={species}
              selectedIds={selectedIds}
              onSelect={onSelect}
            />
          ) : (
            <OccurrenceSourceMap species={species} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}