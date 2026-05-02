/**
 * SCHEDULED AUTOMATION: Trial Expiration Checker
 * Runs daily at 9:00 AM GMT
 * 
 * Checks for users whose 14-day free trial has expired
 * and sends reminder emails to upgrade to Pro
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all free tier users
    const users = await base44.asServiceRole.entities.User.list();
    const freeUsers = users.filter(u => u.subscription_tier === 'free' && !u.email.endsWith('@bangor.ac.uk'));

    const now = new Date();
    let expiredCount = 0;

    for (const user of freeUsers) {
      const signupDate = new Date(user.created_date);
      const trialEndDate = new Date(signupDate.getTime() + 14 * 24 * 60 * 60 * 1000);

      // If trial expired and no reminder sent yet
      if (now > trialEndDate && !user.trial_expired_notified) {
        await base44.asServiceRole.entities.User.update(user.id, {
          trial_expired_notified: true,
          trial_expired_at: trialEndDate.toISOString()
        });

        // Send email notification
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: 'Your DataWinder Trial Has Expired',
          body: `
Hi ${user.full_name},

Your 14-day free trial has ended. Your account is still active, but you won't be able to add new data or run models.

Upgrade to Pro now to:
- Get unlimited occurrences
- Run unlimited SDM models
- Access climate scenario projections
- Priority email support

[Upgrade to Pro](https://datawinder.app/Pricing)

Have questions? Reply to this email or visit our FAQ.

Best regards,
The DataWinder Team
          `
        });

        expiredCount++;
        console.log(`Trial expiration email sent to ${user.email}`);
      }
    }

    return Response.json({
      success: true,
      checked: freeUsers.length,
      expired_notified: expiredCount
    });

  } catch (error) {
    console.error('Trial expiration automation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});