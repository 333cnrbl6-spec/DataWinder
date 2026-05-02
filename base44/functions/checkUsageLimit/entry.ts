import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { month, year } = await req.json();
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Query occurrences created this month by this user
    const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

    const occurrences = await base44.entities.Occurrence.filter({
      created_by: user.email
    });

    const monthlyOccurrences = occurrences.filter(occ => {
      const occDate = new Date(occ.created_date);
      return occDate >= new Date(startDate) && occDate <= new Date(endDate);
    });

    const tier = user.subscription_tier || 'free';
    const limits = {
      free: 1000,
      starter: 10000,
      pro: Infinity,
      enterprise: Infinity
    };

    const limit = limits[tier] || 1000;
    const used = monthlyOccurrences.length;
    const remaining = Math.max(0, limit - used);
    const percentage = limit === Infinity ? 100 : (used / limit) * 100;

    return Response.json({
      tier,
      limit: limit === Infinity ? 'unlimited' : limit,
      used,
      remaining: remaining === Infinity ? 'unlimited' : remaining,
      percentage: Math.min(100, percentage),
      warning: percentage >= 80 && limit !== Infinity,
      exceeded: percentage > 100 && limit !== Infinity
    });

  } catch (error) {
    console.error('Usage limit check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});