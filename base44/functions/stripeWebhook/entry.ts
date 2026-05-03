/**
 * DATAWINDER — STRIPE WEBHOOK HANDLER
 * =====================================
 * SynergyFlow Commercial Infrastructure — SEALED
 *
 * Listens for: checkout.session.completed, customer.subscription.updated,
 *              customer.subscription.deleted, invoice.paid
 *
 * Register this URL in Stripe Dashboard > Webhooks after commercial launch.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-06-20',
});

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const body = await req.text();

    // Validate webhook signature
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    console.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.customer_email || session.customer_details?.email;
        const planId = session.metadata?.plan_id;
        const subscriptionId = session.subscription;

        if (!customerEmail || !planId) {
          console.error('Missing customerEmail or planId in checkout.session.completed');
          break;
        }

        try {
          // BUGFIX: Use filter instead of list (better performance, avoids O(n) scan)
          const users = await base44.asServiceRole.entities.User.filter({
            email: customerEmail
          });
          
          const targetUser = users[0];
          
          if (!targetUser) {
            console.error(`User not found for email: ${customerEmail}`);
            break;
          }

          const tierMap = {
            'datawinder-pro-monthly': 'pro',
            'datawinder-pro-annual': 'pro',
            'datawinder-starter': 'starter',
            'datawinder-enterprise': 'enterprise'
          };

          const tier = tierMap[planId] || 'pro';

          await base44.asServiceRole.entities.User.update(targetUser.id, {
            subscription_tier: tier,
            subscription_status: 'active',
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscriptionId,
            subscription_started_at: new Date().toISOString(),
          });

          // Track upgrade event
          await base44.asServiceRole.analytics.track({
            eventName: 'payment_success',
            properties: {
              user_email: customerEmail,
              tier,
              session_id: session.id,
              amount: session.amount_total
            }
          });

          console.log(`✓ Payment successful: ${customerEmail} upgraded to ${tier}`);
        } catch (err) {
          console.error('Error processing checkout completion:', err.message);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        try {
          const customer = await stripe.customers.retrieve(sub.customer);

          if (!customer.email) break;

          const users = await base44.asServiceRole.entities.User.filter({
            email: customer.email
          });
          
          const targetUser = users[0];
          if (targetUser) {
            await base44.asServiceRole.entities.User.update(targetUser.id, {
              subscription_status: sub.status === 'active' ? 'active' : 'inactive',
            });
            console.log(`Subscription updated for ${customer.email}: ${sub.status}`);
          }
        } catch (err) {
          console.error('Error updating subscription:', err.message);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        try {
          const customer = await stripe.customers.retrieve(sub.customer);

          if (!customer.email) break;

          const users = await base44.asServiceRole.entities.User.filter({
            email: customer.email
          });
          
          const targetUser = users[0];
          if (targetUser) {
            // Check if Bangor user - revert to free academic tier
            const isBangor = customer.email.endsWith('@bangor.ac.uk');
            
            await base44.asServiceRole.entities.User.update(targetUser.id, {
              subscription_tier: isBangor ? 'free' : 'free',
              subscription_status: 'cancelled',
              subscription_ended_at: new Date().toISOString()
            });

            await base44.asServiceRole.analytics.track({
              eventName: 'subscription_cancelled',
              properties: {
                user_email: customer.email,
                reason: 'customer_cancelled'
              }
            });

            console.log(`✗ Subscription cancelled: ${customer.email}`);
          }
        } catch (err) {
          console.error('Error processing subscription deletion:', err.message);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        try {
          const customer = await stripe.customers.retrieve(invoice.customer);
          console.warn(`⚠ Payment failed for ${customer.email}: ${invoice.id}`);
          
          // BUGFIX: Track failed payment event for retry logic
          await base44.asServiceRole.analytics.track({
            eventName: 'payment_failed',
            properties: {
              user_email: customer.email,
              invoice_id: invoice.id,
              attempt_count: invoice.attempt_count
            }
          });
        } catch (err) {
          console.error('Error handling payment failure:', err.message);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});