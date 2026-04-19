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
    researcher: {
      id: 'researcher',
      name: 'Researcher',
      price_gbp: 0,
      price_monthly_label: 'Free Forever',
      description: 'For individual researchers & students',
      features: [
        'Search 4 data sources (IUCN, iNaturalist, GBIF, SpeciesLink)',
        'Unlimited species records',
        'Basic data cleaning & validation',
        'Single user access',
        'Export to CSV/GeoJSON',
        'Community forum access',
        'Email support'
      ],
      limits: {
        projects: 2,
        team_members: 1,
        concurrent_models: 1,
        storage_gb: 5,
        monthly_api_calls: 10000,
        data_quality_checks: 10,
        annotation_storage: false,
      },
      stripe_price_id: null,
      color: 'slate',
      badge: null,
    },
    professional: {
      id: 'professional',
      name: 'Professional',
      price_gbp: 79,
      price_monthly_label: '£79/month',
      description: 'For active conservation teams',
      features: [
        'Everything in Researcher, plus:',
        'Unlimited projects',
        'Up to 5 team members',
        '100 GB cloud storage',
        'Unlimited API calls',
        '50 concurrent SDM models/month',
        'Advanced data quality checks',
        'Priority email support',
        'Custom polygon filters & GIS layers',
        'Automated species comparison reports'
      ],
      limits: {
        projects: -1,
        team_members: 5,
        concurrent_models: 5,
        storage_gb: 100,
        monthly_api_calls: -1,
        data_quality_checks: -1,
        annotation_storage: true,
      },
      stripe_price_id: null,
      color: 'blue',
      badge: 'Most Popular',
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      price_gbp: 249,
      price_monthly_label: '£249/month',
      description: 'For universities, NGOs & institutions',
      features: [
        'Everything in Professional, plus:',
        'Unlimited team members',
        '1 TB cloud storage',
        'Unlimited concurrent models',
        'Dedicated Slack support channel',
        'Custom integrations & API access',
        'White-label options',
        'Private data governance',
        'Quarterly training & onboarding',
        'Custom reporting & analytics'
      ],
      limits: {
        projects: -1,
        team_members: -1,
        concurrent_models: -1,
        storage_gb: 1000,
        monthly_api_calls: -1,
        data_quality_checks: -1,
        annotation_storage: true,
      },
      stripe_price_id: null,
      color: 'amber',
      badge: 'For Scale',
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