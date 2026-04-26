import Stripe from 'npm:stripe@latest';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { plan_id, email, customer_name } = payload;

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

    // Check for iframe
    const origin = req.headers.get('origin');
    if (origin?.includes('localhost') || origin?.includes('preview')) {
      return Response.json({ 
        error: 'Checkout must be completed from published app, not preview' 
      }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
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
      customer_email: email,
      client_reference_id: plan_id,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        plan_id,
        customer_name
      }
    });

    console.log(`Checkout session created: ${session.id} for plan ${plan_id}`);

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});