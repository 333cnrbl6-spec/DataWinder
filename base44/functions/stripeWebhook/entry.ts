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
        const userEmail = session.metadata?.user_email;
        const planId = session.metadata?.plan_id;

        if (userEmail && planId) {
          // Update user's subscription plan in DataWinder
          const users = await base44.asServiceRole.entities.User.list();
          const targetUser = users.find(u => u.email === userEmail);
          
          if (targetUser) {
            await base44.asServiceRole.entities.User.update(targetUser.id, {
              subscription_plan: planId,
              subscription_status: 'active',
              stripe_customer_id: session.customer,
            });
            console.log(`Updated subscription for ${userEmail} to ${planId}`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userEmail = sub.metadata?.user_email;

        if (userEmail) {
          const users = await base44.asServiceRole.entities.User.list();
          const targetUser = users.find(u => u.email === userEmail);
          
          if (targetUser) {
            await base44.asServiceRole.entities.User.update(targetUser.id, {
              subscription_plan: 'none',
              subscription_status: 'cancelled',
            });
            console.log(`Cancelled subscription for ${userEmail}`);
          }
        }
        break;
      }

      case 'invoice.paid': {
        console.log(`Invoice paid for customer: ${event.data.object.customer}`);
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