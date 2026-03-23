import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import StatusBadge from './StatusBadge';
import { FileText, Leaf, MapPin, Users, TrendingDown, Plus, Info, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SpeciesCard({
  species,
  selected,
  onSelect,
  onEnrichWithINaturalist,
  onDelete,
  index
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={`cursor-pointer transition-all h-full flex flex-col ${
          selected ? 'ring-2 ring-bangor-red shadow-lg' : 'hover:shadow-md'
        }`}
        onClick={() => onSelect(species)}
      >
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <Checkbox
              checked={selected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(species);
              }}
              className="mt-1 sm:mt-0"
            />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm sm:text-base italic text-bangor-red truncate">
                {species.scientific_name}
              </CardTitle>
              <p className="text-xs sm:text-sm text-slate-600 truncate">
                {species.common_name || '(no common name)'}
              </p>
            </div>
          </div>
          {species.image_url && (
            <img
              src={species.image_url}
              alt={species.scientific_name}
              className="w-full h-32 sm:h-40 object-cover rounded mt-2 sm:mt-3"
            />
          )}
        </CardHeader>

        <CardContent className="flex-1 pb-3 sm:pb-4 space-y-2 text-xs">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Status:</span>
            <StatusBadge status={species.iucn_status} size="sm" />
          </div>

          {/* Population Trend */}
          {species.population_trend && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Trend:</span>
              <span className="font-semibold text-slate-900 capitalize">
                {species.population_trend}
              </span>
            </div>
          )}

          {/* Observations/Occurrences */}
          {species.observation_count > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600">iNat Obs:</span>
              <span className="font-semibold text-slate-900">{species.observation_count}</span>
            </div>
          )}

          {species.gbif_occurrence_count > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600">GBIF Records:</span>
              <span className="font-semibold text-slate-900">{species.gbif_occurrence_count}</span>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-200">
            {species.data_source && (
              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">
                {species.data_source.split('+')[0].trim()}
              </span>
            )}
            {species.range_data_geojson && (
              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" /> Range
              </span>
            )}
            {species.is_new && (
              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                New
              </span>
            )}
          </div>
        </CardContent>

        {/* Actions */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2 border-t border-slate-200">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            size="sm"
            variant="outline"
            className="w-full text-xs"
          >
            <Info className="w-3 h-3 mr-1" />
            {showDetails ? 'Hide' : 'Info'}
          </Button>

          {!species.inat_taxon_id && onEnrichWithINaturalist && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onEnrichWithINaturalist(species);
              }}
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              iNat Data
            </Button>
          )}

          {onDelete && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(species);
              }}
              size="sm"
              variant="ghost"
              className="w-full text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          )}
        </div>

        {/* Expandable Details */}
        {showDetails && (
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-slate-100 bg-slate-50 text-xs space-y-1">
            {species.family && <p><span className="text-slate-600">Family:</span> {species.family}</p>}
            {species.genus && <p><span className="text-slate-600">Genus:</span> {species.genus}</p>}
            {species.kingdom && <p><span className="text-slate-600">Kingdom:</span> {species.kingdom}</p>}
            {species.range_description && (
              <p className="text-slate-600 line-clamp-2">{species.range_description}</p>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}