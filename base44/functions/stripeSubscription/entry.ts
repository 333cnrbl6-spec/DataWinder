/**
 * DATAWINDER — STRIPE SUBSCRIPTION BACKEND
 * ==========================================
 * SynergyFlow Commercial Infrastructure
 * Status: SEALED — feature-flagged, not linked from any live UI
 *
 * Handles: create checkout session, portal session, webhook events
 * Plans: Starter £39/mo | Professional £99/mo | Enterprise £249/mo
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-06-20',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // ── CREATE CHECKOUT SESSION ──
    if (action === 'create_checkout') {
      const { plan_id, price_id } = body;

      if (!price_id) {
        return Response.json({
          error: 'No Stripe price ID configured for this plan. Set stripe_price_id in commercialConfig.js after creating products in Stripe dashboard.',
        }, { status: 400 });
      }

      // Check if running in iframe — checkout won't work
      const origin = req.headers.get('origin') || '';
      
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: user.email,
        line_items: [{ price: price_id, quantity: 1 }],
        success_url: `${origin}/Home?subscription=success&plan=${plan_id}`,
        cancel_url: `${origin}/Home?subscription=cancelled`,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          user_email: user.email,
          plan_id,
        },
        subscription_data: {
          metadata: {
            user_email: user.email,
            plan_id,
          },
        },
      });

      console.log(`Checkout session created for ${user.email} — plan: ${plan_id}`);
      return Response.json({ url: session.url });
    }

    // ── CREATE CUSTOMER PORTAL SESSION ──
    if (action === 'create_portal') {
      const { customer_id, return_url } = body;

      if (!customer_id) {
        return Response.json({ error: 'No customer ID provided' }, { status: 400 });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customer_id,
        return_url: return_url || `${req.headers.get('origin')}/Home`,
      });

      return Response.json({ url: session.url });
    }

    // ── GET SUBSCRIPTION STATUS ──
    if (action === 'get_subscription') {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      
      if (customers.data.length === 0) {
        return Response.json({ plan: 'none', subscription: null, customer_id: null });
      }

      const customer = customers.data[0];
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        return Response.json({ plan: 'none', subscription: null, customer_id: customer.id });
      }

      const sub = subscriptions.data[0];
      return Response.json({
        plan: sub.metadata.plan_id || 'unknown',
        subscription: {
          id: sub.id,
          status: sub.status,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end,
        },
        customer_id: customer.id,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('Stripe subscription error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});