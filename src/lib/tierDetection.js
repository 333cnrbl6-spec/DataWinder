/**
 * Detect user tier based on email domain and subscription status
 * Returns: 'free_bangor', 'pro', or 'trial'
 */
export async function detectUserTier(user) {
  if (!user) return 'trial';

  // Free tier: Bangor University users
  if (user.email?.endsWith('@bangor.ac.uk')) {
    return 'free_bangor';
  }

  // Check subscription status (would connect to Stripe later)
  // For now: non-Bangor = trial
  return 'trial';
}

/**
 * Get tier limits
 */
export function getTierLimits(tier) {
  const limits = {
    free_bangor: {
      maxProjects: 5,
      maxOccurrencesPerMonth: 1000,
      maxTeamMembers: 3,
      features: ['Core SDM', 'Data validation', 'Basic reports'],
      support: 'Community',
      apiAccess: false,
    },
    pro: {
      maxProjects: Infinity,
      maxOccurrencesPerMonth: Infinity,
      maxTeamMembers: Infinity,
      features: ['All features', 'Advanced SDM', 'Custom integrations', 'API access'],
      support: 'Priority Email',
      apiAccess: true,
    },
    trial: {
      maxProjects: 1,
      maxOccurrencesPerMonth: 100,
      maxTeamMembers: 1,
      features: ['Core SDM', 'Data validation'],
      support: 'Community',
      apiAccess: false,
    },
  };

  return limits[tier] || limits.trial;
}

/**
 * Check if user has reached tier limit
 */
export async function checkTierLimit(user, limitType, currentCount = 0) {
  const tier = await detectUserTier(user);
  const limits = getTierLimits(tier);

  const limit = limits[`max${limitType.charAt(0).toUpperCase()}${limitType.slice(1)}`];
  return {
    tier,
    limit,
    isAtLimit: currentCount >= limit,
    remaining: Math.max(0, limit - currentCount),
  };
}

export default { detectUserTier, getTierLimits, checkTierLimit };