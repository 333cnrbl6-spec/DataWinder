import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import useSubscriptionStatus from '@/hooks/useSubscriptionStatus';

export default function TrialWarning() {
  const { trialStatus, tier } = useSubscriptionStatus();

  // Don't show for Bangor users or paid tiers
  if (tier !== 'free' || !trialStatus) return null;

  if (trialStatus.trial_expired) {
    return (
      <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-300 mb-1">Trial Expired</h3>
            <p className="text-sm text-red-200 mb-3">
              Your 14-day free trial has ended. Upgrade to Pro to continue using advanced features.
            </p>
            <Link to="/Pricing">
              <Button size="sm" className="bg-red-600 hover:bg-red-700">Upgrade Now</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (trialStatus.trial_active && trialStatus.days_remaining <= 3) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-300 mb-1">
              Trial Ending in {trialStatus.days_remaining} Days
            </h3>
            <p className="text-sm text-yellow-200 mb-3">
              Upgrade to Pro now to keep your work and unlock unlimited features.
            </p>
            <Link to="/Pricing">
              <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">View Plans</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}