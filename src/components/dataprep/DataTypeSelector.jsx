import React from 'react';
import { FileText, MapPin, Globe, Database, Eye, Shield, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DATA_TYPES = [
  {
    id: 'species_summary',
    label: 'Species Summary',
    description: 'Complete species metadata table including taxonomy, IUCN status & distribution',
    icon: FileText,
    colorClass: 'bg-blue-50 text-blue-600 border-blue-200',
    format: 'CSV'
  },
  {
    id: 'occurrences_maxent',
    label: 'MAXENT Occurrences',
    description: 'Formatted occurrence points (species, lon, lat) ready for MAXENT input',
    icon: Layers,
    colorClass: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    format: 'CSV'
  },
  {
    id: 'occurrences_arcgis',
    label: 'ArcGIS Points',
    description: 'Point layer with full species attributes formatted for ArcGIS import',
    icon: MapPin,
    colorClass: 'bg-purple-50 text-purple-600 border-purple-200',
    format: 'CSV'
  },
  {
    id: 'range_geojson',
    label: 'Range GeoJSON',
    description: 'Species range polygons as a FeatureCollection for GIS mapping',
    icon: Globe,
    colorClass: 'bg-green-50 text-green-600 border-green-200',
    format: 'GeoJSON'
  },
  {
    id: 'gbif_occurrences',
    label: 'GBIF Occurrences',
    description: 'Raw GBIF occurrence records with coordinates, dates and institution codes',
    icon: Database,
    colorClass: 'bg-orange-50 text-orange-600 border-orange-200',
    format: 'CSV'
  },
  {
    id: 'inat_observations',
    label: 'iNat Observations',
    description: 'iNaturalist research-grade observations with location and observer data',
    icon: Eye,
    colorClass: 'bg-teal-50 text-teal-600 border-teal-200',
    format: 'CSV'
  },
  {
    id: 'habitats_threats',
    label: 'Habitats & Threats',
    description: 'Detailed IUCN habitat codes, suitability ratings and threat assessments',
    icon: Shield,
    colorClass: 'bg-red-50 text-red-600 border-red-200',
    format: 'JSON'
  },
];

export default function DataTypeSelector({ selected, onChange }) {
  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {DATA_TYPES.map(type => {
        const Icon = type.icon;
        const isSel = selected.includes(type.id);
        return (
          <button
            key={type.id}
            onClick={() => toggle(type.id)}
            className={cn(
              'text-left p-3 rounded-xl border-2 transition-all duration-150',
              isSel
                ? 'border-bangor-red bg-bangor-red/5 shadow-md scale-[1.02]'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            )}
          >
            <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center mb-2', type.colorClass)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="font-semibold text-slate-800 text-xs leading-tight">{type.label}</div>
            <div className="text-xs text-slate-500 mt-1 leading-snug">{type.description}</div>
            <div className="mt-2">
              <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">{type.format}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}