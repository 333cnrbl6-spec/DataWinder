import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import useSubscriptionStatus from '@/hooks/useSubscriptionStatus';

export default function UsageWarning() {
  const { usageLimit, tier } = useSubscriptionStatus();

  // Don't show for unlimited tiers
  if (tier === 'pro' || tier === 'enterprise' || !usageLimit) return null;

  if (usageLimit.exceeded) {
    return (
      <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-300 mb-1">Usage Limit Exceeded</h3>
            <p className="text-sm text-red-200 mb-3">
              You've exceeded your {usageLimit.limit} occurrence limit for this month. Upgrade to Pro for unlimited access.
            </p>
            <Link to="/Pricing">
              <Button size="sm" className="bg-red-600 hover:bg-red-700">Upgrade Plan</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (usageLimit.warning && usageLimit.percentage >= 80) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-300 mb-1">Approaching Usage Limit</h3>
            <p className="text-sm text-yellow-200 mb-2">
              You've used {usageLimit.used} of {usageLimit.limit} occurrences ({Math.round(usageLimit.percentage)}%).
            </p>
            <p className="text-sm text-yellow-200 mb-3">
              Remaining: {usageLimit.remaining}
            </p>
            <Link to="/Pricing">
              <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">View Pro Plan</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}