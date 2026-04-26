import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Lock, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function SubscriptionPaywall({ feature = 'AI Reports', requiredPlan = 'professional' }) {
  const planDetails = {
    starter: { name: 'Starter', price: '£39/mo', features: ['Basic surveys', '3 concurrent models'] },
    professional: { name: 'Professional', price: '£99/mo', features: ['Unlimited surveys', 'AI reports', 'PDF export', '5 team seats'] },
    enterprise: { name: 'Enterprise', price: '£249/mo', features: ['Everything in Pro', 'Unlimited team seats', 'SLA guarantee', 'Custom integrations'] }
  };

  const checkoutMutation = useMutation({
    mutationFn: async (plan_id) => {
      // Check if in iframe
      if (window !== window.top) {
        toast.error('Checkout only works from published app');
        return;
      }

      const response = await base44.functions.invoke('createStripeCheckout', {
        plan_id,
        email: 'user@example.com'
      });
      
      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    },
    onError: (error) => {
      toast.error('Failed to start checkout: ' + error.message);
    }
  });

  return (
    <Card className="border-2 border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <Lock className="w-5 h-5" />
          Premium Feature
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Message */}
        <div>
          <p className="font-semibold text-amber-900 mb-2">{feature} is available on Professional plans</p>
          <p className="text-sm text-amber-800">
            Upgrade to unlock AI-powered analysis, PDF exports, and advanced collaboration tools.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border border-slate-200">
            <CardContent className="pt-4">
              <p className="font-semibold text-slate-900">{planDetails.professional.name}</p>
              <p className="text-2xl font-bold text-slate-900 my-2">{planDetails.professional.price}</p>
              <ul className="text-xs text-slate-600 space-y-1 mb-4">
                {planDetails.professional.features.map((f, i) => (
                  <li key={i}>✓ {f}</li>
                ))}
              </ul>
              <Button
                onClick={() => checkoutMutation.mutate('datawinder-pro')}
                disabled={checkoutMutation.isPending}
                className="w-full gap-2 bg-bangor-red hover:bg-bangor-red/90 text-white text-sm h-8"
              >
                <Zap className="w-3 h-3" />
                Upgrade Now
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardContent className="pt-4">
              <p className="font-semibold text-slate-900">{planDetails.enterprise.name}</p>
              <p className="text-2xl font-bold text-slate-900 my-2">{planDetails.enterprise.price}</p>
              <ul className="text-xs text-slate-600 space-y-1 mb-4">
                {planDetails.enterprise.features.map((f, i) => (
                  <li key={i}>✓ {f}</li>
                ))}
              </ul>
              <Button
                onClick={() => checkoutMutation.mutate('datawinder-enterprise')}
                disabled={checkoutMutation.isPending}
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm h-8"
              >
                <Zap className="w-3 h-3" />
                Contact Sales
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <p className="text-xs text-amber-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          All plans include a 14-day free trial. No credit card required.
        </p>
      </CardContent>
    </Card>
  );
}