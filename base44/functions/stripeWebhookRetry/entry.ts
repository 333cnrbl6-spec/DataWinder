/**
 * STRIPE WEBHOOK RETRY HANDLER
 * ============================
 * Implements exponential backoff for failed webhook processing.
 * Automatically retries failed events with delays: 5s, 25s, 125s, 625s, 3125s (max 1 hour)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 5000; // 5 seconds

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { webhookId, eventType, eventData, retryCount = 0, lastError = null } = await req.json();

    if (!webhookId || !eventType) {
      return Response.json({ error: 'Missing webhookId or eventType' }, { status: 400 });
    }

    // Calculate delay for this retry (exponential backoff: 5^retryCount)
    const delayMs = Math.min(BASE_DELAY_MS * Math.pow(5, retryCount), 3600000); // Cap at 1 hour

    console.log(`[Webhook Retry] ${eventType} (attempt ${retryCount + 1}/${MAX_RETRIES}) - ${webhookId}`);

    try {
      // Attempt to process the webhook
      const result = await processWebhookEvent(base44, eventType, eventData);
      
      console.log(`✓ Webhook processed: ${eventType} - ${webhookId}`);
      
      return Response.json({
        success: true,
        webhookId,
        eventType,
        attempts: retryCount + 1
      });

    } catch (error) {
      // Increment retry count
      const nextRetry = retryCount + 1;

      if (nextRetry >= MAX_RETRIES) {
        // Max retries exceeded - log failure and give up
        console.error(`✗ Webhook FAILED after ${MAX_RETRIES} attempts: ${eventType} - ${webhookId}`);
        console.error(`  Last error: ${error.message}`);

        // Store failed webhook for manual review
        try {
          await base44.asServiceRole.entities.WebhookFailure.create({
            webhook_id: webhookId,
            event_type: eventType,
            event_data: eventData,
            error_message: error.message,
            retry_count: nextRetry,
            final_attempt_at: new Date().toISOString(),
            status: 'failed'
          });
        } catch (e) {
          console.error('Failed to log webhook failure:', e.message);
        }

        return Response.json({
          error: 'Max retries exceeded',
          webhookId,
          attempts: nextRetry
        }, { status: 400 });
      }

      // Schedule next retry
      console.warn(`⚠ Webhook retry scheduled in ${delayMs}ms: ${eventType}`);

      // Store retry state for later processing
      try {
        await base44.asServiceRole.entities.WebhookRetry.create({
          webhook_id: webhookId,
          event_type: eventType,
          event_data: eventData,
          retry_count: nextRetry,
          next_retry_at: new Date(Date.now() + delayMs).toISOString(),
          last_error: error.message,
          status: 'pending'
        });
      } catch (e) {
        console.error('Failed to schedule webhook retry:', e.message);
      }

      return Response.json({
        success: false,
        webhookId,
        retryScheduled: true,
        nextRetryIn: delayMs,
        attempt: nextRetry
      }, { status: 202 }); // 202 Accepted
    }

  } catch (error) {
    console.error('Webhook retry handler error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Process webhook event based on type
 */
async function processWebhookEvent(base44, eventType, eventData) {
  switch (eventType) {
    case 'checkout.session.completed':
      return await handleCheckoutComplete(base44, eventData);
    
    case 'customer.subscription.updated':
      return await handleSubscriptionUpdate(base44, eventData);
    
    case 'customer.subscription.deleted':
      return await handleSubscriptionDelete(base44, eventData);
    
    case 'invoice.payment_failed':
      return await handlePaymentFailed(base44, eventData);
    
    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }
}

/**
 * Handle checkout completion
 */
async function handleCheckoutComplete(base44, data) {
  const { customerEmail, planId, subscriptionId, customerId } = data;

  if (!customerEmail) throw new Error('Missing customerEmail');
  if (!planId) throw new Error('Missing planId');

  const users = await base44.asServiceRole.entities.User.filter({
    email: customerEmail
  });

  const user = users[0];
  if (!user) throw new Error(`User not found: ${customerEmail}`);

  const tierMap = {
    'datawinder-pro-monthly': 'pro',
    'datawinder-pro-annual': 'pro'
  };

  const tier = tierMap[planId] || 'pro';

  await base44.asServiceRole.entities.User.update(user.id, {
    subscription_tier: tier,
    subscription_status: 'active',
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    subscription_started_at: new Date().toISOString()
  });

  return { success: true, userId: user.id, tier };
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdate(base44, data) {
  const { customerEmail, subscriptionStatus } = data;

  if (!customerEmail) throw new Error('Missing customerEmail');

  const users = await base44.asServiceRole.entities.User.filter({
    email: customerEmail
  });

  const user = users[0];
  if (!user) throw new Error(`User not found: ${customerEmail}`);

  await base44.asServiceRole.entities.User.update(user.id, {
    subscription_status: subscriptionStatus === 'active' ? 'active' : 'inactive'
  });

  return { success: true, userId: user.id, status: subscriptionStatus };
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDelete(base44, data) {
  const { customerEmail } = data;

  if (!customerEmail) throw new Error('Missing customerEmail');

  const users = await base44.asServiceRole.entities.User.filter({
    email: customerEmail
  });

  const user = users[0];
  if (!user) throw new Error(`User not found: ${customerEmail}`);

  const isBangor = customerEmail.endsWith('@bangor.ac.uk');

  await base44.asServiceRole.entities.User.update(user.id, {
    subscription_tier: isBangor ? 'free' : 'free',
    subscription_status: 'cancelled',
    subscription_ended_at: new Date().toISOString()
  });

  return { success: true, userId: user.id, newTier: 'free' };
}

/**
 * Handle payment failure
 */
async function handlePaymentFailed(base44, data) {
  const { customerEmail, invoiceId, attemptCount } = data;

  if (!customerEmail) throw new Error('Missing customerEmail');

  // Log failed payment for support follow-up
  try {
    await base44.asServiceRole.analytics.track({
      eventName: 'payment_failed',
      properties: {
        user_email: customerEmail,
        invoice_id: invoiceId,
        attempt_count: attemptCount
      }
    });
  } catch (e) {
    console.warn('Failed to track payment failure:', e.message);
  }

  return { success: true, logged: true };
}