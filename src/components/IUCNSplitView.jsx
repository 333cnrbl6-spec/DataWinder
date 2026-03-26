import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ExternalLink, X, Upload, ArrowLeft, ChevronRight } from 'lucide-react';
import SmartDropZone from '@/components/SmartDropZone';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const FILE_TYPES = [
  {
    key: 'shp',
    label: 'Range Shapefile (.shp / .zip)',
    check: (sp, rangeMap) => !!(rangeMap[sp.id]?.range_shp_file_uri || rangeMap[sp.id]?.range_data_geojson),
    color: 'text-orange-700 bg-orange-50 border-orange-200',
  },
  {
    key: 'geojson',
    label: 'Range GeoJSON (.geojson)',
    check: (sp, rangeMap) => !!(rangeMap[sp.id]?.range_data_geojson || rangeMap[sp.id]?.range_geojson_file_uri),
    color: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    key: 'jpg',
    label: 'Range Map Image (.jpg)',
    check: (sp, rangeMap) => !!(rangeMap[sp.id]?.range_map_jpg_file_uri),
    color: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  {
    key: 'pdf',
    label: 'Assessment PDF (.pdf)',
    check: (sp, assessmentMap) => !!(assessmentMap[sp.id]?.assessment_pdf_file_uri),
    color: 'text-red-700 bg-red-50 border-red-200',
    usesAssessment: true,
  },
];

export default function IUCNSplitView({ species = [], rangeData = [], assessmentData = [], onClose, onUploaded }) {
  const [iucnUrl] = useState('https://www.iucnredlist.org/resources/spatial-data-download');
  const [expandedSpecies, setExpandedSpecies] = useState(null);
  const [showDropZone, setShowDropZone] = useState(false);

  const rangeMap = {};
  for (const r of rangeData) rangeMap[r.species_id] = r;
  const assessmentMap = {};
  for (const a of assessmentData) assessmentMap[a.species_id] = a;

  const speciesNeedingFiles = species.filter(sp =>
    FILE_TYPES.some(ft => ft.usesAssessment ? !ft.check(sp, assessmentMap) : !ft.check(sp, rangeMap))
  );
  const allDone = speciesNeedingFiles.length === 0;

  const totalFiles = species.length * FILE_TYPES.length;
  const completedFiles = species.reduce((acc, sp) => {
    return acc + FILE_TYPES.filter(ft =>
      ft.usesAssessment ? ft.check(sp, assessmentMap) : ft.check(sp, rangeMap)
    ).length;
  }, 0);
  const percent = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;

  const getSpeciesUrl = (sp) =>
    sp.iucn_id
      ? `https://www.iucnredlist.org/species/${sp.iucn_id}`
      : `https://www.iucnredlist.org/search?query=${encodeURIComponent(sp.scientific_name)}`;

  useEffect(() => {
    if (allDone && species.length > 0) {
      // Brief delay so user sees the "all done" state before auto-closing
      const t = setTimeout(onClose, 2500);
      return () => clearTimeout(t);
    }
  }, [allDone]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
        <Button size="sm" variant="ghost" className="text-white hover:bg-slate-700 gap-1.5" onClick={onClose}>
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </Button>
        <span className="text-slate-400 text-sm">|</span>
        <span className="text-white text-sm font-semibold">IUCN Manual Download Mode</span>
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-40 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-slate-300 text-xs">{percent}% complete</span>
          {allDone && (
            <Badge className="bg-green-500 text-white animate-pulse">All done! Returning…</Badge>
          )}
        </div>
      </div>

      {/* Split panes */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Checklist panel */}
        <div className="w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
            <p className="text-xs font-semibold text-amber-900">Download checklist</p>
            <p className="text-xs text-slate-500 mt-0.5">Expand a species to see what's missing. Use the guide on the right to download & import files.</p>
          </div>

          {/* Species list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {allDone ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-green-700 font-semibold text-sm">All files collected!</p>
                <p className="text-slate-400 text-xs mt-1">Returning to app…</p>
              </div>
            ) : (
              speciesNeedingFiles.map(sp => {
                const isExpanded = expandedSpecies === sp.id;
                const missingCount = FILE_TYPES.filter(ft =>
                  ft.usesAssessment ? !ft.check(sp, assessmentMap) : !ft.check(sp, rangeMap)
                ).length;

                return (
                  <div key={sp.id}>
                    <button
                      className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-slate-50 text-left"
                      onClick={() => setExpandedSpecies(isExpanded ? null : sp.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold italic text-slate-800 truncate">{sp.scientific_name}</div>
                        <div className="text-[10px] text-slate-400">{missingCount} file{missingCount !== 1 ? 's' : ''} needed</div>
                      </div>
                      <ChevronRight className={cn("w-3.5 h-3.5 text-slate-400 shrink-0 mt-1 transition-transform", isExpanded && "rotate-90")} />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-slate-50 border-t border-slate-100"
                        >
                          <div className="px-4 py-2 space-y-1.5">
                            {FILE_TYPES.map(ft => {
                              const done = ft.usesAssessment
                                ? ft.check(sp, assessmentMap)
                                : ft.check(sp, rangeMap);
                              return (
                                <div key={ft.key} className="flex items-center gap-2 text-xs">
                                  {done
                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                    : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                  }
                                  <span className={cn("flex-1", done && "line-through text-slate-400")}>
                                    {ft.label}
                                  </span>
                                  {done && <span className="text-[10px] text-green-600 font-medium">✓ in DB</span>}
                                </div>
                              );
                            })}
                            <a
                              href={getSpeciesUrl(sp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block mt-1"
                            >
                              <Button size="sm" variant="outline" className="w-full text-xs h-7">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Open on IUCN (new tab) →
                              </Button>
                            </a>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

          {/* Drop zone */}
          <div className="border-t border-slate-200 p-3 bg-white shrink-0">
            {!showDropZone ? (
              <Button
                size="sm"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => setShowDropZone(true)}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload downloaded files
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
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() => setShowDropZone(false)}
                >
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — IUCN navigation guide */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* URL bar — click to open in new tab */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 border-b border-slate-600 shrink-0">
            <Globe2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-300 truncate flex-1 font-mono">{iucnUrl}</span>
            <a href={iucnUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-6 px-3 text-xs gap-1">
                <ExternalLink className="w-3 h-3" /> Open IUCN in new tab
              </Button>
            </a>
          </div>

          {/* Main instruction area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Blocked notice */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 items-start">
              <span className="text-xl">⚠️</span>
              <div className="text-sm text-amber-900">
                <p className="font-semibold">IUCN blocks embedding</p>
                <p className="text-xs mt-0.5 text-amber-700">The IUCN Red List website cannot be shown inside the app. Use the <strong>"Open IUCN in new tab"</strong> button above, then follow the steps on the right.</p>
              </div>
            </div>

            {/* What the spatial data page actually offers */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <p className="font-semibold mb-1">ℹ️ How IUCN spatial downloads work</p>
              <p className="text-xs text-blue-800 leading-relaxed">
                The IUCN Spatial Data Download page offers <strong>bulk taxonomic downloads</strong> — e.g. one 815 MB ZIP for all Terrestrial Mammals. 
                It does <em>not</em> offer individual species shapefiles. 
                For <em>Callithrix</em>, the practical route is to download the full <strong>Terrestrial Mammals</strong> ZIP and extract the relevant species, 
                or visit each species page individually for the range map image and assessment PDF.
              </p>
            </div>

            {/* Step-by-step guide */}
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {[
                {
                  step: 1,
                  title: 'Log in to IUCN',
                  detail: 'You need a free registered account to download spatial data. Click Sign In at the top-right of the Red List site.',
                  action: { label: 'IUCN login page', url: 'https://www.iucnredlist.org/login' },
                  icon: '🔑',
                },
                {
                  step: 2,
                  title: 'Download Terrestrial Mammals bulk shapefile',
                  detail: 'On the Spatial Data Download page, find "Terrestrial Mammals" and click the polygon download link (815 MB ZIP). This single file contains range polygons for all terrestrial mammals including all Callithrix species.',
                  action: { label: 'Spatial Data Download page', url: 'https://www.iucnredlist.org/resources/spatial-data-download' },
                  icon: '📦',
                },
                {
                  step: 3,
                  title: 'Extract Callithrix layers from the ZIP',
                  detail: 'Unzip the downloaded file. Open the shapefile in QGIS or ArcGIS and filter by sci_name LIKE \'Callithrix%\' to extract only the relevant species polygons. Export each as a separate GeoJSON or SHP.',
                  action: null,
                  icon: '✂️',
                },
                {
                  step: 4,
                  title: 'Get range map image & assessment PDF per species',
                  detail: 'For the JPG map and assessment PDF, visit each species page directly using the quick-links below. On the species page: "View/Download" → Range Map Image (.jpg) and Assessment PDF.',
                  action: null,
                  icon: '🖼️',
                },
                {
                  step: 5,
                  title: 'Upload all files here',
                  detail: 'Drag your extracted GeoJSON/SHP files and any JPG/PDF files onto the "Upload downloaded files" button in the bottom-left panel. The checklist ticks off automatically as each file is detected in the database.',
                  action: null,
                  icon: '📂',
                },
              ].map(({ step, title, detail, action, icon }) => (
                <div key={step} className="flex gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{icon} {title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
                    {action && (
                      <a href={action.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:underline font-medium">
                        <ExternalLink className="w-3 h-3" /> {action.label}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick links per species still needing files */}
            {speciesNeedingFiles.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-700 mb-2">Quick links — jump to species on IUCN:</p>
                <div className="flex flex-wrap gap-2">
                  {speciesNeedingFiles.map(sp => (
                    <a
                      key={sp.id}
                      href={sp.iucn_id
                        ? `https://www.iucnredlist.org/species/${sp.iucn_id}`
                        : `https://www.iucnredlist.org/search?query=${encodeURIComponent(sp.scientific_name)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-100 text-xs italic text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors"
                    >
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      {sp.scientific_name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// inline icon since Globe2 isn't in older lucide
function Globe2({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}