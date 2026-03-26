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

function VisualPlaceholder({ type, genus }) {
  const placeholders = {
    range_map: {
      title: 'Species Range Distribution',
      icon: Map,
      description: `Geographic distribution of ${genus} species derived from IUCN spatial data and occurrence records.`,
    },
    hybridization_zones: {
      title: 'Potential Hybridization Zones',
      icon: AlertCircle,
      description: `Areas where two or more ${genus} species ranges overlap, creating opportunities for secondary contact and gene flow.`,
    },
    occurrence_map: {
      title: 'Occurrence Point Density',
      icon: Map,
      description: 'Distribution of field observations and museum specimens from iNaturalist, GBIF, and speciesLink databases.',
    },
    occurrence_chart: {
      title: 'Occurrence Records by Source',
      icon: BarChart3,
      description: 'Comparative contribution of data sources: GBIF, iNaturalist, speciesLink, IUCN assessments.',
    },
    suitability_map: {
      title: 'Climate Suitability Projection (Current)',
      icon: Map,
      description: 'MAXENT habitat suitability model output showing predicted suitable areas under current climate conditions.',
    },
    climate_projection: {
      title: 'Climate Change Scenario (2050 SSP5-8.5)',
      icon: Map,
      description: 'Projected suitable area under high emissions scenario, illustrating range contraction/expansion.',
    },
    threat_analysis: {
      title: 'Integrated Threat Assessment',
      icon: BarChart3,
      description: 'Multi-factor threat scoring: habitat loss, climate vulnerability, population decline, protection gaps.',
    },
    data_sources: {
      title: 'Data Completeness Matrix',
      icon: BarChart3,
      description: `Coverage of ${genus} species across all integrated data sources (IUCN, GBIF, iNaturalist, speciesLink).`,
    },
    species_overview: {
      title: 'Genus Overview & Taxonomy',
      icon: BarChart3,
      description: `Summary of all ${genus} species, conservation statuses, population trends, and key ecological niches.`,
    },
  };

  const p = placeholders[type] || { title: type, description: 'Visual placeholder', icon: BarChart3 };
  const Icon = p.icon;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-solid border-blue-300 rounded-lg p-8 text-center space-y-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-center">
        <div className="p-4 bg-blue-200/40 rounded-xl">
          <Icon className="w-8 h-8 text-blue-600" />
        </div>
      </div>
      <div>
        <h4 className="text-base font-bold text-slate-900">{p.title}</h4>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-sm mx-auto">{p.description}</p>
      </div>
      <div className="text-xs text-blue-700 italic font-medium pt-2">
        📊 Interactive visualization — Maps, Charts, Density Plots
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