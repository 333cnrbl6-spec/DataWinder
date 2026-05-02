import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader } from 'lucide-react';

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const priceId = searchParams.get('priceId');
  const plan = searchParams.get('plan') || 'pro';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(user => {
      if (!user) {
        navigate('/Landing');
        return;
      }
      // Don't allow already-pro/paid users to checkout
      if (user.subscription_tier === 'pro') {
        navigate('/ResearcherDashboard');
        return;
      }
      // Allow trial & free users to upgrade
      setUser(user);
    }).catch(() => navigate('/Landing'));
  }, [navigate]);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
     // Check if running in preview/iframe
     if (window.self !== window.top || window.location.hostname.includes('preview')) {
       setError('Checkout only works from the published app. Please visit the live site to upgrade.');
       setLoading(false);
       return;
     }

     // Determine plan based on user tier
     let planId = `datawinder-pro-monthly`;
     if (plan === 'pro-annual') {
       planId = `datawinder-pro-annual`;
     }

     // Track checkout event
     await base44.analytics.track({
       eventName: 'checkout_initiated',
       properties: { plan: planId }
     });

     const response = await base44.functions.invoke('createStripeCheckout', {
       plan_id: planId,
     });

     if (response.data?.checkout_url) {
       window.location.href = response.data.checkout_url;
     } else {
       setError('Failed to create checkout session');
     }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const planDetails = {
    pro: {
      name: 'DataWinder Pro',
      price: '£99',
      period: '/month',
      features: ['Unlimited projects', 'Unlimited occurrences', 'Priority support', 'Advanced SDM tools', 'API access', 'Custom integrations'],
    },
  };

  const planInfo = planDetails[plan] || planDetails.pro;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/Pricing')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Pricing
        </button>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">{planInfo.name}</CardTitle>
            <CardDescription>Complete your subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Summary */}
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="text-sm text-slate-300">Order Summary</div>
              <div className="flex justify-between items-baseline">
                <span className="text-white">{planInfo.name}</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-white">{planInfo.price}</span>
                  <span className="text-sm text-slate-400">{planInfo.period}</span>
                </div>
              </div>
              <div className="border-t border-slate-600 pt-3 flex justify-between font-semibold text-white">
                <span>Total due today</span>
                <span>{planInfo.price}</span>
              </div>
            </div>

            {/* User Info */}
            {user && (
              <div className="bg-slate-700/30 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-2">Billing to:</p>
                <p className="text-white font-semibold">{user.full_name}</p>
                <p className="text-slate-300">{user.email}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Features Preview */}
            <div className="space-y-2 py-4 border-t border-b border-slate-700">
              <p className="text-xs text-slate-400 uppercase font-semibold">Includes:</p>
              <ul className="space-y-2">
                {planInfo.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Checkout Button */}
            <Button
              onClick={handleCheckout}
              disabled={loading || !user}
              className="w-full bg-bangor-red hover:bg-bangor-red/90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                `Pay ${planInfo.price}`
              )}
            </Button>

            {/* Test Mode Notice */}
            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-sm text-yellow-200">
              <p className="font-semibold mb-1">Test Mode</p>
              <p>Use card <code className="bg-slate-700 px-2 py-1 rounded text-xs">4242 4242 4242 4242</code> to test</p>
            </div>

            {/* Terms */}
            <p className="text-xs text-slate-400 text-center">
              By subscribing, you agree to our{' '}
              <a href="/TermsOfService" className="text-bangor-red hover:underline">Terms of Service</a> and{' '}
              <a href="/PrivacyPolicy" className="text-bangor-red hover:underline">Privacy Policy</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}