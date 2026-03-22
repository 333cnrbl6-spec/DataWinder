import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { species_id, species_ids } = await req.json();

  // Determine which species to process
  const ids = species_ids || (species_id ? [species_id] : []);
  if (ids.length === 0) return Response.json({ error: 'No species_id(s) provided' }, { status: 400 });

  const results = [];

  for (const id of ids) {
    const species = await base44.entities.Species.get(id);
    if (!species) {
      results.push({ species_id: id, error: 'Not found' });
      continue;
    }

    // Identify missing fields
    const FIELDS = [
      'common_name', 'iucn_status', 'population_trend', 'population_details',
      'family', 'genus', 'kingdom', 'phylum', 'class_name', 'order_name',
      'habitat', 'range_description', 'threats', 'conservation_actions'
    ];

    const missingFields = FIELDS.filter(f => !species[f] || species[f] === '');
    if (missingFields.length === 0) {
      results.push({ species_id: id, skipped: true, reason: 'No missing fields' });
      continue;
    }

    // Use AI to fill in missing fields
    const prompt = `You are a biodiversity expert. Given the species scientific name "${species.scientific_name}", provide accurate values for the following missing fields. Return ONLY the requested fields with concise, factual values based on known scientific knowledge.

Missing fields to fill: ${missingFields.join(', ')}

For iucn_status use one of: LC, NT, VU, EN, CR, EW, EX, DD, NE
For population_trend use one of: increasing, stable, decreasing, unknown
For all other text fields, provide concise factual text (1-3 sentences max for descriptions).

Return a JSON object with only the missing fields as keys.`;

    let suggestions = {};
    try {
      suggestions = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: Object.fromEntries(missingFields.map(f => [f, { type: 'string' }]))
        }
      });
    } catch (e) {
      results.push({ species_id: id, error: `AI call failed: ${e.message}` });
      continue;
    }

    // Remove any fields that came back empty
    const cleanSuggestions = Object.fromEntries(
      Object.entries(suggestions).filter(([_, v]) => v && v.trim() !== '')
    );

    if (Object.keys(cleanSuggestions).length === 0) {
      results.push({ species_id: id, skipped: true, reason: 'AI returned no suggestions' });
      continue;
    }

    // Check if a pending update already exists for this species
    const existing = await base44.entities.PendingSpeciesUpdate.filter({
      species_id: id,
      status: 'pending',
      data_source: 'AI Auto-Complete'
    });

    if (existing.length > 0) {
      // Update existing pending record with fresh suggestions
      await base44.entities.PendingSpeciesUpdate.update(existing[0].id, {
        new_data: cleanSuggestions,
        current_data: species
      });
      results.push({ species_id: id, updated_existing: true, fields: Object.keys(cleanSuggestions) });
    } else {
      // Create new pending update
      await base44.entities.PendingSpeciesUpdate.create({
        species_id: id,
        scientific_name: species.scientific_name,
        current_data: species,
        new_data: cleanSuggestions,
        data_source: 'AI Auto-Complete',
        status: 'pending'
      });
      results.push({ species_id: id, created: true, fields: Object.keys(cleanSuggestions) });
    }
  }

  return Response.json({ success: true, results });
});