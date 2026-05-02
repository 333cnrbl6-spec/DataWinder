import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { event_name, properties } = await req.json();
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!event_name) {
      return Response.json({ error: 'Missing event_name' }, { status: 400 });
    }

    // Track via base44 analytics
    await base44.analytics.track({
      eventName: event_name,
      properties: {
        ...properties,
        user_email: user.email,
        user_tier: user.subscription_tier || 'free',
        timestamp: new Date().toISOString()
      }
    });

    // Log important events to console for audit trail
    if (['signup_completed', 'tier_assigned', 'payment_success', 'trial_expired'].includes(event_name)) {
      console.log(`[ANALYTICS] ${event_name}`, { user: user.email, ...properties });
    }

    return Response.json({
      success: true,
      event_name,
      tracked: true
    });

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});