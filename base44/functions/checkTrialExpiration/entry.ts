import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const signupDate = new Date(user.created_date);
    const trialEndDate = new Date(signupDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

    // Check if trial expired and user hasn't upgraded
    if (now > trialEndDate && user.subscription_tier === 'free') {
      return Response.json({
        trial_expired: true,
        days_expired: Math.floor((now - trialEndDate) / (24 * 60 * 60 * 1000)),
        message: 'Your free trial has expired. Upgrade to Pro to continue.'
      });
    }

    const daysRemaining = Math.ceil((trialEndDate - now) / (24 * 60 * 60 * 1000));

    return Response.json({
      trial_expired: false,
      trial_active: daysRemaining > 0,
      days_remaining: Math.max(0, daysRemaining),
      trial_end_date: trialEndDate.toISOString(),
      current_tier: user.subscription_tier
    });

  } catch (error) {
    console.error('Trial expiration check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});