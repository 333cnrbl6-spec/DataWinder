import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, LogOut, Settings, AlertCircle } from 'lucide-react';
import TrialCountdownBanner from '@/components/TrialCountdownBanner';
import SubscriberPortal from '@/components/SubscriberPortal';

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(err => {
      console.error('Failed to load user:', err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-bangor-red rounded-full animate-spin"></div>
      </div>
    );
  }

  const tierColors = {
    free: 'bg-slate-600',
    starter: 'bg-blue-600',
    pro: 'bg-bangor-red',
    enterprise: 'bg-purple-600'
  };

  const tierLabels = {
    free: 'Free Academic',
    starter: 'Starter',
    pro: 'Pro',
    enterprise: 'Enterprise'
  };

  const handleManageBilling = () => {
    if (user?.stripe_customer_id) {
      window.open(`https://billing.stripe.com/login/test/${user.stripe_customer_id}`, '_blank');
    } else {
      alert('No billing account found. Upgrade to Pro to manage billing.');
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout('/Landing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-slate-400 mt-2">Manage your profile and subscription</p>
        </div>

        <TrialCountdownBanner />

        {/* Profile Card */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Settings className="w-5 h-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">Full Name</p>
              <p className="text-white font-semibold">{user?.full_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Email</p>
              <p className="text-white font-semibold">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Role</p>
              <p className="text-white font-semibold capitalize">{user?.role || 'user'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Subscriber Portal */}
        <div className="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
          <SubscriberPortal />
        </div>

        {/* Subscription Card */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CreditCard className="w-5 h-5" />
              Subscription
            </CardTitle>
            <CardDescription>Current plan and billing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Current Plan</p>
                  <div className="flex items-center gap-2">
                    <span className={`${tierColors[user?.subscription_tier] || tierColors.free} px-3 py-1 rounded-full text-white text-sm font-semibold`}>
                      {tierLabels[user?.subscription_tier] || 'Free'}
                    </span>
                    <span className={`text-xs font-semibold ${
                      user?.subscription_status === 'active' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {user?.subscription_status?.charAt(0).toUpperCase() + user?.subscription_status?.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {user?.subscription_tier === 'free' && !user?.email?.endsWith('@bangor.ac.uk') && (
                <div className="text-sm text-slate-300">
                  Your 14-day trial includes full Pro access.
                </div>
              )}

              {user?.subscription_tier === 'free' && user?.email?.endsWith('@bangor.ac.uk') && (
                <div className="text-sm text-slate-300">
                  Free Academic plan for Bangor University members.
                </div>
              )}

              {user?.subscription_tier !== 'free' && (
                <div className="text-sm text-slate-300">
                  <p>Billed monthly at £{user?.subscription_tier === 'starter' ? '39' : '99'}</p>
                  {user?.subscription_started_at && (
                    <p className="text-xs text-slate-500 mt-1">
                      Started {new Date(user.subscription_started_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            {user?.subscription_tier !== 'free' && (
              <div className="space-y-3">
                <Button
                  onClick={handleManageBilling}
                  className="w-full bg-bangor-red hover:bg-bangor-red/90"
                >
                  Manage Billing & Payment Methods
                </Button>
                <p className="text-xs text-slate-400 text-center">
                  View invoices, update payment method, or cancel subscription
                </p>
              </div>
            )}

            {user?.subscription_tier === 'free' && !user?.email?.endsWith('@bangor.ac.uk') && (
              <a href="/Pricing">
                <Button className="w-full bg-bangor-red hover:bg-bangor-red/90">
                  Upgrade to Pro
                </Button>
              </a>
            )}
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Security & Access</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full border-red-600/50 text-red-400 hover:bg-red-900/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Info Banner */}
        <div className="mt-6 bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-semibold mb-1">Need Help?</p>
            <p>Contact support@datawinder.app for billing questions or account assistance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}