import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

/**
 * Shows current user tier and upgrade prompt
 */
export default function TierStatusBadge() {
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('detectUserTier', {})
      .then(res => setTier(res.data.tier))
      .catch(() => setTier('free'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  const tierConfig = {
    free_bangor: { label: 'Free Academic', variant: 'secondary', color: 'text-blue-700' },
    pro: { label: 'Pro', variant: 'default', color: 'text-white' },
    free_trial: { label: 'Free Trial', variant: 'outline', color: 'text-slate-700' },
  };

  const config = tierConfig[tier] || tierConfig.free_trial;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={config.variant} className={config.color}>
        {tier === 'pro' && <Zap className="w-3 h-3 mr-1" />}
        {config.label}
      </Badge>
    </div>
  );
}