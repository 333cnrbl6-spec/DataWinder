import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Detect tier based on email domain
    let tier = 'trial';
    let limits = {
      maxProjects: 1,
      maxOccurrencesPerMonth: 100,
      support: 'Community',
    };

    if (user.email?.endsWith('@bangor.ac.uk')) {
      tier = 'free_bangor';
      limits = {
        maxProjects: 5,
        maxOccurrencesPerMonth: 1000,
        support: 'Community',
      };
    }

    return Response.json({
      tier,
      email: user.email,
      isBangorUser: user.email?.endsWith('@bangor.ac.uk'),
      limits,
    });
  } catch (error) {
    console.error('Tier detection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});