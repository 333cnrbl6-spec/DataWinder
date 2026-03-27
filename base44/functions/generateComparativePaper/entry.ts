/**
 * generateComparativePaper — DEVELOPER ONLY
 *
 * Fetches live data for two taxa simultaneously and generates
 * a comparative academic analysis with side-by-side metrics.
 * ADMIN ONLY.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const REGION_MAP = {
  Papio: 'sub-Saharan Africa and the Arabian Peninsula',
  Gorilla: 'Central Africa and the Congo Basin',
  Pan: 'Central and West Africa',
  Pongo: 'Borneo and Sumatra, Southeast Asia',
  Macaca: 'Asia, from Japan to the Maghreb',
  Callithrix: 'Brazil — Atlantic Forest, Cerrado, and Caatinga biomes',
  Callitrichidae: 'Neotropical forests of South and Central America',
};

const FALLBACK_SPECIES = {
  Papio: [
    { name: 'Papio ursinus', status: 'LC', trend: 'stable' },
    { name: 'Papio anubis', status: 'LC', trend: 'stable' },
    { name: 'Papio hamadryas', status: 'LC', trend: 'decreasing' },
    { name: 'Papio kindae', status: 'LC', trend: 'unknown' },
    { name: 'Papio cynocephalus', status: 'LC', trend: 'decreasing' },
    { name: 'Papio papio', status: 'NT', trend: 'decreasing' },
  ],
  Gorilla: [
    { name: 'Gorilla gorilla', status: 'CR', trend: 'decreasing' },
    { name: 'Gorilla beringei', status: 'EN', trend: 'increasing' },
  ],
  Pan: [
    { name: 'Pan troglodytes', status: 'EN', trend: 'decreasing' },
    { name: 'Pan paniscus', status: 'EN', trend: 'decreasing' },
  ],
  Pongo: [
    { name: 'Pongo pygmaeus', status: 'CR', trend: 'decreasing' },
    { name: 'Pongo abelii', status: 'CR', trend: 'decreasing' },
    { name: 'Pongo tapanuliensis', status: 'CR', trend: 'decreasing' },
  ],
  Macaca: [
    { name: 'Macaca mulatta', status: 'LC', trend: 'stable' },
    { name: 'Macaca fascicularis', status: 'VU', trend: 'decreasing' },
    { name: 'Macaca sylvanus', status: 'EN', trend: 'decreasing' },
  ],
  Callithrix: [
    { name: 'Callithrix jacchus', status: 'LC', trend: 'stable' },
    { name: 'Callithrix penicillata', status: 'LC', trend: 'stable' },
    { name: 'Callithrix aurita', status: 'EN', trend: 'decreasing' },
  ],
  Callitrichidae: [
    { name: 'Callithrix jacchus', status: 'LC', trend: 'stable' },
    { name: 'Callithrix aurita', status: 'EN', trend: 'decreasing' },
    { name: 'Cebuella pygmaea', status: 'VU', trend: 'decreasing' },
    { name: 'Saguinus oedipus', status: 'CR', trend: 'decreasing' },
    { name: 'Leontopithecus rosalia', status: 'EN', trend: 'stable' },
    { name: 'Mico argentatus', status: 'LC', trend: 'stable' },
  ],
};

async function fetchTaxonData(taxon, rank, iucnToken) {
  const data = { iucn: null, inat: null, gbif: null };

  // IUCN
  try {
    const endpoint = rank === 'family'
      ? `https://api.iucnredlist.org/api/v4/taxa/family/${encodeURIComponent(taxon)}`
      : `https://api.iucnredlist.org/api/v4/taxa/genus/${encodeURIComponent(taxon)}`;
    const r = await fetch(endpoint, { headers: { Authorization: `Bearer ${iucnToken}`, Accept: 'application/json' } });
    if (r.ok) {
      const j = await r.json();
      const species = (j.assessments || []).map(s => ({
        name: s.taxon_scientific_name, status: s.red_list_category_code,
        trend: s.population_trend?.description || 'unknown', iucn_id: s.sis_taxon_id
      }));
      if (species.length > 0) data.iucn = { species, count: species.length };
    }
  } catch (e) { /* silent */ }

  if (!data.iucn || data.iucn.count === 0) {
    const species = FALLBACK_SPECIES[taxon] || [{ name: `${taxon} sp. 1`, status: 'DD', trend: 'unknown' }];
    data.iucn = { species, count: species.length, source: 'synthetic_fallback' };
  }

  // iNaturalist
  try {
    const searchRank = rank === 'family' ? 'family' : 'genus';
    const t = await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(taxon)}&rank=${searchRank}&per_page=1`);
    if (t.ok) {
      const tj = await t.json();
      const taxonRes = tj.results?.[0];
      if (taxonRes) {
        data.inat = { taxon_id: taxonRes.id, total_observations: taxonRes.observations_count || 0 };
        const og = await fetch(`https://api.inaturalist.org/v1/observations?taxon_id=${taxonRes.id}&per_page=1&quality_grade=research`);
        if (og.ok) { const ogj = await og.json(); data.inat.research_grade_count = ogj.total_results || 0; }
      }
    }
  } catch (e) { /* silent */ }

  // GBIF
  try {
    const gbifRank = rank === 'family' ? 'FAMILY' : 'GENUS';
    const gbifField = rank === 'family' ? 'family' : 'genus';
    const gm = await fetch(`https://api.gbif.org/v1/species/match?${gbifField}=${encodeURIComponent(taxon)}&rank=${gbifRank}`);
    if (gm.ok) {
      const gmj = await gm.json();
      if (gmj.usageKey) {
        const go = await fetch(`https://api.gbif.org/v1/occurrence/search?taxonKey=${gmj.usageKey}&limit=1`);
        if (go.ok) {
          const goj = await go.json();
          data.gbif = { usage_key: gmj.usageKey, total_occurrences: goj.count || 0, family: gmj.family, order: gmj.order, class: gmj.class };
        }
      }
    }
  } catch (e) { /* silent */ }

  return data;
}

function buildDataSummary(taxon, rank, data) {
  return `
${taxon.toUpperCase()} (${rank}):
  IUCN species: ${data.iucn?.count ?? 'N/A'} | ${data.iucn?.source === 'synthetic_fallback' ? 'SYNTHETIC FALLBACK' : 'LIVE IUCN DATA'}
  Species list: ${data.iucn?.species?.map(s => `${s.name} [${s.status}, ${s.trend}]`).join(', ') ?? 'N/A'}
  iNaturalist observations (total): ${data.inat?.total_observations?.toLocaleString() ?? 'N/A'}
  iNaturalist research-grade: ${data.inat?.research_grade_count?.toLocaleString() ?? 'N/A'}
  GBIF occurrences: ${data.gbif?.total_occurrences?.toLocaleString() ?? 'N/A'}
  Taxonomic order: ${data.gbif?.order ?? 'N/A'} | Family: ${data.gbif?.family ?? 'N/A'}
  Native region: ${REGION_MAP[taxon] || 'native range'}
`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { taxon_a, rank_a = 'genus', taxon_b, rank_b = 'genus', citation_style = 'Harvard', save_draft = true } = body;

    if (!taxon_a || !taxon_b) {
      return Response.json({ error: 'Both taxon_a and taxon_b are required' }, { status: 400 });
    }

    console.log(`=== COMPARATIVE PAPER START: ${taxon_a} vs ${taxon_b} [${citation_style}] ===`);

    const iucnToken = Deno.env.get('IUCN_API_KEY');

    // Fetch both taxa in parallel
    const [dataA, dataB] = await Promise.all([
      fetchTaxonData(taxon_a, rank_a, iucnToken),
      fetchTaxonData(taxon_b, rank_b, iucnToken),
    ]);

    console.log(`Data fetched: ${taxon_a}(iucn=${dataA.iucn?.count}, gbif=${dataA.gbif?.total_occurrences}) | ${taxon_b}(iucn=${dataB.iucn?.count}, gbif=${dataB.gbif?.total_occurrences})`);

    const summaryA = buildDataSummary(taxon_a, rank_a, dataA);
    const summaryB = buildDataSummary(taxon_b, rank_b, dataB);

    const llmPrompt = `You are a world-leading academic ecologist writing a comparative peer-reviewed paper for Journal of Biogeography.

TASK: Write a full structured comparative analysis between two primate taxa:
  - TAXON A: ${rank_a === 'family' ? `family ${taxon_a}` : `genus *${taxon_a}*`}
  - TAXON B: ${rank_b === 'family' ? `family ${taxon_b}` : `genus *${taxon_b}*`}

LIVE DATA (use these exact figures — do not invent numbers):
${summaryA}
${summaryB}

CITATION STYLE: ${citation_style}

Write each section as a genuine comparative analysis — not two separate papers stitched together. Every paragraph must explicitly compare and contrast the two taxa. Use phrases like "In contrast to *${taxon_a}*...", "Both genera share...", "While *${taxon_a}* exhibits X, *${taxon_b}* demonstrates Y...".

REQUIRED SECTIONS AND TARGETS:
- abstract: 250–300 words. Structured: AIMS, TAXA, LOCATION, METHODS, RESULTS (quantitative for BOTH taxa), CONCLUSIONS.
- introduction: 1,500–2,000 words. Paragraphs: (1) Global biodiversity context; (2) Introduce BOTH taxa with geographic, ecological and IUCN status detail; (3) Comparative island biogeography framework; (4) Hybridisation and reticulate evolution in both; (5) Study objectives.
- methods: 1,000–1,400 words. Sub-sections: 2.1 Study taxa; 2.2 Occurrence data (report both counts); 2.3 Environmental predictors; 2.4 SDM approach; 2.5 Comparative fragmentation metrics; 2.6 Statistical comparison framework.
- results: 900–1,200 words. Sub-sections for each taxon then explicit comparison subsection. Include specific numbers for BOTH taxa.
- discussion: 1,500–2,000 words. 5 paragraphs. Each paragraph must compare and contrast both taxa. Include: (1) Key findings comparison; (2) Island biogeography differences; (3) Hybridisation contrasts; (4) Reticulate evolution implications for each; (5) Conservation priority ranking between the two.
- conclusion: 300–400 words. 3 paragraphs synthesising the comparative findings.
- references: Minimum 35 references in ${citation_style} format. Include Hill & Winder (2019), MacArthur & Wilson (1967), Mallet (2007), Arnold (1997), Hanski (1998).

MANDATORY:
- Use real data figures provided above — never invent occurrence counts or IUCN statuses
- Scientific names always italicised (*Genus species*)
- All citations in ${citation_style} format
- Acknowledge: "Data compiled using the DataWinder multi-source biodiversity platform (DataWinder, 2024)"
- The paper must feel like a genuine comparative study, not two independent papers merged

Return valid JSON with these exact keys:
{
  "title": "Comparative academic title explicitly naming both taxa",
  "abstract": "...",
  "introduction": "...",
  "methods": "...",
  "results": "...",
  "discussion": "...",
  "conclusion": "...",
  "references": "...",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "comparative_metrics": {
    "taxon_a_label": "${taxon_a}",
    "taxon_b_label": "${taxon_b}",
    "taxon_a_species_count": ${dataA.iucn?.count || 0},
    "taxon_b_species_count": ${dataB.iucn?.count || 0},
    "taxon_a_iucn_threatened_count": ${dataA.iucn?.species?.filter(s => ['EN','CR','VU'].includes(s.status)).length || 0},
    "taxon_b_iucn_threatened_count": ${dataB.iucn?.species?.filter(s => ['EN','CR','VU'].includes(s.status)).length || 0},
    "taxon_a_occurrences": ${(dataA.gbif?.total_occurrences || 0) + (dataA.inat?.research_grade_count || 0)},
    "taxon_b_occurrences": ${(dataB.gbif?.total_occurrences || 0) + (dataB.inat?.research_grade_count || 0)},
    "taxon_a_region": "${REGION_MAP[taxon_a] || 'native range'}",
    "taxon_b_region": "${REGION_MAP[taxon_b] || 'native range'}",
    "conservation_comparison_summary": "One sentence comparing conservation urgency of the two taxa"
  },
  "word_count_estimate": 7000
}`;

    console.log('Calling LLM for comparative paper...');

    const rawLLM = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: llmPrompt,
      model: 'gemini_3_pro',
    });

    let generated;
    if (typeof rawLLM === 'string') {
      const match = rawLLM.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON in LLM response');
      generated = JSON.parse(match[0].replace(/[\x00-\x1F]/g, ' '));
    } else {
      generated = rawLLM;
    }

    if (!generated.title || !generated.abstract) throw new Error('LLM did not generate required sections');

    console.log('LLM response received, generating figures...');

    // Generate two range map images in parallel
    const [imgA, imgB] = await Promise.allSettled([
      base44.asServiceRole.integrations.Core.GenerateImage({
        prompt: `Professional biogeographic range map for the ${rank_a === 'family' ? 'family' : 'genus'} ${taxon_a} across ${REGION_MAP[taxon_a] || 'its native range'}. Colored species range polygons on correct continent, country borders, biomes labeled, scale bar, IUCN status legend. Publication-quality scientific cartography.`,
        existing_image_urls: []
      }),
      base44.asServiceRole.integrations.Core.GenerateImage({
        prompt: `Professional biogeographic range map for the ${rank_b === 'family' ? 'family' : 'genus'} ${taxon_b} across ${REGION_MAP[taxon_b] || 'its native range'}. Colored species range polygons on correct continent, country borders, biomes labeled, scale bar, IUCN status legend. Publication-quality scientific cartography.`,
        existing_image_urls: []
      })
    ]);

    const sections = {
      abstract: generated.abstract,
      introduction: generated.introduction,
      methods: generated.methods,
      results: generated.results,
      discussion: generated.discussion,
      conclusion: generated.conclusion,
      references: generated.references,
    };

    const wordCount = Object.values(sections).join(' ').split(/\s+/).length;

    // Build figures data for both taxa
    const figures_data = [];

    if (imgA.status === 'fulfilled' && imgA.value?.url) {
      figures_data.push({ id: 'range_map_a', type: 'image', title: `Figure 1. Geographic Range — ${taxon_a}`, description: `Species range distribution for ${taxon_a} across ${REGION_MAP[taxon_a] || 'native range'}.`, image_url: imgA.value.url, taxon: taxon_a });
    }
    if (imgB.status === 'fulfilled' && imgB.value?.url) {
      figures_data.push({ id: 'range_map_b', type: 'image', title: `Figure 2. Geographic Range — ${taxon_b}`, description: `Species range distribution for ${taxon_b} across ${REGION_MAP[taxon_b] || 'native range'}.`, image_url: imgB.value.url, taxon: taxon_b });
    }

    // Comparative IUCN status bar chart data
    figures_data.push({
      id: 'comparative_iucn',
      type: 'comparative_bar',
      title: `Figure 3. Comparative IUCN Status Distribution`,
      description: `Species count by IUCN Red List category for ${taxon_a} and ${taxon_b}.`,
      taxon_a: taxon_a,
      taxon_b: taxon_b,
      data_a: Object.entries(dataA.iucn?.species?.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {}) || {}).map(([k, v]) => ({ name: k, value: v })),
      data_b: Object.entries(dataB.iucn?.species?.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {}) || {}).map(([k, v]) => ({ name: k, value: v })),
    });

    // Comparative occurrence sources
    figures_data.push({
      id: 'comparative_occurrences',
      type: 'comparative_bar',
      title: `Figure 4. Occurrence Records Comparison`,
      description: `Total quality occurrence records per source for ${taxon_a} vs ${taxon_b}.`,
      taxon_a: taxon_a,
      taxon_b: taxon_b,
      data_a: [
        { name: 'GBIF', value: dataA.gbif?.total_occurrences || 0 },
        { name: 'iNaturalist', value: dataA.inat?.research_grade_count || 0 },
      ],
      data_b: [
        { name: 'GBIF', value: dataB.gbif?.total_occurrences || 0 },
        { name: 'iNaturalist', value: dataB.inat?.research_grade_count || 0 },
      ],
    });

    const comparative_metrics = generated.comparative_metrics || {};

    const draftPayload = {
      title: generated.title,
      genus: `${taxon_a} vs ${taxon_b}`,
      citation_style,
      is_comparative: true,
      taxon_a, rank_a, taxon_b, rank_b,
      sections,
      figures_data,
      comparative_metrics,
      raw_data_snapshot: { taxon_a: dataA, taxon_b: dataB },
      keywords: generated.keywords || [],
      status: 'complete',
      word_count: wordCount,
    };

    let savedId = null;
    if (save_draft) {
      const saved = await base44.asServiceRole.entities.PaperDraft.create(draftPayload);
      savedId = saved.id;
    }

    console.log(`=== COMPARATIVE PAPER COMPLETE: ${wordCount} words, draft=${savedId} ===`);

    return Response.json({
      status: 'success',
      draft_id: savedId,
      title: generated.title,
      word_count: wordCount,
      taxon_a, rank_a, taxon_b, rank_b,
      keywords: generated.keywords || [],
      sections,
      figures_data,
      comparative_metrics,
      raw_data: { taxon_a: dataA, taxon_b: dataB },
    });

  } catch (error) {
    console.error('Comparative paper error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});