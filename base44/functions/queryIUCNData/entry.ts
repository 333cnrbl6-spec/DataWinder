import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { species_name } = await req.json();

    if (!species_name) {
      return Response.json({ error: 'Species name required' }, { status: 400 });
    }

    const iucnKey = Deno.env.get('IUCN_API_KEY');
    if (!iucnKey) {
      return Response.json({ error: 'IUCN API key not configured' }, { status: 500 });
    }

    // Search IUCN Red List for species
    const searchRes = await fetch(
      `https://restapi.rlsts.org/v2/advanced/search.json?name=${encodeURIComponent(species_name)}&token=${iucnKey}`
    );
    const searchData = await searchRes.json();

    if (!searchData.result || searchData.result.length === 0) {
      return Response.json({
        success: false,
        message: 'Species not found in IUCN Red List',
        data: null,
      });
    }

    const result = searchData.result[0];
    const assessmentId = result.assessment_id;

    // Fetch detailed assessment
    const detailRes = await fetch(
      `https://restapi.rlsts.org/v2/assessment/${assessmentId}.json?token=${iucnKey}`
    );
    const assessment = await detailRes.json();

    const data = assessment.result[0];

    return Response.json({
      success: true,
      species: {
        scientific_name: data.scientific_name,
        common_names: data.common_names || [],
        assessment_id: assessmentId,
      },
      conservation_status: {
        iucn_status: data.category,
        status_code: data.category,
        assessment_year: data.assessment_year,
        population_trend: data.population_trend,
        threats: (data.threats || []).map(t => ({
          code: t.code,
          title: t.title,
          timing: t.timing,
        })),
        conservation_actions: (data.conservation_actions || []).map(c => ({
          code: c.code,
          title: c.title,
        })),
      },
      geographic_range: {
        countries: data.countries || [],
        range_description: data.range_description,
      },
      population: {
        population_size: data.population_size,
        population_trend: data.population_trend,
      },
    });

  } catch (error) {
    console.error('IUCN query error:', error);
    return Response.json({
      error: 'Failed to query IUCN Red List',
      details: error.message,
    }, { status: 500 });
  }
});