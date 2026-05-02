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

    const { plan_id } = await req.json();

    // Plan price mapping (in pence)
    const plans = {
      'datawinder-free': null,
      'datawinder-starter': 3900,    // £39
      'datawinder-pro': 9900,        // £99
      'datawinder-enterprise': 24900 // £249
    };

    const amount = plans[plan_id];
    if (amount === null) {
      return Response.json({ error: 'Free plan does not require payment' }, { status: 400 });
    }
    if (!amount) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Check for iframe (preview mode)
    const origin = req.headers.get('origin');
    if (origin?.includes('localhost') || origin?.includes('preview')) {
      return Response.json({ 
        error: 'Checkout must be completed from published app' 
      }, { status: 400 });
    }

    // Create/update Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: {
          base44_user_id: user.id,
          email: user.email
        }
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `DataWinder ${plan_id.split('-')[1].toUpperCase()} Plan`,
              description: 'Monthly subscription'
            },
            unit_amount: amount,
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: plan_id,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        plan_id,
        user_email: user.email
      }
    });

    // Track checkout event
    await base44.analytics.track({
      eventName: 'checkout_started',
      properties: {
        plan_id,
        session_id: session.id,
        amount
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