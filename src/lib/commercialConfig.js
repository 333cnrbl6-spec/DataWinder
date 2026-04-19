/**
 * DATAWINDER COMMERCIAL READINESS CONFIG
 * =======================================
 * SynergyFlow Board-Approved Commercial Infrastructure
 * Status: SEALED — awaiting board activation directive
 *
 * TO ACTIVATE: Set COMMERCIAL_MODE = true
 * TO ACTIVATE ONBOARDING: Set ONBOARDING_ENABLED = true
 * TO ACTIVATE PAYWALL: Set PAYWALL_ENABLED = true
 *
 * DO NOT MODIFY without board approval.
 */

export const COMMERCIAL_CONFIG = {
  // Master switch — when false, ALL commercial features are invisible
  COMMERCIAL_MODE: false,

  // Individual feature gates (only active if COMMERCIAL_MODE = true)
  PAYWALL_ENABLED: false,
  ONBOARDING_ENABLED: false,

  // Pricing tiers (GBP) — board approved April 2026
  PLANS: {
    starter: {
      id: 'starter',
      name: 'Starter',
      price_gbp: 39,
      price_monthly_label: '£39/mo',
      description: 'For individual conservation researchers',
      limits: {
        surveys: 3,
        species: 50,
        ai_reports: false,
        pdf_export: false,
        team_seats: 1,
      },
      stripe_price_id: null, // Set when Stripe products are created
    },
    professional: {
      id: 'professional',
      name: 'Professional',
      price_gbp: 99,
      price_monthly_label: '£99/mo',
      description: 'For conservation teams & consultancies',
      limits: {
        surveys: -1,       // unlimited
        species: -1,       // unlimited
        ai_reports: true,
        pdf_export: true,
        team_seats: 5,
      },
      stripe_price_id: null,
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      price_gbp: 249,
      price_monthly_label: '£249/mo',
      description: 'For universities, trusts & Natural England',
      limits: {
        surveys: -1,
        species: -1,
        ai_reports: true,
        pdf_export: true,
        team_seats: -1,   // unlimited
      },
      stripe_price_id: null,
    },
  },

  // Target market — for future marketing pages
  TARGET_MARKETS: [
    'UK Conservation Organisations',
    'Zoological Societies',
    'Natural England',
    'Wildlife Trusts',
    'Universities',
    'Environmental Consultancies',
  ],
};

/**
 * Check if a feature is currently active.
 * All features return TRUE when COMMERCIAL_MODE is false (existing users unaffected).
 */
export function isFeatureEnabled(featureName) {
  if (!COMMERCIAL_CONFIG.COMMERCIAL_MODE) return true; // Open access until commercial launch
  
  switch (featureName) {
    case 'paywall': return COMMERCIAL_CONFIG.PAYWALL_ENABLED;
    case 'onboarding': return COMMERCIAL_CONFIG.ONBOARDING_ENABLED;
    default: return true;
  }
}

/**
 * Check if a user's plan allows a feature.
 * Returns true when paywall is disabled (pre-commercial launch).
 */
export function canUserAccess(userPlan, featureKey) {
  if (!COMMERCIAL_CONFIG.COMMERCIAL_MODE || !COMMERCIAL_CONFIG.PAYWALL_ENABLED) return true;
  const plan = COMMERCIAL_CONFIG.PLANS[userPlan || 'starter'];
  if (!plan) return false;
  const limit = plan.limits[featureKey];
  if (limit === -1 || limit === true) return true;
  if (limit === false) return false;
  return true;
}