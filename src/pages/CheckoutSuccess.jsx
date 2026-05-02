import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Loader } from 'lucide-react';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState('processing');
  const [tier, setTier] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCheckout = async () => {
      try {
        if (!sessionId) {
          setError('Invalid session. Please contact support.');
          setStatus('error');
          return;
        }

        // Call backend to verify payment and update subscription
        const response = await base44.functions.invoke('handleCheckoutSuccess', {
          session_id: sessionId,
        });

        if (response.data?.success) {
          setTier(response.data.tier);
          setStatus('success');

          // Track successful upgrade
          await base44.analytics.track({
            eventName: 'payment_processed',
            properties: {
              tier: response.data.tier,
              session_id: sessionId
            }
          });

          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate('/ResearcherDashboard');
          }, 3000);
        } else {
          setError(response.data?.error || 'Payment verification failed');
          setStatus('error');
        }
      } catch (err) {
        console.error('Checkout success error:', err);
        setError(err.message || 'Failed to process payment');
        setStatus('error');
      }
    };

    processCheckout();
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {status === 'processing' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <Loader className="w-12 h-12 text-bangor-red animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Processing your payment...</h1>
              <p className="text-slate-400">Please wait while we activate your subscription.</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
              <p className="text-slate-300 mb-4">Your subscription to <span className="font-semibold capitalize">{tier}</span> plan is now active.</p>
              <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-400 mb-2">You now have access to:</p>
                <ul className="text-left space-y-1 text-sm text-slate-300">
                  {tier === 'starter' && (
                    <>
                      <li>✓ 10,000 occurrences/month</li>
                      <li>✓ Unlimited projects</li>
                      <li>✓ Advanced SDM tools</li>
                    </>
                  )}
                  {tier === 'pro' && (
                    <>
                      <li>✓ Unlimited occurrences</li>
                      <li>✓ Unlimited projects</li>
                      <li>✓ Full SDM suite (MaxEnt + Ensemble)</li>
                      <li>✓ Climate scenario projections</li>
                      <li>✓ API access</li>
                    </>
                  )}
                  {tier === 'enterprise' && (
                    <>
                      <li>✓ Everything in Pro</li>
                      <li>✓ Dedicated support</li>
                      <li>✓ Custom integrations</li>
                      <li>✓ SLA guarantee</li>
                    </>
                  )}
                </ul>
              </div>
              <p className="text-slate-400 text-sm mb-6">Redirecting to your dashboard in 3 seconds...</p>
              <Link to="/ResearcherDashboard">
                <Button className="w-full bg-bangor-red hover:bg-bangor-red/90 gap-2">
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Payment Processing Error</h1>
              <p className="text-red-400 mb-4">{error}</p>
              <p className="text-slate-400 text-sm mb-6">
                If you were charged, your subscription will be activated within 24 hours. Contact support if this doesn't resolve.
              </p>
            </div>
            <div className="space-y-3">
              <Link to="/Pricing">
                <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-800">
                  Back to Pricing
                </Button>
              </Link>
              <a href="mailto:support@datawinder.app">
                <Button className="w-full bg-bangor-red hover:bg-bangor-red/90">
                  Contact Support
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}