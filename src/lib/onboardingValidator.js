/**
 * Onboarding Validation
 * Ensures user profile and community membership are properly created before proceeding
 */

export const validateOnboardingComplete = async (base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) return false;

    // Check if user has completed onboarding flag
    if (!user.onboarding_completed) return false;

    // Verify CommunityMember record exists
    const communityMembers = await base44.entities.CommunityMember.filter({
      user_email: user.email
    });

    if (communityMembers.length === 0) {
      console.warn(`CommunityMember record missing for ${user.email}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Onboarding validation error:', error);
    return false;
  }
};

/**
 * Create or update CommunityMember record during onboarding
 */
export const createCommunityMember = async (base44, userData) => {
  try {
    const user = await base44.auth.me();
    if (!user) throw new Error('User not authenticated');

    const {
      full_name = user.full_name,
      institution = '',
      country = '',
      research_area = '',
      field_of_interest = '',
      app_goals = '',
      beta_tester = false,
      newsletter = false,
      share_profile = false
    } = userData || {};

    // Check if already exists
    const existing = await base44.entities.CommunityMember.filter({
      user_email: user.email
    });

    if (existing.length > 0) {
      // Update existing record
      await base44.entities.CommunityMember.update(existing[0].id, {
        full_name,
        institution,
        country,
        research_area,
        field_of_interest,
        app_goals,
        beta_tester,
        newsletter,
        share_profile
      });
      return existing[0].id;
    } else {
      // Create new record
      const result = await base44.entities.CommunityMember.create({
        user_email: user.email,
        full_name,
        institution,
        country,
        research_area,
        field_of_interest,
        app_goals,
        beta_tester,
        newsletter,
        share_profile,
        membership_tier: 'Standard'
      });
      return result.id;
    }
  } catch (error) {
    console.error('Failed to create/update CommunityMember:', error);
    throw error;
  }
};

/**
 * Mark onboarding as complete
 */
export const completeOnboarding = async (base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) throw new Error('User not authenticated');

    // Verify CommunityMember exists before marking complete
    const communityMembers = await base44.entities.CommunityMember.filter({
      user_email: user.email
    });

    if (communityMembers.length === 0) {
      throw new Error('CommunityMember record must be created before completing onboarding');
    }

    // Update user's onboarding_completed flag
    await base44.auth.updateMe({
      onboarding_completed: true
    });

    return true;
  } catch (error) {
    console.error('Failed to complete onboarding:', error);
    throw error;
  }
};