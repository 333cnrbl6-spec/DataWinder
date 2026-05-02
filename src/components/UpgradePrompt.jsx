import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Zap } from 'lucide-react';

/**
 * Dismissible upgrade prompt for free users accessing Pro features
 */
export default function UpgradePrompt({ feature = 'Advanced tools' }) {
  const navigate = useNavigate();
  const [tier, setTier] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('detectUserTier', {})
      .then(res => setTier(res.data.tier))
      .catch(() => setTier('free'))
      .finally(() => setLoading(false));
  }, []);

  if (loading || dismissed || !tier || tier === 'pro') return null;

  return (
    <Card className="border-bangor-red/30 bg-red-50">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Zap className="w-5 h-5 text-bangor-red flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-slate-900">
                {feature} is a Pro feature
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Unlock advanced SDM tools, unlimited projects, and priority support with a Pro subscription.
              </p>
              <button
                onClick={() => navigate('/Pricing')}
                className="text-sm font-semibold text-bangor-red hover:underline mt-2"
              >
                View Pricing →
              </button>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}