import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, MapPin, Users, Download, FileText } from 'lucide-react';
import StatusBadge from './StatusBadge';
import TrendIndicator from './TrendIndicator';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function SpeciesCard({ species, selected, onSelect, index = 0 }) {
  const isIUCN = species.data_source === 'IUCN Red List' || species.data_source === 'IUCN + iNaturalist';
  const isINat = species.data_source === 'iNaturalist' || species.data_source === 'IUCN + iNaturalist';
  const isCombined = species.data_source === 'IUCN + iNaturalist';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
        selected 
          ? isIUCN ? 'ring-2 ring-emerald-500 shadow-emerald-100' : 'ring-2 ring-blue-500 shadow-blue-100'
          : 'hover:shadow-slate-200'
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
              className="w-full h-full object-cover"
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
                    isCombined
                      ? "bg-gradient-to-r from-emerald-100 to-blue-100 text-slate-700"
                      : species.data_source === 'IUCN Red List' 
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                  )}>
                    {isCombined ? 'IUCN + iNat' : species.data_source === 'IUCN Red List' ? 'IUCN' : 'iNat'}
                  </span>
                )}
              </div>
              <p className="text-sm italic text-slate-500 truncate">
                {species.scientific_name}
              </p>
            </div>
            {isIUCN && <StatusBadge status={species.iucn_status} size="sm" />}
          </div>

          {/* iNaturalist-specific observations */}
          {isINat && (
            <div className="flex flex-wrap gap-2 mb-3">
              {species.observation_count > 0 && (
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                  {species.observation_count.toLocaleString()} obs
                </span>
              )}
              {species.last_observed && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                  Last: {species.last_observed}
                </span>
              )}
            </div>
          )}

          {/* IUCN-specific data */}
          {isIUCN && (
            <div className="space-y-1.5 mb-3">
              {species.assessment_date && (
                <div className="text-xs text-amber-600 font-medium">
                  Assessed: {new Date(species.assessment_date).getFullYear()}
                </div>
              )}
              
              {species.status_history && species.status_history.length > 1 && (
                <div className="text-xs">
                  <span className="font-medium text-slate-700">Status History: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {species.status_history.slice(-3).map((h, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                        {h.year}: {h.status}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {species.population_details && (
                <div className="text-xs">
                  <span className="font-medium text-slate-700">Population: </span>
                  <span className="text-slate-600 line-clamp-2">{species.population_details}</span>
                </div>
              )}

              {species.geographic_distribution?.countries?.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-slate-700">Distribution: </span>
                  <span className="text-slate-600 line-clamp-1">
                    {species.geographic_distribution.countries.slice(0, 3).join(', ')}
                    {species.geographic_distribution.countries.length > 3 && ` +${species.geographic_distribution.countries.length - 3}`}
                  </span>
                </div>
              )}
              
              {species.habitat && (
                <div className="text-xs">
                  <span className="font-medium text-slate-700">Habitat: </span>
                  <span className="text-slate-600 line-clamp-2">{species.habitat}</span>
                </div>
              )}
              {species.threats && (
                <div className="text-xs">
                  <span className="font-medium text-red-700">Threats: </span>
                  <span className="text-slate-600 line-clamp-2">{species.threats}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
            {isIUCN && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <TrendIndicator trend={species.population_trend} />
              </span>
            )}
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

          {/* External Links */}
          <div className="mt-3 space-y-1">
            {isIUCN && species.iucn_id && (
              <>
                <a 
                  href={`https://www.iucnredlist.org/species/${species.iucn_id}/${species.scientific_name.replace(/ /g, '-').toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  View on IUCN Red List <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-[10px] text-slate-500 italic mt-1">
                  IUCN 2025. IUCN Red List of Threatened Species. Version 2025-2 www.iucnredlist.org
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {species.assessment_pdf_url && (
                    <a 
                      href={species.assessment_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      title="Download Assessment PDF from IUCN"
                    >
                      📄 PDF
                    </a>
                  )}
                  {species.range_map_jpg_url && (
                    <a 
                      href={species.range_map_jpg_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      title="View Range Map on IUCN"
                    >
                      🗺️ Map
                    </a>
                  )}
                  {species.range_data_shp_url && (
                    <a 
                      href={species.range_data_shp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      title="Download Spatial Data from IUCN"
                    >
                      📍 SHP
                    </a>
                  )}
                  {species.search_summary_json && (
                    <button 
                      className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        const blob = new Blob([JSON.stringify(species.search_summary_json, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${species.scientific_name.replace(/ /g, '_')}_summary.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      title="Download Search Summary (JSON)"
                    >
                      📊 Summary
                    </button>
                  )}
                  {species.search_results_csv_url && (
                    <a 
                      href={species.search_results_csv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      title="Export Search Results from IUCN"
                    >
                      📥 Export
                    </a>
                  )}
                </div>
                {species.all_images_urls && species.all_images_urls.length > 1 && (
                  <div className="text-xs text-slate-500 mt-1">
                    {species.all_images_urls.length} images available
                  </div>
                )}
              </>
            )}
            {isINat && species.inat_taxon_id && (
              <>
                <a 
                  href={`https://www.inaturalist.org/taxa/${species.inat_taxon_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  View on iNaturalist <ExternalLink className="w-3 h-3" />
                </a>
                <div className="flex gap-1 mt-1">
                  <a 
                    href={`https://www.inaturalist.org/observations/export?taxon_id=${species.inat_taxon_id}&quality_grade=research`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📥 CSV
                  </a>
                  <a 
                    href={`https://www.inaturalist.org/observations?taxon_id=${species.inat_taxon_id}&quality_grade=research&verifiable=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📊 JSON
                  </a>
                </div>
              </>
            )}
            {isINat && species.inat_wikipedia_url && (
              <a 
                href={species.inat_wikipedia_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-slate-600 hover:text-slate-700 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Wikipedia →
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}