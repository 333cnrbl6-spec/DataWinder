import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { species_name, location, observation_date, observer_name, observations, additional_context } = payload;

    const prompt = `You are a UK wildlife conservation scientist. Generate a detailed professional field report based on the following observation:

Species: ${species_name}
Location: ${location}
Date: ${observation_date}
Observer: ${observer_name}
Observations: ${observations}
${additional_context ? `Additional Context: ${additional_context}` : ''}

Provide a comprehensive report including:
1. Executive Summary (2-3 sentences)
2. Detailed Observations (behavioral notes, habitat use, population indicators)
3. Conservation Status Assessment (UK/global conservation status, local significance)
4. Recommended Actions (monitoring, habitat management, reporting)
5. References to relevant UK conservation frameworks

Format as structured JSON.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          detailed_observations: { type: 'string' },
          conservation_assessment: { type: 'string' },
          recommended_actions: { type: 'array', items: { type: 'string' } },
          uk_conservation_status: { type: 'string' },
          report_generated_at: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      report: response.data || response
    });
  } catch (error) {
    console.error('AI report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});