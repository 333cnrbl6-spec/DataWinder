import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return Response.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only process if payment succeeded
    if (session.payment_status !== 'paid') {
      return Response.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Update user subscription
    const planMap = {
      'datawinder-starter': 'starter',
      'datawinder-pro': 'pro',
      'datawinder-enterprise': 'enterprise'
    };

    const plan = planMap[session.client_reference_id] || 'pro';

    await base44.auth.updateMe({
      subscription_tier: plan,
      subscription_status: 'active',
      stripe_customer_id: session.customer,
      subscription_started_at: new Date().toISOString(),
    });

    console.log(`User ${user.email} upgraded to ${plan} via Stripe`);

    // Track analytics
    await base44.analytics.track({
      eventName: 'payment_success',
      properties: {
        plan,
        session_id,
        customer_email: user.email
      }
    });

    return Response.json({
      success: true,
      message: 'Subscription activated',
      tier: plan
    });

  } catch (error) {
    console.error('Checkout success handler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});