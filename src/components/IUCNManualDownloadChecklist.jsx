import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ExternalLink, X, ChevronDown, ChevronUp, Upload, Columns, StickyNote } from 'lucide-react';
import SmartDropZone from '@/components/SmartDropZone';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const FILE_TYPES = [
  {
    key: 'shp',
    label: 'Range SHP (shapefile)',
    description: 'Polygon boundaries ZIP',
    check: (sp, rangeMap) => !!(rangeMap[sp.id]?.range_shp_file_uri || rangeMap[sp.id]?.range_data_geojson),
    iucnPath: (iucnId) => `https://www.iucnredlist.org/species/spatial-data/${iucnId}`,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    key: 'geojson',
    label: 'Range GeoJSON',
    description: 'Vector polygon data',
    check: (sp, rangeMap) => !!(rangeMap[sp.id]?.range_data_geojson || rangeMap[sp.id]?.range_geojson_file_uri),
    iucnPath: null,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    key: 'jpg',
    label: 'Range Map JPG',
    description: 'Static range image',
    check: (sp, rangeMap) => !!(rangeMap[sp.id]?.range_map_jpg_file_uri),
    iucnPath: (iucnId) => `https://www.iucnredlist.org/species/map/${iucnId}`,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    key: 'pdf',
    label: 'Assessment PDF',
    description: 'Full IUCN assessment',
    check: (sp, assessmentMap) => !!(assessmentMap[sp.id]?.assessment_pdf_file_uri),
    iucnPath: (iucnId, assessmentId) => assessmentId
      ? `https://www.iucnredlist.org/documents/redlist/assessments/en/${assessmentId}.pdf`
      : `https://www.iucnredlist.org/species/pdf/${iucnId}`,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
];

export default function IUCNManualDownloadChecklist({ species = [], rangeData = [], assessmentData = [], onUploaded, onOpenSplitView }) {
  const [open, setOpen] = useState(true);
  const [showDropZone, setShowDropZone] = useState(false);
  const [expandedSpecies, setExpandedSpecies] = useState(null);

  // Build lookup maps: species_id → record
  const rangeMap = {};
  for (const r of rangeData) rangeMap[r.species_id] = r;
  const assessmentMap = {};
  for (const a of assessmentData) assessmentMap[a.species_id] = a;

  // Only show species missing at least one file
  const speciesNeedingFiles = species.filter(sp => {
    const shpDone = FILE_TYPES[0].check(sp, rangeMap);
    const geojsonDone = FILE_TYPES[1].check(sp, rangeMap);
    const jpgDone = FILE_TYPES[2].check(sp, rangeMap);
    const pdfDone = FILE_TYPES[3].check(sp, assessmentMap);
    return !(shpDone && geojsonDone && jpgDone && pdfDone);
  });

  const totalMissing = speciesNeedingFiles.reduce((acc, sp) => {
    return acc + FILE_TYPES.filter(ft =>
      ft.key !== 'pdf'
        ? !ft.check(sp, rangeMap)
        : !ft.check(sp, assessmentMap)
    ).length;
  }, 0);

  if (species.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-6 right-6 z-50 w-96 max-h-[80vh] flex flex-col shadow-2xl rounded-xl border border-amber-200 bg-white overflow-hidden"
    >
      {/* Header / toggle */}
      <div
        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 cursor-pointer select-none"
        onClick={() => setOpen(v => !v)}
      >
        <StickyNote className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="font-semibold text-amber-900 text-sm flex-1">IUCN Manual Download Checklist</span>
        {totalMissing > 0 && (
          <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0">{totalMissing} missing</Badge>
        )}
        {totalMissing === 0 && (
          <Badge className="bg-green-500 text-white text-xs px-1.5 py-0">All complete ✓</Badge>
        )}
        <button className="text-amber-500 hover:text-amber-700 ml-1">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden flex flex-col"
          >
            {/* Instructions + split view button */}
            <div className="px-4 py-2 bg-amber-50/60 border-b border-amber-100 text-xs text-slate-600 space-y-2">
              <p>Log in to <a href="https://www.iucnredlist.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">iucnredlist.org</a>, download the files below, then drop them here.</p>
              <Button
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-7 text-xs"
                onClick={onOpenSplitView}
              >
                <Columns className="w-3.5 h-3.5" />
                Open Split View (IUCN + Checklist)
              </Button>
            </div>

            {/* Species list */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100" style={{ maxHeight: '340px' }}>
              {speciesNeedingFiles.length === 0 ? (
                <div className="p-4 text-center text-sm text-green-700">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  All species have complete IUCN file data!
                </div>
              ) : (
                speciesNeedingFiles.map(sp => {
                  const isExpanded = expandedSpecies === sp.id;
                  const iucnId = sp.iucn_id;
                  const assessmentId = sp.assessment_id;

                  return (
                    <div key={sp.id}>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 text-left"
                        onClick={() => setExpandedSpecies(isExpanded ? null : sp.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-800 truncate italic">{sp.scientific_name}</div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {FILE_TYPES.map(ft => {
                              const done = ft.key !== 'pdf'
                                ? ft.check(sp, rangeMap)
                                : ft.check(sp, assessmentMap);
                              return (
                                <span
                                  key={ft.key}
                                  className={cn(
                                    'text-[10px] px-1.5 py-0 rounded font-medium border',
                                    done
                                      ? 'line-through text-slate-400 border-slate-200 bg-slate-50'
                                      : `${ft.color} border-current ${ft.bgColor}`
                                  )}
                                >
                                  {ft.key.toUpperCase()}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform", isExpanded && "rotate-180")} />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-slate-50 border-t border-slate-100"
                          >
                            <div className="px-3 py-2 space-y-1.5">
                              {FILE_TYPES.map(ft => {
                                const done = ft.key !== 'pdf'
                                  ? ft.check(sp, rangeMap)
                                  : ft.check(sp, assessmentMap);
                                const url = ft.iucnPath ? ft.iucnPath(iucnId, assessmentId) : null;

                                return (
                                  <div key={ft.key} className="flex items-center gap-2 text-xs">
                                    {done
                                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                      : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                    }
                                    <span className={cn("flex-1", done && "line-through text-slate-400")}>
                                      <span className="font-medium">{ft.label}</span>
                                      <span className="text-slate-400 ml-1">— {ft.description}</span>
                                    </span>
                                    {!done && url && iucnId && (
                                      <a href={url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-3 h-3 text-blue-500 hover:text-blue-700" />
                                      </a>
                                    )}
                                    {done && <span className="text-green-500 font-medium">✓ in DB</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drop zone toggle */}
            <div className="border-t border-slate-200 p-3">
              {!showDropZone ? (
                <Button
                  size="sm"
                  onClick={() => setShowDropZone(true)}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Drop downloaded files here
                </Button>
              ) : (
                <div className="space-y-2">
                  <SmartDropZone
                    onImported={() => {
                      setShowDropZone(false);
                      onUploaded?.();
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => setShowDropZone(false)}
                  >
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}