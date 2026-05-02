import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { UpgradePrompt } from '@/components/UpgradePrompt';

// Usage limits for free tier
const FREE_TIER_LIMITS = {
  max_exports_per_month: 5,
  max_file_upload_mb: 10,
  max_species_per_project: 50,
  max_storage_mb: 500
};

export default function FreeTierLimiter({ feature, children }) {
  const [userTier, setUserTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [limitExceeded, setLimitExceeded] = useState(false);

  useEffect(() => {
    const checkTier = async () => {
      try {
        const user = await base44.auth.me();
        const tier = user.subscription_tier || 'free';
        setUserTier(tier);
        
        // Check if free tier limit exceeded for this feature
        if (tier === 'free' && FREE_TIER_LIMITS[feature]) {
          // Would check usage here via API
          setLimitExceeded(false); // Simplified for now
        }
      } catch (err) {
        console.error('Tier check failed:', err);
      } finally {
        setLoading(false);
      }
    };
    checkTier();
  }, [feature]);

  if (loading) return <div className="animate-pulse h-20 bg-slate-200 rounded" />;

  // Pro users get full access
  if (userTier === 'pro') {
    return children;
  }

  // Free tier - show upgrade prompt if limit exceeded
  if (userTier === 'free' && limitExceeded) {
    return <UpgradePrompt feature={feature} />;
  }

  return children;
}