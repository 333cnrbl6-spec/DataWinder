import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan_id, billing_interval = 'month' } = await req.json();

    // Stripe product & price IDs
    const plans = {
      'datawinder-pro-monthly': 'price_1TShi7Cw5m86DE5ZdM23voCq',   // £99/month
      'datawinder-pro-annual': 'price_1TShi7Cw5m86DE5ZrlAacaWb'     // £990/year (2 months free)
    };

    const priceId = plans[plan_id];
    if (!priceId) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Check for iframe (preview mode) — CRITICAL SECURITY CHECK
    const origin = req.headers.get('origin');
    const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
    const isPreview = origin && (origin.includes('preview') || origin.includes('base44.dev'));
    
    if (!origin || isLocalhost || isPreview) {
      console.warn(`Blocked checkout from non-production origin: ${origin}`);
      return Response.json({ 
        error: 'Checkout must be completed from published app' 
      }, { status: 400 });
    }

    // Create/update Stripe customer (idempotent)
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.full_name || 'User',
          metadata: {
            base44_user_id: user.id,
            email: user.email
          }
        });
        customerId = customer.id;
        
        // Store customer ID on user for future checkouts
        await base44.asServiceRole.entities.User.update(user.id, {
          stripe_customer_id: customerId
        });
      } catch (err) {
        console.error('Failed to create Stripe customer:', err.message);
        throw new Error('Failed to create payment account');
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/Pricing`,
      client_reference_id: user.id,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        plan_id,
        user_id: user.id,
        user_email: user.email
      }
    });

    // Track checkout event
    await base44.analytics.track({
      eventName: 'checkout_started',
      properties: {
        plan_id,
        session_id: session.id,
        billing_interval
      }
    });

    console.log(`Checkout session created: ${session.id} for ${user.email} (${plan_id})`);

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id
    });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});