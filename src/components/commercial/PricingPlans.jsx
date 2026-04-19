/**
 * DATAWINDER PRICING PLANS UI
 * ============================
 * SynergyFlow Commercial Infrastructure — SEALED
 * Status: Not rendered anywhere. Import when board activates commercial launch.
 *
 * Usage: <PricingPlans onSelectPlan={(planId) => ...} currentPlan="none" />
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Check, Zap, Shield, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COMMERCIAL_CONFIG } from '@/lib/commercialConfig';

const PLAN_ICONS = { starter: Zap, professional: Shield, enterprise: Building2 };
const PLAN_COLORS = {
  starter: 'border-slate-200 bg-white',
  professional: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200',
  enterprise: 'border-blue-300 bg-blue-50',
};

export default function PricingPlans({ currentPlan = 'none', onClose }) {
  const [loading, setPlanLoading] = useState(null);

  const handleSelectPlan = async (planId) => {
    const plan = COMMERCIAL_CONFIG.PLANS[planId];
    if (!plan.stripe_price_id) {
      alert('Stripe product IDs not yet configured. Set stripe_price_id in commercialConfig.js after creating products.');
      return;
    }

    // Block if in iframe
    if (window !== window.top) {
      alert('Subscription checkout is only available from the published app, not within an embedded preview.');
      return;
    }

    setPlanLoading(planId);
    try {
      const response = await base44.functions.invoke('stripeSubscription', {
        action: 'create_checkout',
        plan_id: planId,
        price_id: plan.stripe_price_id,
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (e) {
      alert('Failed to start checkout: ' + e.message);
    } finally {
      setPlanLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">DataWinder Plans</h2>
              <p className="text-slate-400 text-sm mt-1">Professional biodiversity intelligence for UK conservation</p>
            </div>
            {onClose && (
              <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">✕ Close</button>
            )}
          </div>
        </div>

        {/* Plans grid */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(COMMERCIAL_CONFIG.PLANS).map((plan) => {
            const Icon = PLAN_ICONS[plan.id];
            const isCurrent = currentPlan === plan.id;
            const isPopular = plan.id === 'professional';

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 p-6 flex flex-col ${PLAN_COLORS[plan.id]}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-slate-700" />
                  <h3 className="font-bold text-slate-900">{plan.name}</h3>
                </div>

                <div className="mb-3">
                  <span className="text-3xl font-extrabold text-slate-900">{plan.price_monthly_label}</span>
                  <span className="text-slate-500 text-sm ml-1">+ VAT</span>
                </div>

                <p className="text-xs text-slate-500 mb-4">{plan.description}</p>

                <ul className="space-y-2 flex-1 mb-6">
                  <FeatureRow label={plan.limits.surveys === -1 ? 'Unlimited surveys' : `${plan.limits.surveys} surveys`} />
                  <FeatureRow label={plan.limits.species === -1 ? 'Unlimited species' : `${plan.limits.species} species`} />
                  <FeatureRow label="AI Field Reports" enabled={plan.limits.ai_reports} />
                  <FeatureRow label="PDF Export" enabled={plan.limits.pdf_export} />
                  <FeatureRow label={plan.limits.team_seats === -1 ? 'Unlimited seats' : `${plan.limits.team_seats} team seat${plan.limits.team_seats > 1 ? 's' : ''}`} />
                </ul>

                {isCurrent ? (
                  <div className="text-center text-sm font-semibold text-emerald-700 bg-emerald-100 rounded-lg py-2">
                    Current Plan
                  </div>
                ) : (
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading === plan.id}
                    className={isPopular
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white w-full'
                      : 'bg-slate-900 hover:bg-slate-800 text-white w-full'}
                  >
                    {loading === plan.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : `Choose ${plan.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-8 pb-6 text-center text-xs text-slate-400">
          All plans billed monthly. Cancel anytime. Prices exclude VAT. Charity and multi-year discounts available — contact us.
        </div>
      </motion.div>
    </div>
  );
}

function FeatureRow({ label, enabled = true }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <Check className={`w-4 h-4 shrink-0 ${enabled ? 'text-emerald-500' : 'text-slate-300'}`} />
      <span className={enabled ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
    </li>
  );
}