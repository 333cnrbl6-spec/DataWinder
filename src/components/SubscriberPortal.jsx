import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, CreditCard, LogOut } from 'lucide-react';

export default function SubscriberPortal() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const user = await base44.auth.me();
        const tier = user.subscription_tier || 'free';
        const renewalDate = user.subscription_renewal_date;
        const stripeCustomerId = user.stripe_customer_id;

        setSubscription({
          tier,
          renewalDate,
          stripeCustomerId,
          status: tier === 'free' ? 'inactive' : 'active'
        });
      } catch (err) {
        setError('Failed to load subscription');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubscription();
  }, []);

  const handleBillingPortal = async () => {
    try {
      // Redirect to Stripe billing portal
      if (subscription?.stripeCustomerId) {
        window.location.href = `${window.location.origin}/billing-portal?customer_id=${subscription.stripeCustomerId}`;
      }
    } catch (err) {
      console.error('Billing portal error:', err);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-40 bg-slate-200 rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Subscription
        </CardTitle>
        <CardDescription>
          Manage your DataWinder subscription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm text-slate-600">Current Plan</p>
              <p className="font-semibold capitalize">
                {subscription?.tier === 'free' ? 'Free (Trial)' : 'DataWinder Pro'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {subscription?.status === 'active' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-600" />
              )}
              <span className="text-xs font-medium capitalize text-slate-600">
                {subscription?.status}
              </span>
            </div>
          </div>

          {subscription?.renewalDate && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Renewal Date</p>
              <p className="font-medium">
                {new Date(subscription.renewalDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-4 border-t">
          {subscription?.status === 'active' && (
            <Button
              onClick={handleBillingPortal}
              variant="outline"
              className="w-full"
            >
              Manage Billing
            </Button>
          )}
          <Button
            onClick={() => window.location.href = '/Pricing'}
            className="w-full"
          >
            {subscription?.tier === 'free' ? 'Upgrade to Pro' : 'View Plans'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}