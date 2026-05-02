import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Detect tier based on email domain
    const isBangorUser = user.email?.endsWith('@bangor.ac.uk');
    const tier = isBangorUser ? 'free' : 'free';

    // Track tier assignment
    await base44.asServiceRole.analytics.track({
      eventName: 'tier_assigned',
      properties: {
        user_email: user.email,
        tier,
        is_bangor_user: isBangorUser
      }
    });

    return Response.json({
      tier,
      email: user.email,
      isBangorUser,
      message: isBangorUser ? 'Free Academic tier unlocked' : 'Free tier assigned (14-day trial)'
    });
  } catch (error) {
    console.error('Tier detection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});