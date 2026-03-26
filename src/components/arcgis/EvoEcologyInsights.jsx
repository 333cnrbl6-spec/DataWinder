/**
 * EvoEcologyInsights — Evolutionary Ecology context panel
 * Explains Island Biogeography and Hybridization Zone theory
 * in the context of the currently selected species and climate scenario.
 */
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Info, Layers, Leaf, FlaskConical, GitMerge, ChevronDown, ChevronUp } from 'lucide-react';

const THEORIES = [
  {
    id: 'island_biogeography',
    icon: Leaf,
    color: 'emerald',
    title: 'Island Biogeography',
    subtitle: 'MacArthur & Wilson (1967)',
    badge: 'Isolation → Speciation',
    summary: `When climate change fragments previously continuous habitat into isolated "islands" of suitable conditions, populations become reproductively isolated. Over generations, genetic drift and local adaptation drive divergence — the same process that creates species on oceanic islands now operates in mountain refugia, forest fragments, and isolated river valleys.`,
    climate_link: `Under SSP5-8.5 projections, many primate ranges will contract into fragmented refugia by 2070. Each isolated fragment becomes a de-facto evolutionary island. Smaller fragments experience faster allele fixation (genetic drift) and reduced adaptive potential — species most at risk are those whose future suitable habitat consists of several small, disconnected patches rather than one large contiguous range.`,
    key_concepts: [
      'Species-area relationship: smaller islands hold fewer species',
      'Immigration-extinction equilibrium determines island species richness',
      'Habitat fragmentation mimics oceanic isolation for terrestrial species',
      'Genetic bottlenecks in isolated populations accelerate drift',
      'Edge effects reduce effective habitat area beyond geometric loss',
    ],
    references: [
      'MacArthur, R.H. and Wilson, E.O. (1967) The Theory of Island Biogeography. Princeton: Princeton University Press.',
      'Hanski, I. (1998) Metapopulation dynamics. Nature, 396, 41–49.',
    ]
  },
  {
    id: 'hybrid_speciation',
    icon: FlaskConical,
    color: 'purple',
    title: 'Speciation via Hybridization',
    subtitle: 'Mallet (2007); Abbott et al. (2013)',
    badge: 'Contact Zones → New Lineages',
    summary: `Where the ranges of two closely related species meet — the hybridization zone — cross-species mating can produce offspring with novel genetic combinations. Rather than being evolutionary dead-ends, some hybrid lineages gain fitness advantages (heterosis) and can establish as new species, particularly when colonising niches neither parent occupies. This is homoploid hybrid speciation.`,
    climate_link: `Climate-driven range shifts create new species contact zones as previously allopatric taxa track their climate envelopes poleward or upslope. The hybridization zone for many primate genera (e.g. Callithrix jacchus × C. penicillata) is already documented and is predicted to expand northward and to higher elevations under warming scenarios. Monitoring these shifting contact zones is critical — they represent either evolutionary opportunity or genetic swamping of rarer taxa.`,
    key_concepts: [
      'Secondary contact zones form when previously isolated lineages range-shift into contact',
      'Hybrid zones can be stable (tension zones) or moving (moving waves)',
      'Introgression can transfer adaptive alleles between lineages faster than de novo mutation',
      'Homoploid hybrid speciation produces new diploid species without polyploidy',
      'Reproductive isolation is a continuum — partial barriers allow adaptive gene flow',
    ],
    references: [
      'Mallet, J. (2007) Hybrid speciation. Nature, 446, 279–283.',
      'Abbott, R. et al. (2013) Hybridization and speciation. Journal of Evolutionary Biology, 26(2), 229–246.',
      'Aguiar, L.M. et al. (2008) Callithrix penicillata × C. jacchus hybrid zone. American Journal of Primatology, 70(2), 119–127.',
    ]
  },
  {
    id: 'reticulate_evolution',
    icon: GitMerge,
    color: 'blue',
    title: 'Reticulate Evolution',
    subtitle: 'Arnold (1997); Mallet (2007); Fontaine et al. (2015)',
    badge: 'Web of Life → Network Phylogeny',
    summary: `Reticulate evolution describes evolutionary history where lineages do not simply branch (as in a classical bifurcating tree) but also merge — through hybridisation, introgression, horizontal gene transfer, or endosymbiosis. The result is a phylogenetic network or "web of life" rather than a tree. In sexually reproducing organisms, reticulation occurs when hybrid offspring between two lineages successfully back-cross or establish, weaving the genetic histories of previously separate lineages together.`,
    climate_link: `As climate change forces species ranges to shift and overlap, the frequency of reticulate events is predicted to increase. Species that were geographically isolated for millennia suddenly share range space, increasing the probability of hybridisation and introgressive reticulation. For primates like Callithrix, whose hybrid zones are already active, warming may dramatically increase the spatial extent and frequency of reticulate evolutionary events — making traditional bifurcating phylogenies insufficient to describe their evolutionary history.`,
    key_concepts: [
      'Phylogenetic networks (not trees) are required to depict reticulate histories',
      'Introgressive hybridisation transfers adaptive alleles across lineage boundaries',
      'Ancient reticulation events may be invisible in modern genomes (deep reticulation)',
      'Reticulation accelerates adaptation by combining divergent gene pools',
      'Distinguishes from convergent evolution: shared ancestry, not just similar trait',
      'IUCN taxonomy struggles with reticulate taxa — species boundaries become porous',
    ],
    references: [
      'Arnold, M.L. (1997) Natural Hybridization and Evolution. Oxford: Oxford University Press.',
      'Mallet, J. (2007) Hybrid speciation. Nature, 446, 279–283.',
      'Fontaine, M.C. et al. (2015) Extensive introgression in a malaria vector species complex revealed by phylogenomics. Science, 347, 1258524.',
      'Huson, D.H. and Bryant, D. (2006) Application of phylogenetic networks in evolutionary studies. Molecular Biology and Evolution, 23(2), 254–267.',
    ]
  }
];

function TheoryCard({ theory }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = theory.icon;
  const colorMap = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', badgeCls: 'bg-emerald-100 text-emerald-700', iconCls: 'text-emerald-600', titleCls: 'text-emerald-800', dotBg: 'bg-emerald-500' },
    purple:  { bg: 'bg-purple-50',  border: 'border-purple-200',  badgeCls: 'bg-purple-100 text-purple-700',   iconCls: 'text-purple-600',  titleCls: 'text-purple-800',  dotBg: 'bg-purple-500'  },
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    badgeCls: 'bg-blue-100 text-blue-700',       iconCls: 'text-blue-600',    titleCls: 'text-blue-800',    dotBg: 'bg-blue-500'    },
  };
  const c = colorMap[theory.color];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:brightness-95 transition-all"
      >
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${c.iconCls}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-bold ${c.titleCls}`}>{theory.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badgeCls}`}>{theory.badge}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{theory.subtitle}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Theory</p>
            <p className="text-xs text-slate-700 leading-relaxed">{theory.summary}</p>
          </div>

          <div className={`rounded-lg p-3 border ${c.border} bg-white/60`}>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Climate Change Relevance
            </p>
            <p className="text-xs text-slate-700 leading-relaxed">{theory.climate_link}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Key Concepts</p>
            <ul className="space-y-1">
              {theory.key_concepts.map((k, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${c.dotBg}`} />
                  {k}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Key References</p>
            {theory.references.map((r, i) => (
              <p key={i} className="text-xs text-slate-400 italic leading-relaxed">{r}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EvoEcologyInsights({ activeSpeciesCount = 0, selectedScenario = '' }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-slate-400" />
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Evolutionary Ecology Context</h3>
      </div>

      {activeSpeciesCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          <strong>{activeSpeciesCount} species</strong> selected
          {selectedScenario && <> · Scenario: <strong>{selectedScenario}</strong></>}
          . The theories below apply directly to the range shifts visible on the map.
        </div>
      )}

      {THEORIES.map(theory => (
        <TheoryCard key={theory.id} theory={theory} />
      ))}

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-600">Synthesis for SDM outputs</p>
        <p>When interpreting MAXENT habitat suitability projections, consider: (1) whether future suitable patches are large enough and connected enough to maintain viable populations (island biogeography), (2) whether contracting ranges of related species will overlap, creating new hybridisation contact zones (hybrid speciation), and (3) whether those hybridisation events result in reticulate evolutionary histories — lineages that merge rather than simply branch — which renders standard bifurcating phylogenies incomplete and IUCN species boundaries potentially misleading.</p>
      </div>
    </div>
  );
}