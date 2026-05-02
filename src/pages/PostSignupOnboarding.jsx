import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Zap, Leaf } from 'lucide-react';

/**
 * Post-signup onboarding page
 * Detects Bangor email domain and assigns tier automatically
 */
export default function PostSignupOnboarding() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTierAndOnboard = async () => {
      try {
        // Get current user
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Detect tier based on email domain
        const response = await base44.functions.invoke('detectUserTier', {});
        setTier(response.data.tier);

        // Auto-save tier to user metadata and set trial expiration (14 days from now)
         if (currentUser) {
           const trialExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
           await base44.auth.updateMe({ 
             subscription_tier: response.data.tier,
             trial_expires_at: trialExpiresAt,
             subscription_status: 'active'
           });
         }
      } catch (error) {
        console.error('Tier detection failed:', error);
        setTier('free');
      } finally {
        setLoading(false);
      }
    };

    checkTierAndOnboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-bangor-red rounded-full animate-spin"></div>
      </div>
    );
  }

  const isBangorUser = user?.email?.endsWith('@bangor.ac.uk');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Leaf className="w-8 h-8 text-bangor-red" />
            <span className="text-2xl font-bold text-bangor-red">DataWinder</span>
          </div>
          <CardTitle>
            {isBangorUser ? 'Welcome to DataWinder' : 'Your 14-Day Trial Starts Now'}
            </CardTitle>
            <CardDescription>
              {isBangorUser
                ? 'Your Free Academic account is ready'
                : 'Full Pro access for 14 days — no credit card required'}
            </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Bangor User Path */}
          {isBangorUser ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900">Free Academic Account Activated</p>
                    <p className="text-sm text-green-800 mt-1">
                      Your @bangor.ac.uk email has been verified. Enjoy unlimited access to core biodiversity tools.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="font-semibold text-slate-900">Projects</p>
                  <p className="text-slate-600">Unlimited</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="font-semibold text-slate-900">Team Members</p>
                  <p className="text-slate-600">5+</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="font-semibold text-slate-900">SDM Tools</p>
                  <p className="text-slate-600">Core Suite</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="font-semibold text-slate-900">Support</p>
                  <p className="text-slate-600">Community</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/ResearcherDashboard')}
                className="w-full px-4 py-2 bg-bangor-red hover:bg-bangor-red/90 text-white rounded-lg font-semibold transition"
              >
                Start Using DataWinder →
              </button>

              <p className="text-xs text-slate-500 text-center">
                Want priority support and advanced tools? You can upgrade to Pro at any time.
              </p>
            </div>
          ) : (
            /* Non-Bangor User Path */
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Welcome! Choose a plan to access DataWinder's biodiversity tools.
                </p>
              </div>

              <div className="space-y-3">
                <div className="border rounded-lg p-4 space-y-3 hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => navigate('/Pricing?plan=trial')}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">14-Day Trial</p>
                      <p className="text-sm text-slate-600">Full Pro access for 14 days</p>
                    </div>
                    <p className="text-lg font-bold text-slate-900">£0</p>
                  </div>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>✓ Unlimited projects</li>
                    <li>✓ Advanced SDM tools</li>
                    <li>✓ Priority support</li>
                  </ul>
                </div>

                <div className="border-2 border-bangor-red rounded-lg p-4 space-y-3 bg-red-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">Upgrade After Trial</p>
                        <span className="text-xs bg-bangor-red text-white px-2 py-0.5 rounded">AFTER DAY 14</span>
                      </div>
                      <p className="text-sm text-slate-600">Continue with Pro at £99/month</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-bangor-red">£99</p>
                      <p className="text-xs text-slate-600">/month</p>
                    </div>
                  </div>
                  <ul className="text-sm text-slate-700 space-y-1 font-medium">
                    <li>✓ Unlimited projects</li>
                    <li>✓ Advanced SDM tools</li>
                    <li>✓ Climate projections</li>
                    <li>✓ API access</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => navigate('/Pricing')}
                className="w-full px-4 py-2 bg-bangor-red hover:bg-bangor-red/90 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Choose a Plan
              </button>

              <button
                onClick={() => navigate('/ResearcherDashboard')}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Explore as Guest
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}