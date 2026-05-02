/**
 * SCHEDULED AUTOMATION: Trial Expiration Checker
 * Runs daily at 9:00 AM GMT
 * 
 * Checks for users whose 14-day free trial has expired
 * and sends reminder emails to upgrade to Pro
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TRIAL_LENGTH_DAYS = 14;

async function sendEmail(email, subject, body) {
  try {
    const res = await fetch('https://api.base44.io/integrations/core/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject,
        body
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all free tier users
    const users = await base44.asServiceRole.entities.User.list();
    const freeUsers = users.filter(u => u.subscription_tier === 'free' && !u.email.endsWith('@bangor.ac.uk'));

    const now = new Date();
    let reminderCount = 0;
    let expiredCount = 0;

    for (const user of freeUsers) {
      const signupDate = new Date(user.created_date);
      const trialEndDate = new Date(signupDate.getTime() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000);
      const daysRemaining = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));

      // 3-day warning
      if (daysRemaining === 3 && !user.trial_3day_reminded) {
        await base44.asServiceRole.entities.User.update(user.id, {
          trial_3day_reminded: true
        });

        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: '⏰ 3 days left on your DataWinder trial',
          body: `Hi ${user.full_name},\n\nYour 14-day trial expires on ${trialEndDate.toDateString()}.\n\nUpgrade to Pro to keep using:\n- Unlimited SDM models\n- Climate scenario projections\n- Data exports & sharing\n- Priority support\n\nUpgrade: ${Deno.env.get('APP_URL')}/Pricing`
        });
        reminderCount++;
        console.log(`3-day reminder sent to ${user.email}`);
      }

      // 1-day warning
      if (daysRemaining === 1 && !user.trial_1day_reminded) {
        await base44.asServiceRole.entities.User.update(user.id, {
          trial_1day_reminded: true
        });

        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: '⏰ 24 hours left: Upgrade to DataWinder Pro',
          body: `Hi ${user.full_name},\n\nYour trial ends TOMORROW. All Pro features will be locked unless you upgrade.\n\nDon't lose access - upgrade now:\n${Deno.env.get('APP_URL')}/Pricing`
        });
        reminderCount++;
        console.log(`1-day reminder sent to ${user.email}`);
      }

      // Trial expired
      if (now > trialEndDate && !user.trial_expired_notified) {
        await base44.asServiceRole.entities.User.update(user.id, {
          trial_expired_notified: true,
          trial_expired_at: trialEndDate.toISOString()
        });

        // Retention offer email
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: '📢 Special offer: 20% off annual subscription',
          body: `Hi ${user.full_name},\n\nYour DataWinder trial has ended. Pro features are now locked.\n\nBut we have a 24-hour retention offer:\n\n🎁 20% OFF annual subscription (valid for 7 days)\n\nUpgrade now: ${Deno.env.get('APP_URL')}/Pricing\n\nThis offer expires in 7 days.`
        });

        expiredCount++;
        console.log(`Trial expiration email sent to ${user.email}`);
      }
    }

    return Response.json({
      success: true,
      checked: freeUsers.length,
      reminders_sent: reminderCount,
      expired_notified: expiredCount
    });

  } catch (error) {
    console.error('Trial expiration automation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});