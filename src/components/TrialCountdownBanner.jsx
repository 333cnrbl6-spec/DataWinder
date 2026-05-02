import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function TrialCountdownBanner() {
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [trialActive, setTrialActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkTrial = async () => {
      try {
        const res = await base44.functions.invoke('checkTrialExpiration', {});
        if (res.data.trial_active) {
          setTrialActive(true);
          setDaysRemaining(res.data.days_remaining);
        }
      } catch (err) {
        console.error('Trial check failed:', err);
      } finally {
        setLoading(false);
      }
    };
    checkTrial();
  }, []);

  if (loading || !trialActive || daysRemaining === null) return null;

  const isUrgent = daysRemaining <= 3;
  const bgColor = isUrgent ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200';
  const textColor = isUrgent ? 'text-red-900' : 'text-blue-900';
  const iconColor = isUrgent ? 'text-red-600' : 'text-blue-600';

  return (
    <div className={`${bgColor} border rounded-lg p-4 mb-4 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        {isUrgent ? (
          <AlertCircle className={`w-5 h-5 ${iconColor}`} />
        ) : (
          <Clock className={`w-5 h-5 ${iconColor}`} />
        )}
        <div>
          <p className={`font-semibold ${textColor}`}>
            {daysRemaining === 0 
              ? 'Your trial has expired' 
              : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left in your trial`}
          </p>
          <p className={`text-sm ${textColor} opacity-75`}>
            Upgrade to Pro to keep using premium features
          </p>
        </div>
      </div>
      <Button
        onClick={() => navigate('/Pricing')}
        className="gap-2 shrink-0"
        size="sm"
      >
        <Zap className="w-4 h-4" />
        Upgrade Now
      </Button>
    </div>
  );
}