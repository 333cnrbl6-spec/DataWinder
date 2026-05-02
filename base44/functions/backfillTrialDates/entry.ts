import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only function
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all users who don't have trial_expires_at set but are on 'trial' tier
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    let updated = 0;
    const errors = [];

    for (const u of allUsers) {
      try {
        // Only update trial users without expiration dates
        if (u.subscription_tier === 'trial' && !u.trial_expires_at) {
          // Set expiration 14 days from their signup date
          const createdDate = new Date(u.created_date);
          const expiresAt = new Date(createdDate);
          expiresAt.setDate(expiresAt.getDate() + 14);

          await base44.asServiceRole.entities.User.update(u.id, {
            trial_expires_at: expiresAt.toISOString()
          });
          updated++;
        }
      } catch (err) {
        errors.push({ user_id: u.id, email: u.email, error: err.message });
      }
    }

    console.log(`✓ Backfilled trial dates for ${updated} users. Errors: ${errors.length}`);

    return Response.json({
      success: true,
      users_updated: updated,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});