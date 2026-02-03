import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, MapPin, Users } from 'lucide-react';
import StatusBadge from './StatusBadge';
import TrendIndicator from './TrendIndicator';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function SpeciesCard({ species, selected, onSelect, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
        selected ? 'ring-2 ring-emerald-500 shadow-emerald-100' : 'hover:shadow-slate-200'
      }`}>
        <div className="absolute top-3 left-3 z-10">
          <Checkbox 
            checked={selected}
            onCheckedChange={() => onSelect(species)}
            className="h-5 w-5 bg-white/90 backdrop-blur border-2"
          />
        </div>
        
        {species.image_url ? (
          <div className="h-40 overflow-hidden bg-slate-100">
            <img 
              src={species.image_url} 
              alt={species.common_name || species.scientific_name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
            <span className="text-6xl opacity-30">🦎</span>
          </div>
        )}

        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 truncate">
                  {species.common_name || 'No common name'}
                </h3>
                {species.data_source && (
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0",
                    species.data_source === 'IUCN Red List' 
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                  )}>
                    {species.data_source === 'IUCN Red List' ? 'IUCN' : 'iNat'}
                  </span>
                )}
              </div>
              <p className="text-sm italic text-slate-500 truncate">
                {species.scientific_name}
              </p>
            </div>
            <StatusBadge status={species.iucn_status} size="sm" />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <TrendIndicator trend={species.population_trend} />
            </span>
            {species.family && (
              <span className="truncate">
                {species.family}
              </span>
            )}
          </div>

          {species.range_description && (
            <div className="flex items-start gap-1.5 text-xs text-slate-600 line-clamp-2">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
              <span>{species.range_description}</span>
            </div>
          )}

          {species.iucn_id && (
            <a 
              href={`https://www.iucnredlist.org/species/${species.iucn_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              View on IUCN <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}