import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp, Map, BarChart3, AlertCircle, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import ResultsMapViewer from './ResultsMapViewer';
import MethodsVisualsPanel from './MethodsVisualsPanel';
import DiscussionVisualsPanel from './DiscussionVisualsPanel';

const SECTION_CONFIG = {
  abstract: {
    label: 'Abstract',
    hasVisuals: false,
  },
  introduction: {
    label: '1. Introduction',
    hasVisuals: true,
    visualTypes: ['range_map', 'species_overview'],
  },
  methods: {
    label: '2. Materials & Methods',
    hasVisuals: true,
    visualTypes: ['data_sources', 'variable_selection', 'spatial_thinning'],
    useCustomComponent: true,
  },
  results: {
    label: '3. Results',
    hasVisuals: true,
    visualTypes: ['range_map_interactive', 'hybridization_zones', 'climate_projection'],
    useCustomComponent: true,
  },
  discussion: {
    label: '4. Discussion',
    hasVisuals: true,
    visualTypes: ['climate_response', 'population_trends', 'threat_analysis'],
    useCustomComponent: true,
  },
  conclusion: {
    label: '5. Conclusion',
    hasVisuals: false,
  },
  references: {
    label: 'References',
    hasVisuals: false,
  },
};

// SVG mockup previews for each visual type
function MockupPreview({ type, genus }) {
  if (type === 'range_map' || type === 'suitability_map') {
    // Map mockup — South America outline with coloured blobs
    return (
      <svg viewBox="0 0 320 260" className="w-full max-h-52 rounded" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="260" fill="#d4e9f7" />
        {/* Rough SA landmass */}
        <path d="M90,10 L200,12 L240,40 L260,90 L250,160 L220,220 L180,250 L140,248 L100,220 L70,180 L60,120 L70,60 Z" fill="#c8d8a0" stroke="#8aaa50" strokeWidth="1.5" />
        {/* Atlantic Forest blob — species 1 */}
        <ellipse cx="210" cy="185" rx="28" ry="22" fill="#16a34a" fillOpacity="0.55" />
        {/* Amazon blob — species 2 */}
        <ellipse cx="140" cy="110" rx="38" ry="25" fill="#2563eb" fillOpacity="0.45" />
        {/* Cerrado blob — species 3 */}
        <ellipse cx="180" cy="155" rx="22" ry="18" fill="#d97706" fillOpacity="0.45" />
        {/* Overlap / hybrid zone */}
        <ellipse cx="195" cy="168" rx="14" ry="11" fill="#dc2626" fillOpacity="0.55" />
        {/* Occurrence dots */}
        {[[215,190],[208,182],[222,195],[205,200],[218,175],[140,108],[148,115],[133,105],[155,118],[180,158],[172,150],[188,162]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#1e293b" fillOpacity="0.7" />
        ))}
        {/* Legend */}
        <rect x="6" y="6" width="100" height="72" fill="white" fillOpacity="0.88" rx="4" />
        <circle cx="16" cy="18" r="5" fill="#16a34a" fillOpacity="0.7" />
        <text x="25" y="22" fontSize="8" fill="#1e293b">{genus} sp. 1 (EN)</text>
        <circle cx="16" cy="32" r="5" fill="#2563eb" fillOpacity="0.7" />
        <text x="25" y="36" fontSize="8" fill="#1e293b">{genus} sp. 2 (LC)</text>
        <circle cx="16" cy="46" r="5" fill="#d97706" fillOpacity="0.7" />
        <text x="25" y="50" fontSize="8" fill="#1e293b">{genus} sp. 3 (VU)</text>
        <circle cx="16" cy="60" r="5" fill="#dc2626" fillOpacity="0.7" />
        <text x="25" y="64" fontSize="8" fill="#dc2626">Hybrid zone</text>
        <circle cx="16" cy="74" r="2.5" fill="#1e293b" />
        <text x="25" y="77" fontSize="8" fill="#1e293b">Occurrence records</text>
        {/* Title */}
        <rect x="60" y="238" width="200" height="18" fill="white" fillOpacity="0.8" rx="3" />
        <text x="160" y="250" fontSize="9" fill="#334155" textAnchor="middle" fontWeight="bold">
          {type === 'suitability_map' ? `MAXENT Habitat Suitability — ${genus}` : `Species Range — ${genus}`}
        </text>
      </svg>
    );
  }

  if (type === 'climate_projection') {
    return (
      <svg viewBox="0 0 320 220" className="w-full max-h-48 rounded" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="220" fill="#fef3c7" />
        <text x="160" y="16" fontSize="9" fill="#92400e" textAnchor="middle" fontWeight="bold">Range Change 2050–2070 (SSP5-8.5)</text>
        {/* Baseline vs projected bars for 4 species */}
        {[
          { label: 'sp. 1', base: 120, proj50: 88, proj70: 62, x: 40 },
          { label: 'sp. 2', base: 95, proj50: 76, proj70: 55, x: 110 },
          { label: 'sp. 3', base: 70, proj50: 45, proj70: 28, x: 180 },
          { label: 'sp. 4', base: 140, proj50: 115, proj70: 90, x: 250 },
        ].map(({ label, base, proj50, proj70, x }) => (
          <g key={label}>
            <rect x={x} y={185 - base} width="16" height={base} fill="#64748b" fillOpacity="0.7" rx="2" />
            <rect x={x + 18} y={185 - proj50} width="16" height={proj50} fill="#f59e0b" fillOpacity="0.8" rx="2" />
            <rect x={x + 36} y={185 - proj70} width="16" height={proj70} fill="#dc2626" fillOpacity="0.8" rx="2" />
            <text x={x + 24} y={198} fontSize="8" fill="#334155" textAnchor="middle">{label}</text>
          </g>
        ))}
        {/* Axis */}
        <line x1="30" y1="185" x2="295" y2="185" stroke="#94a3b8" strokeWidth="1" />
        <line x1="30" y1="30" x2="30" y2="185" stroke="#94a3b8" strokeWidth="1" />
        <text x="10" y="188" fontSize="7" fill="#64748b">0</text>
        <text x="8" y="140" fontSize="7" fill="#64748b">50</text>
        <text x="8" y="90" fontSize="7" fill="#64748b">100</text>
        <text x="5" y="40" fontSize="7" fill="#64748b">140</text>
        <text x="12" y="107" fontSize="7" fill="#64748b" transform="rotate(-90,12,107)">Area (km² ×10³)</text>
        {/* Legend */}
        <rect x="30" y="204" width="260" height="14" fill="none" />
        <rect x="30" y="205" width="10" height="8" fill="#64748b" fillOpacity="0.7" rx="1" />
        <text x="43" y="212" fontSize="7" fill="#334155">Baseline (current)</text>
        <rect x="120" y="205" width="10" height="8" fill="#f59e0b" fillOpacity="0.8" rx="1" />
        <text x="133" y="212" fontSize="7" fill="#334155">2050</text>
        <rect x="175" y="205" width="10" height="8" fill="#dc2626" fillOpacity="0.8" rx="1" />
        <text x="188" y="212" fontSize="7" fill="#334155">2070</text>
      </svg>
    );
  }

  if (type === 'hybridization_zones' || type === 'species_overview') {
    return (
      <svg viewBox="0 0 320 200" className="w-full max-h-48 rounded" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="200" fill="#f0fdf4" />
        <text x="160" y="15" fontSize="9" fill="#166534" textAnchor="middle" fontWeight="bold">
          {type === 'hybridization_zones' ? 'Range Overlap & Hybridisation Risk' : `${genus} — Species Overview`}
        </text>
        {/* Venn-style overlapping ranges */}
        <ellipse cx="110" cy="100" rx="70" ry="55" fill="#16a34a" fillOpacity="0.25" stroke="#16a34a" strokeWidth="1.5" />
        <ellipse cx="165" cy="100" rx="70" ry="55" fill="#2563eb" fillOpacity="0.25" stroke="#2563eb" strokeWidth="1.5" />
        <ellipse cx="220" cy="100" rx="55" ry="45" fill="#d97706" fillOpacity="0.25" stroke="#d97706" strokeWidth="1.5" />
        {/* Overlap hatching */}
        <ellipse cx="137" cy="100" rx="30" ry="40" fill="#dc2626" fillOpacity="0.20" stroke="#dc2626" strokeWidth="1" strokeDasharray="3,2" />
        <text x="85" y="103" fontSize="8" fill="#166534" fontWeight="bold">sp. 1</text>
        <text x="148" y="86" fontSize="8" fill="#1d4ed8" fontWeight="bold">sp. 2</text>
        <text x="210" y="103" fontSize="8" fill="#92400e" fontWeight="bold">sp. 3</text>
        <text x="128" y="130" fontSize="7" fill="#dc2626" fontStyle="italic">contact zone</text>
        {/* Legend */}
        <rect x="6" y="155" width="308" height="38" fill="white" fillOpacity="0.85" rx="4" />
        <rect x="12" y="162" width="10" height="8" fill="#dc2626" fillOpacity="0.5" rx="1" />
        <text x="26" y="169" fontSize="7.5" fill="#334155">Predicted hybridisation zone (range overlap ≥ 15%)</text>
        <rect x="12" y="175" width="10" height="8" fill="#64748b" fillOpacity="0.4" rx="1" strokeDasharray="2,1" />
        <text x="26" y="182" fontSize="7.5" fill="#334155">Allopatric refugia — genetic isolation under SSP5-8.5</text>
      </svg>
    );
  }

  if (type === 'data_sources') {
    const species = [`${genus.slice(0,3)}. sp1`, `${genus.slice(0,3)}. sp2`, `${genus.slice(0,3)}. sp3`, `${genus.slice(0,3)}. sp4`];
    const sources = ['IUCN', 'GBIF', 'iNat', 'specLink'];
    const matrix = [[1,1,1,0],[1,1,0,1],[1,0,1,1],[1,1,1,1]];
    return (
      <svg viewBox="0 0 300 180" className="w-full max-h-44 rounded" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="180" fill="#f8fafc" />
        <text x="150" y="15" fontSize="9" fill="#334155" textAnchor="middle" fontWeight="bold">Data Completeness Matrix</text>
        {sources.map((src, j) => (
          <text key={src} x={95 + j * 44} y={36} fontSize="8" fill="#475569" textAnchor="middle" fontWeight="bold">{src}</text>
        ))}
        {species.map((sp, i) => (
          <g key={sp}>
            <text x={88} y={58 + i * 30} fontSize="7.5" fill="#334155" textAnchor="end" fontStyle="italic">{sp}</text>
            {sources.map((_, j) => (
              <rect key={j} x={73 + j * 44} y={44 + i * 30} width="28" height="20" rx="3"
                fill={matrix[i][j] ? '#16a34a' : '#e2e8f0'}
                fillOpacity={matrix[i][j] ? 0.75 : 1} />
            ))}
            {sources.map((_, j) => matrix[i][j] ? (
              <text key={j} x={87 + j * 44} y={58 + i * 30} fontSize="9" fill="white" textAnchor="middle">✓</text>
            ) : (
              <text key={j} x={87 + j * 44} y={58 + i * 30} fontSize="9" fill="#94a3b8" textAnchor="middle">–</text>
            ))}
          </g>
        ))}
        <rect x="40" y="160" width="220" height="14" fill="none" />
        <rect x="40" y="162" width="12" height="10" fill="#16a34a" fillOpacity="0.75" rx="2" />
        <text x="56" y="170" fontSize="7.5" fill="#334155">Data available</text>
        <rect x="130" y="162" width="12" height="10" fill="#e2e8f0" rx="2" />
        <text x="146" y="170" fontSize="7.5" fill="#334155">No data / gaps</text>
      </svg>
    );
  }

  if (type === 'occurrence_chart' || type === 'variable_selection') {
    const bars = type === 'occurrence_chart'
      ? [{ l: 'GBIF', v: 82 }, { l: 'iNat', v: 56 }, { l: 'specLink', v: 28 }, { l: 'IUCN', v: 18 }]
      : [{ l: 'BIO1', v: 88 }, { l: 'BIO12', v: 72 }, { l: 'BIO4', v: 55 }, { l: 'BIO15', v: 42 }, { l: 'BIO7', v: 30 }];
    const colors = ['#2563eb','#16a34a','#d97706','#7c3aed','#0891b2'];
    return (
      <svg viewBox="0 0 300 180" className="w-full max-h-44 rounded" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="180" fill="#f8fafc" />
        <text x="150" y="14" fontSize="9" fill="#334155" textAnchor="middle" fontWeight="bold">
          {type === 'occurrence_chart' ? 'Occurrence Records by Data Source' : 'Variable Importance (permutation %)'}
        </text>
        {bars.map(({ l, v }, i) => (
          <g key={l}>
            <rect x={28 + i * 52} y={155 - v} width="36" height={v} fill={colors[i]} fillOpacity="0.75" rx="3" />
            <text x={46 + i * 52} y={170} fontSize="7.5" fill="#475569" textAnchor="middle">{l}</text>
            <text x={46 + i * 52} y={152 - v} fontSize="7.5" fill={colors[i]} textAnchor="middle">{v}%</text>
          </g>
        ))}
        <line x1="18" y1="155" x2="290" y2="155" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="18" y1="30" x2="18" y2="155" stroke="#cbd5e1" strokeWidth="1" />
      </svg>
    );
  }

  // Fallback
  const Icon = BarChart3;
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center space-y-2">
      <Icon className="w-8 h-8 text-slate-400 mx-auto" />
      <p className="text-sm font-semibold text-slate-600">{type}</p>
      <p className="text-xs text-slate-400">Visual placeholder</p>
    </div>
  );
}

function VisualPlaceholder({ type, genus }) {
  const labels = {
    range_map: { title: 'Figure 1. Species Range Distribution', description: `Geographic ranges of all ${genus} species derived from IUCN spatial polygons and quality-filtered occurrence records (GBIF, iNaturalist).`, tag: 'Map · IUCN ranges + occurrence points' },
    hybridization_zones: { title: 'Figure 4. Predicted Hybridisation Contact Zones', description: `Pairwise range overlap analysis identifying areas of secondary contact where introgression or genetic swamping may occur under current and projected climates.`, tag: 'Map · Range intersection analysis' },
    occurrence_map: { title: 'Figure 2. Occurrence Point Density', description: 'Spatial distribution of all quality-filtered occurrence records across GBIF, iNaturalist, and speciesLink, following spatial thinning at 1 km resolution.', tag: 'Map · Occurrence density heatmap' },
    occurrence_chart: { title: 'Figure 3. Occurrence Records by Data Source', description: 'Contribution of each biodiversity database to the final filtered occurrence dataset used in MAXENT modelling.', tag: 'Bar chart · Data source breakdown' },
    suitability_map: { title: 'Figure 5. Current Habitat Suitability (MAXENT)', description: `MAXENT-derived habitat suitability for each ${genus} species under current bioclimatic conditions (WorldClim v2.1, 2.5 arcmin).`, tag: 'Map · MAXENT suitability surface' },
    climate_projection: { title: 'Figure 6. Projected Range Change 2050–2070 (SSP5-8.5)', description: 'Predicted gain and loss of suitable habitat area under high-emissions scenario, showing species-level vulnerability to climate change.', tag: 'Bar chart · Scenario comparison' },
    threat_analysis: { title: 'Figure 7. Integrated Threat Assessment Scores', description: 'Composite threat scores per species incorporating habitat loss rate, population trend, climate vulnerability, and protected area coverage.', tag: 'Radar/bar chart · Multi-factor threat index' },
    data_sources: { title: 'Table 1. Data Completeness Matrix', description: `Coverage of each ${genus} species across integrated data sources. Green = data available; grey = gap requiring targeted collection.`, tag: 'Matrix · Data completeness audit' },
    species_overview: { title: 'Figure 1b. Genus Taxonomy & Conservation Status', description: `Overview of all recognised ${genus} taxa, their IUCN categories, population trends, and geographic groupings (e.g. Atlantic Forest vs. Amazonian clades).`, tag: 'Chart · Taxonomy + IUCN status' },
    variable_selection: { title: 'Figure 3b. Environmental Variable Importance', description: 'Permutation importance (%) for the top bioclimatic predictors retained after VIF screening, showing the primary abiotic drivers of species distributions.', tag: 'Bar chart · Variable importance scores' },
  };

  const p = labels[type] || { title: type, description: 'Expected visual', tag: 'Chart / Map' };

  return (
    <div className="border-2 border-dashed border-blue-300 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Figure label */}
      <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-200">
        <span className="text-xs font-bold text-blue-800">{p.title}</span>
        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded font-medium">{p.tag}</span>
      </div>
      {/* Mockup preview */}
      <div className="px-4 pt-3 pb-1">
        <MockupPreview type={type} genus={genus} />
      </div>
      {/* Caption */}
      <div className="px-4 pb-3">
        <p className="text-xs text-slate-500 italic leading-relaxed">{p.description}</p>
        <p className="text-xs text-blue-500 font-semibold mt-1.5">⚙ Will be populated from live DataWinder data when connected</p>
      </div>
    </div>
  );
}

function VisualSection({ sectionKey, label, content, visuals, genus, defaultOpen = false }) {
   const [open, setOpen] = useState(defaultOpen || sectionKey === 'results' || sectionKey === 'discussion');
   const config = SECTION_CONFIG[sectionKey];
   const hasVisuals = config?.hasVisuals && config?.visualTypes && config.visualTypes.length > 0;

   return (
     <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm">
       <button
         onClick={() => setOpen(v => !v)}
         className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-50 to-slate-50 hover:from-blue-100 hover:to-slate-100 transition-colors border-b-2 border-slate-200"
       >
         <div className="flex items-center gap-3">
           <span className="text-sm font-bold text-slate-900">{label}</span>
           {hasVisuals && (
             <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-semibold">
               <Eye className="w-3 h-3" /> Visual Evidence
             </span>
           )}
         </div>
         {open ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
       </button>

       {open && (
         <div className="space-y-8 px-6 py-6 bg-white">
           {/* Text content */}
           {content && (
             <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed">
               <ReactMarkdown>{content}</ReactMarkdown>
             </div>
           )}

           {/* Visuals */}
           {hasVisuals && (
             <div className="space-y-5 border-t-2 border-slate-200 pt-8">
               {config.useCustomComponent && sectionKey === 'results' ? (
                 <ResultsMapViewer genus={genus} draft={{}} />
               ) : config.useCustomComponent && sectionKey === 'methods' ? (
                 <MethodsVisualsPanel genus={genus} />
               ) : config.useCustomComponent && sectionKey === 'discussion' ? (
                 <DiscussionVisualsPanel genus={genus} />
               ) : (
                 <>
                   <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-lg">
                     <Eye className="w-4 h-4" />
                     Visual Evidence & Maps
                   </div>
                   <div className="grid grid-cols-1 gap-6">
                     {config.visualTypes.map((vType, idx) => (
                       <VisualPlaceholder key={idx} type={vType} genus={genus} />
                     ))}
                   </div>
                 </>
               )}
             </div>
           )}
         </div>
       )}
     </div>
   );
 }

export default function VisualReportViewer({ draft }) {
  if (!draft) return null;
  const { title, sections, keywords, word_count, citation_style, genus } = draft;
  const sectionOrder = ['abstract', 'introduction', 'methods', 'results', 'discussion', 'conclusion', 'references'];

  return (
    <div className="space-y-4">
      {/* Title block */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 text-xs text-blue-700 font-medium mb-2">
          <Eye className="w-3.5 h-3.5" />
          Visual & Evidence Report
        </div>
        <h1 className="text-lg font-bold text-slate-900 leading-snug">{title}</h1>
        {keywords?.length > 0 && (
          <p className="text-xs text-slate-500 italic">
            <span className="font-semibold">Keywords:</span> {keywords.join(', ')}
          </p>
        )}
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400 mt-1">
          <span>Genus: <strong className="italic text-slate-600">{genus}</strong></span>
          <span>Style: <strong className="text-slate-600">{citation_style}</strong></span>
          {word_count && <span>~{word_count.toLocaleString()} words</span>}
        </div>
        <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-700 font-medium">
          ⚠ PRIVATE DEVELOPER DRAFT — AI-GENERATED, NOT FOR DISTRIBUTION
        </div>
        <p className="text-xs text-slate-500 mt-3 max-w-xl mx-auto">
          This visual report integrates academic text with geospatial evidence, occurrence data, threat analysis, and evolutionary context. Each section includes relevant maps and charts sourced from DataWinder's integrated databases.
        </p>
      </div>

      {/* Sections with visuals */}
      <div className="space-y-3">
        {sectionOrder.map((sKey, i) => (
          <VisualSection
            key={sKey}
            sectionKey={sKey}
            label={SECTION_CONFIG[sKey]?.label || sKey}
            content={sections?.[sKey]}
            genus={genus}
            defaultOpen={sKey === 'abstract' || sKey === 'results' || sKey === 'discussion'}
          />
        ))}
      </div>

      {/* Footer note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800 space-y-2">
        <p className="font-semibold">About this visual report</p>
        <p>
          This report template integrates academic writing with visual evidence from real DataWinder sources. 
          Map layers, occurrence points, hybridization zones, and threat scores are placeholders ready for integration with:
        </p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-700">
          <li><strong>ArcGIS Map layers</strong> — Species ranges, occurrence densities, climate projections</li>
          <li><strong>Hybridization Mapper</strong> — Range overlaps and secondary contact zones</li>
          <li><strong>Threat Assessment charts</strong> — IUCN status, habitat loss, climate vulnerability</li>
          <li><strong>Data Completeness matrix</strong> — Coverage by source and species</li>
        </ul>
      </div>
    </div>
  );
}