import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Zap } from 'lucide-react';

/**
 * Paywall component for Pro-tier features
 * Shows upgrade prompt if user isn't on Pro plan
 */
export default function SubscriptionPaywall({ feature = 'This feature' }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isBangorUser, setIsBangorUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u) {
        setUser(u);
        setIsBangorUser(u.email?.endsWith('@bangor.ac.uk'));
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-bangor-red rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-bangor-red" />
            <CardTitle>Pro Feature</CardTitle>
          </div>
          <CardDescription>Upgrade to unlock advanced tools</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 mb-1">{feature} is a Pro feature</p>
              <p className="text-sm text-amber-800">
                Upgrade your account to access advanced SDM tools, unlimited projects, and priority support.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate('/Pricing')}
              className="w-full px-4 py-2 bg-bangor-red hover:bg-bangor-red/90 text-white rounded-lg font-semibold transition"
            >
              View Pricing
            </button>

            {isBangorUser && user && (
              <p className="text-xs text-slate-600 text-center">
                You have a free Bangor account. Pro features are available only with Pro subscription.
              </p>
            )}

            {!user && (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Sign In
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}