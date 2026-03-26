/**
 * EvolutionaryContextPanel — shows in AcademicPaperLab alongside a draft
 * Summarises what the generated paper says about:
 *   - Island biogeography / habitat fragmentation
 *   - Hybridisation zones / speciation
 *   - Climate-driven range shifts
 * And links to the relevant ArcGIS map tools.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Leaf, FlaskConical, Thermometer, GitMerge, Map, ExternalLink } from 'lucide-react';

const CONCEPTS = [
  {
    icon: Leaf,
    color: 'emerald',
    title: 'Island Biogeography',
    authors: 'MacArthur & Wilson, 1967',
    howIncluded: 'Habitat fragmentation under climate projections creates de-facto islands of suitable range. Paper discusses patch size, connectivity and extinction risk.',
    mapLink: '/ArcGISTools',
    mapLabel: 'View Climate + Range overlay →',
  },
  {
    icon: FlaskConical,
    color: 'purple',
    title: 'Hybridisation & Speciation',
    authors: 'Mallet, 2007; Abbott et al., 2013',
    howIncluded: 'Climate-driven range shifts generate new species contact zones. Hybridisation zone mapping in ArcGIS Tools identifies where introgression or hybrid speciation may occur.',
    mapLink: '/ArcGISTools',
    mapLabel: 'Open Hybridization Mapper →',
  },
  {
    icon: Thermometer,
    color: 'red',
    title: 'Climate-Driven Range Shifts',
    authors: 'CMIP6 SSP2-4.5 / SSP5-8.5',
    howIncluded: 'Future habitat suitability loss quantified under two IPCC emissions scenarios to 2050 and 2070, feeding directly into conservation risk scoring.',
    mapLink: '/ArcGISTools',
    mapLabel: 'Open Climate Projection overlay →',
  },
  {
    icon: GitMerge,
    color: 'blue',
    title: 'Reticulate Evolution',
    authors: 'Arnold, 1997; Fontaine et al., 2015',
    howIncluded: 'The paper discusses how climate-driven range shifts increase the frequency of reticulate events — lineages merging via hybridisation and introgression — requiring phylogenetic networks rather than trees, and complicating IUCN species delimitation.',
    mapLink: '/ArcGISTools',
    mapLabel: 'Open Hybridization Mapper →',
  },
];

const colorMap = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  purple:  { bg: 'bg-purple-50',  border: 'border-purple-200',  icon: 'text-purple-600',  badge: 'bg-purple-100 text-purple-700'  },
  red:     { bg: 'bg-red-50',     border: 'border-red-200',     icon: 'text-red-600',     badge: 'bg-red-100 text-red-700'       },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    icon: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700'     },
};

export default function EvolutionaryContextPanel({ genus }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Map className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-700">Evolutionary Ecology Frameworks</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          The generated paper incorporates the following evolutionary ecology theories that are fundamental to interpreting climate-driven biodiversity change for <em>{genus}</em>.
        </p>

        {CONCEPTS.map((c, i) => {
          const col = colorMap[c.color];
          const Icon = c.icon;
          return (
            <div key={i} className={`rounded-lg border ${col.border} ${col.bg} p-3 space-y-1.5`}>
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 shrink-0 ${col.icon}`} />
                <span className="text-xs font-bold text-slate-700">{c.title}</span>
                <Badge className={`text-xs py-0 px-1.5 ${col.badge} ml-auto`}>{c.authors}</Badge>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{c.howIncluded}</p>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 text-xs px-2 gap-1 ${col.icon}`}
                onClick={() => window.open(c.mapLink, '_blank')}
              >
                <ExternalLink className="w-3 h-3" />
                {c.mapLabel}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}