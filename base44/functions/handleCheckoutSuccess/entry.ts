import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { session_id } = await req.json();

    if (!session_id) {
      return Response.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Retrieve checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session || session.payment_status !== 'paid') {
      return Response.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Get the customer and user email
    const customerEmail = session.customer_email || session.customer_details?.email;
    const userId = session.client_reference_id;

    if (!customerEmail || !userId) {
      console.error(`Missing data for session ${session_id}: email=${customerEmail}, userId=${userId}`);
      return Response.json({ error: 'Missing customer data' }, { status: 400 });
    }

    // Update the user's subscription tier to 'pro' and mark as active
    await base44.asServiceRole.entities.User.update(userId, {
      subscription_tier: 'pro',
      subscription_status: 'active',
      subscription_started_at: new Date().toISOString(),
      stripe_customer_id: session.customer,
      stripe_session_id: session_id
    });

    // Track subscription event
    await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Log subscription activation for ${customerEmail} - Stripe session ${session_id}`
    }).catch(() => {
      // Non-critical, continue if logging fails
    });

    console.log(`✓ Subscription activated for ${customerEmail} (session: ${session_id})`);

    return Response.json({
      success: true,
      message: 'Subscription activated',
      email: customerEmail
    });
  } catch (error) {
    console.error('Checkout success handler error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});