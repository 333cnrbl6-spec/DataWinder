import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function useSubscriptionStatus() {
  const [tier, setTier] = useState(null);
  const [trialStatus, setTrialStatus] = useState(null);
  const [usageLimit, setUsageLimit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);

        // Get user tier
        const user = await base44.auth.me();
        setTier(user?.subscription_tier || 'free');

        // Check trial status
        const trialResponse = await base44.functions.invoke('checkTrialExpiration', {});
        setTrialStatus(trialResponse.data);

        // Check usage limits
        const usageResponse = await base44.functions.invoke('checkUsageLimit', {});
        setUsageLimit(usageResponse.data);

      } catch (err) {
        console.error('Subscription status error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return {
    tier,
    trialStatus,
    usageLimit,
    loading,
    error,
    isFree: tier === 'free',
    isPro: tier === 'pro' || tier === 'starter' || tier === 'enterprise',
    trialExpired: trialStatus?.trial_expired,
    usageWarning: usageLimit?.warning,
    usageExceeded: usageLimit?.exceeded,
  };
}