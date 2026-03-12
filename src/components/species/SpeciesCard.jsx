import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Download, FileJson, FileText, Map, Database, Leaf, Globe, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from './StatusBadge';
import TrendIndicator from './TrendIndicator';
import { motion } from 'framer-motion';

async function downloadFile(fileUri, filename) {
  const { base44 } = await import('@/api/base44Client');
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri });
  const a = document.createElement('a');
  a.href = signed_url;
  a.download = filename;
  a.click();
}

function DataSourceBadge({ label, color }) {
  const colors = {
    iucn: 'bg-red-100 text-red-700 border-red-200',
    inat: 'bg-amber-100 text-amber-700 border-amber-200',
    gbif: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colors[color]}`}>
      {label}
    </span>
  );
}

function FileChip({ icon: Icon, label, onClick, href, color = 'slate' }) {
  const colorMap = {
    red: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
    amber: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
    blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
    green: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
    slate: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100',
  };
  const cls = `inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded border cursor-pointer transition-colors ${colorMap[color]}`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} onClick={e => e.stopPropagation()}>
        <Icon className="w-3 h-3" />
        {label}
      </a>
    );
  }
  return (
    <button className={cls} onClick={e => { e.stopPropagation(); onClick(); }}>
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

export default function SpeciesCard({ species, selected, onSelect, onEnrichWithINaturalist, index = 0, isNew }) {
  const [showModal, setShowModal] = useState(false);
  const [showThreats, setShowThreats] = useState(false);
  const safeName = species.scientific_name?.replace(/ /g, '_') || 'species';

  const hasIUCN = !!species.iucn_id;
  const hasINat = !!(species.inat_taxon_id || species.observation_count > 0);
  const hasGBIF = !!(species.gbif_id || species.gbif_occurrence_count > 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
      >
        <Card className={`relative overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${
          selected ? 'ring-2 ring-bangor-red shadow-md shadow-red-100 -translate-y-0.5' : 'shadow-sm hover:shadow-bangor-red/10'
        }`} onClick={() => setShowModal(true)}>

          {/* Selection checkbox */}
          <div className="absolute top-2.5 left-2.5 z-10" onClick={e => e.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={() => onSelect(species)}
              className="h-4 w-4 bg-white/90 backdrop-blur border-slate-300"
            />
          </div>

          {isNew && (
            <div className="absolute top-2.5 right-2.5 z-10">
              <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">NEW</span>
            </div>
          )}

          {/* Image */}
          {species.image_url ? (
            <div className="h-36 overflow-hidden bg-slate-100">
              <img src={species.image_url} alt={species.common_name || species.scientific_name}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
            </div>
          ) : (
            <div className="h-36 bg-gradient-to-br from-bangor-red/5 via-slate-100 to-bangor-sun/10 flex items-center justify-center">
              <Leaf className="w-10 h-10 text-bangor-red/20" />
            </div>
          )}

          <CardContent className="p-3.5">
            {/* Name & Status */}
            <div className="flex items-start justify-between gap-1 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 leading-snug truncate">
                  {species.common_name || 'No common name'}
                </p>
                <p className="text-xs italic text-slate-400 truncate mt-0.5">{species.scientific_name}</p>
              </div>
              <StatusBadge status={species.iucn_status} size="sm" />
            </div>

            {/* Data source badges */}
            <div className="flex flex-wrap gap-1 mb-2">
              {hasIUCN && <DataSourceBadge label="IUCN" color="iucn" />}
              {hasINat && <DataSourceBadge label="iNat" color="inat" />}
              {hasGBIF && <DataSourceBadge label="GBIF" color="gbif" />}
              {species.family && (
                <span className="text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded-full">{species.family}</span>
              )}
            </div>

            {/* Quick stats row */}
            <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-2">
              <TrendIndicator trend={species.population_trend} />
              {species.observation_count > 0 && (
                <span>{species.observation_count.toLocaleString()} obs</span>
              )}
              {species.gbif_occurrence_count > 0 && (
                <span>{species.gbif_occurrence_count.toLocaleString()} occ</span>
              )}
            </div>

            {/* Available files */}
            <div className="flex flex-wrap gap-1">
              {species.search_summary_file_uri && (
                <FileChip icon={FileJson} label="Summary" color="amber"
                  onClick={() => downloadFile(species.search_summary_file_uri, `${safeName}_summary.json`)} />
              )}
              {species.range_geojson_file_uri && (
                <FileChip icon={Map} label="GeoJSON" color="blue"
                  onClick={() => downloadFile(species.range_geojson_file_uri, `${safeName}_range.geojson`)} />
              )}
              {species.range_csv_file_uri && (
                <FileChip icon={Download} label="Range CSV" color="green"
                  onClick={() => downloadFile(species.range_csv_file_uri, `${safeName}_range.csv`)} />
              )}
              {species.inat_observations_csv_file_uri && (
                <FileChip icon={Download} label="iNat CSV" color="amber"
                  onClick={() => downloadFile(species.inat_observations_csv_file_uri, `${safeName}_inat.csv`)} />
              )}
              {species.gbif_occurrences_csv_file_uri && (
                <FileChip icon={Download} label="GBIF CSV" color="blue"
                  onClick={() => downloadFile(species.gbif_occurrences_csv_file_uri, `${safeName}_gbif.csv`)} />
              )}
              {species.assessment_pdf_file_uri ? (
                <FileChip icon={FileText} label="PDF" color="red"
                  onClick={() => downloadFile(species.assessment_pdf_file_uri, `${safeName}_assessment.pdf`)} />
              ) : species.assessment_pdf_url ? (
                <FileChip icon={FileText} label="PDF ↗" color="red" href={species.assessment_pdf_url} />
              ) : null}
              {species.range_map_jpg_file_uri ? (
                <FileChip icon={Map} label="Map" color="slate"
                  onClick={() => downloadFile(species.range_map_jpg_file_uri, `${safeName}_range_map.jpg`)} />
              ) : species.range_map_jpg_url ? (
                <FileChip icon={Map} label="Map ↗" color="slate" href={species.range_map_jpg_url} />
              ) : null}
              {species.range_shp_file_uri && (
                <FileChip icon={Download} label="SHP" color="green"
                  onClick={() => downloadFile(species.range_shp_file_uri, `${safeName}_range.zip`)} />
              )}
            </div>

            {/* View details prompt */}
            <p className="text-[10px] text-slate-300 mt-2.5 text-center tracking-wide uppercase font-medium">Click to view details</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Detail Modal ── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {species.common_name || species.scientific_name}
            </DialogTitle>
            <p className="text-sm italic text-slate-500">{species.scientific_name}</p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Hero image + status */}
            <div className="flex gap-4">
              {species.image_url ? (
                <img src={species.image_url} alt={species.scientific_name}
                  className="w-36 h-36 object-cover rounded-xl flex-shrink-0 shadow-md" />
              ) : (
                <div className="w-36 h-36 bg-gradient-to-br from-bangor-red/5 to-bangor-sun/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-12 h-12 text-bangor-red/20" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={species.iucn_status} size="md" showLabel />
                  <TrendIndicator trend={species.population_trend} />
                </div>
                {species.assessment_date && (
                  <p className="text-xs text-slate-500">Assessed: {new Date(species.assessment_date).getFullYear()}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {[species.kingdom, species.phylum, species.class_name, species.order_name, species.family, species.genus].filter(Boolean).map((t, i) => (
                    <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Distribution */}
            {species.geographic_distribution?.countries?.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                <div className="flex items-center gap-1 mb-1">
                  <Globe className="w-4 h-4 text-slate-600" />
                  <h4 className="text-sm font-semibold text-slate-700">Distribution</h4>
                  <span className="ml-auto text-xs text-slate-500">{species.geographic_distribution.countries.length} countries</span>
                </div>
                <p className="text-xs text-slate-600">{species.geographic_distribution.countries.join(', ')}</p>
              </div>
            )}

            {/* Population */}
            {species.population_details && (
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 mb-1.5">Population</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{species.population_details}</p>
              </div>
            )}

            {/* Habitat */}
            {species.habitat && (
              <div className="bg-green-50 rounded-xl p-3.5 border border-green-100">
                <h4 className="text-sm font-semibold text-green-800 mb-1.5">Habitat</h4>
                <p className="text-xs text-green-700 leading-relaxed">{species.habitat}</p>
              </div>
            )}

            {/* Threats (collapsible) */}
            {species.threats && (
              <div className="bg-red-50 rounded-xl p-3.5 border border-red-100">
                <button
                  className="flex items-center justify-between w-full"
                  onClick={() => setShowThreats(v => !v)}
                >
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <h4 className="text-sm font-semibold text-red-800">Threats</h4>
                  </div>
                  {showThreats ? <ChevronUp className="w-4 h-4 text-red-600" /> : <ChevronDown className="w-4 h-4 text-red-600" />}
                </button>
                {showThreats && <p className="text-xs text-red-700 mt-2">{species.threats}</p>}
              </div>
            )}

            {/* Status History */}
            {species.status_history?.length > 1 && (
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Status History</h4>
                <div className="flex flex-wrap gap-1.5">
                  {species.status_history.map((h, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded">
                      {h.year}: {h.status}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Observations */}
            {(species.observation_count > 0 || species.gbif_occurrence_count > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {species.observation_count > 0 && (
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-800 mb-0.5">iNaturalist</p>
                    <p className="text-lg font-bold text-amber-700">{species.observation_count.toLocaleString()}</p>
                    <p className="text-[10px] text-amber-600">observations</p>
                    {species.last_observed && <p className="text-[10px] text-amber-600 mt-1">Last: {species.last_observed}</p>}
                  </div>
                )}
                {species.gbif_occurrence_count > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-800 mb-0.5">GBIF</p>
                    <p className="text-lg font-bold text-blue-700">{species.gbif_occurrence_count.toLocaleString()}</p>
                    <p className="text-[10px] text-blue-600">occurrences</p>
                    {species.gbif_last_occurrence && <p className="text-[10px] text-blue-600 mt-1">Last: {species.gbif_last_occurrence}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Downloads */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <div className="flex items-center gap-1 mb-2">
                <Download className="w-4 h-4 text-slate-600" />
                <h4 className="text-sm font-semibold text-slate-700">Available Files</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {species.search_summary_file_uri && (
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => downloadFile(species.search_summary_file_uri, `${safeName}_summary.json`)}>
                    <FileJson className="w-3 h-3 mr-1" /> IUCN Summary JSON
                  </Button>
                )}
                {species.range_geojson_file_uri && (
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => downloadFile(species.range_geojson_file_uri, `${safeName}_range.geojson`)}>
                    <Map className="w-3 h-3 mr-1" /> Range GeoJSON
                  </Button>
                )}
                {species.range_csv_file_uri && (
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => downloadFile(species.range_csv_file_uri, `${safeName}_range.csv`)}>
                    <Download className="w-3 h-3 mr-1" /> Range Points CSV
                  </Button>
                )}
                {species.inat_observations_csv_file_uri && (
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => downloadFile(species.inat_observations_csv_file_uri, `${safeName}_inat.csv`)}>
                    <Download className="w-3 h-3 mr-1" /> iNat Observations CSV
                  </Button>
                )}
                {species.gbif_occurrences_csv_file_uri && (
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => downloadFile(species.gbif_occurrences_csv_file_uri, `${safeName}_gbif.csv`)}>
                    <Download className="w-3 h-3 mr-1" /> GBIF Occurrences CSV
                  </Button>
                )}
                {species.assessment_pdf_file_uri && (
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => downloadFile(species.assessment_pdf_file_uri, `${safeName}_assessment.pdf`)}>
                    <FileText className="w-3 h-3 mr-1" /> Assessment PDF (stored)
                  </Button>
                )}
                {species.range_map_jpg_file_uri && (
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => downloadFile(species.range_map_jpg_file_uri, `${safeName}_range_map.jpg`)}>
                    <Map className="w-3 h-3 mr-1" /> Range Map JPG (stored)
                  </Button>
                )}
                {species.range_shp_file_uri && (
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => downloadFile(species.range_shp_file_uri, `${safeName}_range.zip`)}>
                    <Download className="w-3 h-3 mr-1" /> Range SHP (stored)
                  </Button>
                )}
                {!species.inat_taxon_id && onEnrichWithINaturalist && (
                  <Button size="sm" className="text-xs h-7 bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => { setShowModal(false); onEnrichWithINaturalist(species); }}>
                    + Add iNaturalist Data
                  </Button>
                )}
              </div>
              {/* External reference links */}
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-200">
                {species.iucn_id && (
                  <a href={`https://www.iucnredlist.org/species/${species.iucn_id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-red-600 font-medium flex items-center gap-1 hover:underline">
                    IUCN Red List <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {species.assessment_pdf_url && (
                  <a href={species.assessment_pdf_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-slate-600 font-medium flex items-center gap-1 hover:underline">
                    Assessment PDF <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {species.range_map_jpg_url && (
                  <a href={species.range_map_jpg_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-slate-600 font-medium flex items-center gap-1 hover:underline">
                    Range Map <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {species.range_data_shp_url && (
                  <a href={species.range_data_shp_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-green-700 font-medium flex items-center gap-1 hover:underline">
                    Range SHP Download <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {species.range_data_csv_url && species.range_data_csv_url !== 'available' && (
                  <a href={species.range_data_csv_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-green-700 font-medium flex items-center gap-1 hover:underline">
                    Range CSV Download <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {species.inat_taxon_id && (
                  <a href={`https://www.inaturalist.org/taxa/${species.inat_taxon_id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-amber-600 font-medium flex items-center gap-1 hover:underline">
                    iNaturalist <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {species.gbif_id && (
                  <a href={`https://www.gbif.org/species/${species.gbif_id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline">
                    GBIF <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {species.inat_wikipedia_url && (
                  <a href={species.inat_wikipedia_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-slate-600 font-medium flex items-center gap-1 hover:underline">
                    Wikipedia <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {species.iucn_id && (
                <p className="text-[10px] text-slate-400 italic mt-2">
                  IUCN 2025. IUCN Red List of Threatened Species. Version 2025-2 — www.iucnredlist.org
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}