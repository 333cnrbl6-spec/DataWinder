import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only trial users have expiration dates
    if (user.subscription_tier !== 'trial') {
      return Response.json({
        trial_active: false,
        days_remaining: null,
        tier: user.subscription_tier,
        message: `User is on ${user.subscription_tier} plan`
      });
    }

    // Calculate days remaining
    const now = new Date();
    const expiresAt = user.trial_expires_at ? new Date(user.trial_expires_at) : null;

    if (!expiresAt) {
      // No expiration date set (shouldn't happen, but fallback to 14 days)
      const fallbackExpiry = new Date(user.created_date);
      fallbackExpiry.setDate(fallbackExpiry.getDate() + 14);
      const daysRemaining = Math.ceil((fallbackExpiry - now) / (1000 * 60 * 60 * 24));
      return Response.json({
        trial_active: daysRemaining > 0,
        days_remaining: Math.max(0, daysRemaining),
        tier: 'trial',
        message: `Trial expires in ${daysRemaining} days`
      });
    }

    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    // Track trial status
    await base44.analytics.track({
      eventName: 'trial_check',
      properties: {
        user_email: user.email,
        days_remaining: Math.max(0, daysRemaining),
        trial_active: daysRemaining > 0
      }
    });

    return Response.json({
      trial_active: daysRemaining > 0,
      days_remaining: Math.max(0, daysRemaining),
      trial_expires_at: expiresAt.toISOString(),
      tier: 'trial',
      message: daysRemaining <= 0 
        ? 'Trial has expired' 
        : `Trial expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
    });
  } catch (error) {
    console.error('Trial check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});