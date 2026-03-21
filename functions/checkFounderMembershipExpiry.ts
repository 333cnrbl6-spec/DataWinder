import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Checks if user's founder membership has expired
 * Returns membership status and updates user record if expired
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const founderExpiry = user.founder_membership_expires;
    
    if (!founderExpiry) {
      // Not a founder member
      return Response.json({
        is_founder: false,
        membership_tier: user.membership_tier || 'Standard',
        message: 'User is not a founder member'
      });
    }

    const expiryDate = new Date(founderExpiry);
    const now = new Date();
    const isExpired = now > expiryDate;
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (isExpired) {
      // Membership expired — update user to standard tier
      console.log(`Founder membership expired for user ${user.email}`);
      await base44.auth.updateMe({
        membership_tier: 'Standard',
        founder_membership_expires: null
      });

      return Response.json({
        is_founder: false,
        is_expired: true,
        expired_date: expiryDate.toISOString(),
        membership_tier: 'Standard',
        message: 'Founder membership has expired. Please contact support for renewal options.'
      });
    }

    return Response.json({
      is_founder: true,
      is_expired: false,
      membership_tier: 'Founding Member',
      expires_on: expiryDate.toISOString(),
      days_remaining: daysRemaining,
      message: `Founder membership active (${daysRemaining} days remaining)`
    });
  } catch (error) {
    console.error('Error checking founder membership:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});