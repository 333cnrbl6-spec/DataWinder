import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Users, Download, FileText, Plus, Database } from 'lucide-react';
import StatusBadge from './StatusBadge';
import TrendIndicator from './TrendIndicator';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SpeciesCard({ species, selected, onSelect, onEnrichWithINaturalist, index = 0, isNew }) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const isIUCN = species.data_source === 'IUCN Red List';
  const isINat = species.data_source === 'iNaturalist';
  const hasINatData = species.inat_taxon_id || species.observation_count > 0;
  const hasGBIFData = species.gbif_id || species.gbif_occurrence_count > 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className={`group relative overflow-hidden transition-all duration-300 shadow-lg ${
        selected 
          ? 'ring-2 ring-bangor-red shadow-bangor-red/20'
          : 'shadow-slate-200'
      }`}>
        {isNew && (
          <Badge className="absolute top-3 right-3 z-10 bg-bangor-red text-white font-bold text-xs px-3 py-1 rounded-full shadow-md border-2 border-white">
            NEW SPECIES
          </Badge>
        )}
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
          <div className="h-40 bg-gradient-to-br from-bangor-sun/10 to-bangor-sun/5 flex items-center justify-center">
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
                {species.iucn_id && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 bg-bangor-red/10 text-bangor-red">
                    IUCN
                  </span>
                )}
                {hasINatData && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 bg-bangor-sun/10 text-bangor-sun">
                    +iNat
                  </span>
                )}
              </div>
              <p className="text-sm italic text-slate-500 truncate">
                {species.scientific_name}
              </p>
            </div>
            <StatusBadge status={species.iucn_status} size="sm" />
          </div>

          {/* iNaturalist observations */}
          {hasINatData && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {species.observation_count > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-bangor-sun/10 text-bangor-sun rounded-full font-medium">
                     {species.observation_count.toLocaleString()} obs
                   </span>
                  )}
                  {species.last_observed && (
                   <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                     Last: {species.last_observed}
                   </span>
                )}
              </div>
              {species.inat_observations_csv_file_uri && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    (async () => {
                      const { base44 } = await import('@/api/base44Client');
                      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
                        file_uri: species.inat_observations_csv_file_uri
                      });
                      const a = document.createElement('a');
                      a.href = signed_url;
                      a.download = `${species.scientific_name.replace(/ /g, '_')}_inat_occurrences.csv`;
                      a.click();
                    })();
                  }}
                  className="w-full text-xs border-bangor-sun/30 text-bangor-sun hover:bg-bangor-sun/10"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download iNat CSV
                </Button>
              )}
            </div>
          )}

          {/* GBIF Summary */}
          {hasGBIFData && (
            <div className="mb-3 p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-semibold text-slate-700">GBIF Research Data</span>
              </div>
              
              {species.gbif_occurrence_count > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-600">📊</span>
                  <span className="text-xs font-medium text-slate-700">
                    {species.gbif_occurrence_count.toLocaleString()} Total Occurrences
                  </span>
                </div>
              )}

              {species.gbif_basis_of_record && Object.keys(species.gbif_basis_of_record).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="text-xs text-slate-600">🔬</span>
                  {Object.entries(species.gbif_basis_of_record)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([type, count]) => (
                      <span key={type} className="text-[10px] px-2 py-0.5 bg-white text-slate-600 rounded-full font-medium border border-slate-200">
                        {type}: {count}
                      </span>
                    ))}
                </div>
              )}

              {species.dataset_name && (
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs text-slate-600">📂</span>
                  <span className="text-[10px] text-slate-600 line-clamp-1 flex-1">
                    {species.dataset_name}
                  </span>
                </div>
              )}

              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetailsModal(true);
                }}
                className="w-full mt-2 text-xs bg-bangor-red hover:bg-bangor-red/90"
              >
                View Research Details
              </Button>
            </div>
          )}

          {/* IUCN data */}
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

          {/* Enrich with iNaturalist */}
          {!hasINatData && onEnrichWithINaturalist && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onEnrichWithINaturalist(species);
              }}
              className="w-full mb-3 text-xs border-bangor-sun/30 text-bangor-sun hover:bg-bangor-sun/10"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add iNaturalist Data
            </Button>
          )}

          {/* External Links */}
          <div className="mt-3 space-y-1">
            {species.iucn_id && (
              <>
              <a 
               href={`https://www.iucnredlist.org/species/${species.iucn_id}/${species.scientific_name.replace(/ /g, '-').toLowerCase()}`}
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-xs text-bangor-red font-medium"
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
                      className="text-xs px-2 py-1 bg-bangor-red/20 text-bangor-red rounded font-medium"
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
                      className="text-xs px-2 py-1 bg-bangor-sun/20 text-bangor-sun rounded font-medium"
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
                      className="text-xs px-2 py-1 bg-bangor-red/10 text-bangor-red rounded font-medium"
                      onClick={(e) => e.stopPropagation()}
                      title="Download Spatial Data from IUCN"
                    >
                      📍 SHP
                    </a>
                  )}
                  {species.search_summary_json && (
                    <button 
                      className="text-xs px-2 py-1 bg-bangor-sun/10 text-bangor-sun rounded font-medium"
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
                      className="text-xs px-2 py-1 bg-bangor-sun/15 text-bangor-sun rounded font-medium"
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
                   className="inline-flex items-center gap-1 text-xs text-bangor-sun font-medium"
                   onClick={(e) => e.stopPropagation()}
                 >
                   View on iNaturalist <ExternalLink className="w-3 h-3" />
                 </a>
                <div className="flex gap-1 mt-1">
                  <a 
                    href={`https://www.inaturalist.org/observations/export?taxon_id=${species.inat_taxon_id}&quality_grade=research`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-2 py-1 bg-bangor-sun/15 text-bangor-sun rounded font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📥 CSV
                  </a>
                  <a 
                    href={`https://www.inaturalist.org/observations?taxon_id=${species.inat_taxon_id}&quality_grade=research&verifiable=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-2 py-1 bg-bangor-sun/15 text-bangor-sun rounded font-medium"
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
                className="block text-xs text-slate-700 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                Wikipedia →
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* GBIF Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-bangor-red">
              GBIF Research Data: {species.scientific_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Occurrence Summary */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Occurrence Summary</h3>
              {species.gbif_occurrence_count > 0 && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-slate-700">Total Occurrences: </span>
                  <span className="text-sm text-slate-600">{species.gbif_occurrence_count.toLocaleString()}</span>
                </div>
              )}
              {species.gbif_last_occurrence && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-slate-700">Most Recent: </span>
                  <span className="text-sm text-slate-600">{species.gbif_last_occurrence}</span>
                </div>
              )}
            </div>

            {/* Basis of Record */}
            {species.gbif_basis_of_record && Object.keys(species.gbif_basis_of_record).length > 0 && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Data Quality & Types</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(species.gbif_basis_of_record)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center p-2 bg-white rounded border border-slate-200">
                        <span className="text-sm font-medium text-slate-700">{type}</span>
                        <span className="text-sm text-slate-600">{count.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Dataset Information */}
            {species.dataset_name && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Primary Dataset</h3>
                <p className="text-sm text-slate-600">{species.dataset_name}</p>
              </div>
            )}

            {/* Occurrence Records */}
            {species.gbif_occurrences && species.gbif_occurrences.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Sample Occurrence Records</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {species.gbif_occurrences.slice(0, 10).map((occ, idx) => (
                    <div key={idx} className="p-3 bg-white rounded border border-slate-200 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-medium text-slate-700">Location: </span>
                          <span className="text-slate-600">{occ.location || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Date: </span>
                          <span className="text-slate-600">{occ.date || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Type: </span>
                          <span className="text-slate-600">{occ.basis_of_record || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Institution: </span>
                          <span className="text-slate-600">{occ.institution || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External Links */}
            <div className="flex gap-2">
              {species.gbif_id && (
                <a 
                  href={`https://www.gbif.org/species/${species.gbif_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-bangor-red text-white rounded-lg text-center text-sm font-medium hover:bg-bangor-red/90"
                >
                  View on GBIF <ExternalLink className="w-3 h-3 inline ml-1" />
                </a>
              )}
              {species.gbif_occurrences_csv_file_uri && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={async () => {
                    const { base44 } = await import('@/api/base44Client');
                    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
                      file_uri: species.gbif_occurrences_csv_file_uri
                    });
                    window.open(signed_url, '_blank');
                  }}
                >
                  Download CSV <Download className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}