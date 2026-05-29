import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Zap } from 'lucide-react';

export default function PostSignupOnboarding() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTierAndOnboard = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const response = await base44.functions.invoke('detectUserTier', {});
        setTier(response.data.tier);
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
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0A1E3F 0%, #0d2a57 100%)' }}>
        <div className="w-8 h-8 border-4 border-white/20 border-t-[#007BFF] rounded-full animate-spin" />
      </div>
    );
  }

  const isBangorUser = user?.email?.endsWith('@bangor.ac.uk');

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0A1E3F 0%, #0d2a57 100%)',
        fontFamily: "'Poppins','Inter','Segoe UI',sans-serif",
      }}
    >
      {/* Background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{ background: '#007BFF' }} />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl"
        style={{ background: '#FF7A00' }} />

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="https://media.base44.com/images/public/69821d606837970a4a3c0ef2/d24c044e9_Copilot_20260529_104018.png"
            alt="DataWinder"
            className="h-12 object-contain mx-auto mb-3"
            style={{ filter: 'drop-shadow(0 0 12px rgba(0,123,255,0.4))' }}
          />
          <h1 className="text-white text-2xl font-bold">
            {isBangorUser ? 'Welcome to DataWinder' : 'Your 14-Day Trial Starts Now'}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {isBangorUser
              ? 'Your Free Academic account is ready'
              : 'Full Pro access for 14 days — no credit card required'}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 border border-white/10"
          style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
        >
          {isBangorUser ? (
            <div className="space-y-4">
              <div className="rounded-xl p-4 border border-green-500/30"
                style={{ background: 'rgba(34,197,94,0.1)' }}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Free Academic Account Activated</p>
                    <p className="text-sm text-white/70 mt-1">
                      Your @bangor.ac.uk email has been verified. Enjoy unlimited access to core biodiversity tools.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Projects', value: 'Unlimited' },
                  { label: 'Team Members', value: '5+' },
                  { label: 'SDM Tools', value: 'Core Suite' },
                  { label: 'Support', value: 'Community' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-3 border border-white/10"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <p className="font-semibold text-white text-xs uppercase tracking-wider">{label}</p>
                    <p className="text-white/70 text-sm mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/ResearcherDashboard')}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(90deg, #007BFF 0%, #0056CC 100%)',
                  boxShadow: '0 4px 16px rgba(0,123,255,0.4)',
                }}
              >
                Start Using DataWinder &#8594;
              </button>

              <p className="text-white/40 text-xs text-center">
                Want priority support and advanced tools? You can upgrade to Pro at any time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl p-4 border border-[#007BFF]/30"
                style={{ background: 'rgba(0,123,255,0.08)' }}>
                <p className="text-sm text-white/80">
                  Welcome! Choose a plan to access DataWinder's biodiversity tools.
                </p>
              </div>

              <div className="space-y-3">
                <div
                  className="border border-white/15 rounded-xl p-4 space-y-3 cursor-pointer transition-all hover:border-[#007BFF]/50"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                  onClick={() => navigate('/Pricing?plan=trial')}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white">14-Day Trial</p>
                      <p className="text-sm text-white/60">Full Pro access for 14 days</p>
                    </div>
                    <p className="text-lg font-bold text-white">£0</p>
                  </div>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li>&#10003; Unlimited projects</li>
                    <li>&#10003; Advanced SDM tools</li>
                    <li>&#10003; Priority support</li>
                  </ul>
                </div>

                <div
                  className="rounded-xl p-4 space-y-3 border border-[#FF7A00]/40"
                  style={{ background: 'rgba(255,122,0,0.08)' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">Upgrade After Trial</p>
                        <span className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{ background: '#FF7A00', color: 'white' }}>AFTER DAY 14</span>
                      </div>
                      <p className="text-sm text-white/60">Continue with Pro at £99/month</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: '#FF7A00' }}>£99</p>
                      <p className="text-xs text-white/50">/month</p>
                    </div>
                  </div>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li>&#10003; Unlimited projects</li>
                    <li>&#10003; Advanced SDM tools</li>
                    <li>&#10003; Climate projections</li>
                    <li>&#10003; API access</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => navigate('/Pricing')}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(90deg, #007BFF 0%, #0056CC 100%)',
                  boxShadow: '0 4px 16px rgba(0,123,255,0.4)',
                }}
              >
                <Zap className="w-4 h-4" />
                Choose a Plan
              </button>

              <button
                onClick={() => navigate('/ResearcherDashboard')}
                className="w-full py-3 rounded-xl border border-white/20 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Explore as Guest
              </button>
            </div>
          )}
        </div>

        <p className="text-white/20 text-xs text-center mt-4">
          &#169; {new Date().getFullYear()} SynergyFlow Group &middot; DataWinder BETA &middot; BASE44 Platform
        </p>
      </div>
    </div>
  );
}