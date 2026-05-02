import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { UpgradePrompt } from '@/components/UpgradePrompt';

/**
 * ProFeatureGate: Wraps Pro-only features and shows paywall if user isn't Pro
 * 
 * Usage:
 * <ProFeatureGate featureName="Climate Scenarios">
 *   <ClimateScenarioComponent />
 * </ProFeatureGate>
 */

export default function ProFeatureGate({ children, featureName = 'Feature' }) {
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(user => {
      setTier(user?.subscription_tier || 'free');
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading...</div>;
  }

  const isPro = tier === 'pro' || tier === 'starter' || tier === 'enterprise';

  if (!isPro) {
    return <UpgradePrompt feature={featureName} />;
  }

  return children;
}