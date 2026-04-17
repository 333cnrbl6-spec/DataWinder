import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { species_id } = await req.json();
    
    if (!species_id) {
      return Response.json({ error: 'species_id required' }, { status: 400 });
    }

    // Fetch species data
    const species = await base44.entities.Species.list();
    const targetSpecies = species.find(s => s.id === species_id);

    if (!targetSpecies) {
      return Response.json({ error: 'Species not found' }, { status: 404 });
    }

    // Use InvokeLLM with web context to find relevant literature
    const literatureContext = await base44.integrations.Core.InvokeLLM({
      prompt: `Find the top 5 most relevant scientific papers and research about the species "${targetSpecies.scientific_name}" (${targetSpecies.common_name}). 
      Focus on: conservation status, habitat requirements, population trends, climate vulnerability, and ecological role.
      Return as JSON with: papers (array of {title, authors, year, journal, doi, relevance_score (1-100), key_findings}).`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          papers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                authors: { type: 'array', items: { type: 'string' } },
                year: { type: 'number' },
                journal: { type: 'string' },
                doi: { type: 'string' },
                relevance_score: { type: 'number' },
                key_findings: { type: 'string' }
              }
            }
          },
          summary: { type: 'string' }
        }
      }
    });

    // Fetch existing literature records
    const existingLiterature = await base44.entities.Literature.list();
    
    // Create literature records from AI findings (avoiding duplicates)
    const newPapers = [];
    for (const paper of literatureContext.papers || []) {
      const exists = existingLiterature.some(lit => lit.doi === paper.doi);
      if (!exists && paper.title) {
        const created = await base44.entities.Literature.create({
          title: paper.title,
          authors: paper.authors || [],
          year: paper.year,
          journal: paper.journal,
          doi: paper.doi,
          paper_type: 'Review',
          key_findings: paper.key_findings,
          tags: ['ai-enriched', targetSpecies.scientific_name]
        });
        newPapers.push(created);
      }
    }

    // Update species with enrichment metadata
    await base44.entities.Species.update(species_id, {
      all_images_urls: targetSpecies.all_images_urls || []
    });

    return Response.json({
      success: true,
      species_name: targetSpecies.scientific_name,
      papers_added: newPapers.length,
      summary: literatureContext.summary,
      new_papers: newPapers
    });

  } catch (error) {
    console.error('Enrichment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});