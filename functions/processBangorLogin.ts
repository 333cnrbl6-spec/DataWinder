import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has @bangor.ac.uk email
    if (!user.email.endsWith('@bangor.ac.uk')) {
      return Response.json({
        success: false,
        message: 'User email is not a Bangor University account',
      });
    }

    // Check if community member record already exists
    const existingMembers = await base44.asServiceRole.entities.CommunityMember.filter({
      user_email: user.email,
    });

    if (existingMembers.length === 0) {
      // Create new community member record with Founding Member tier
      await base44.asServiceRole.entities.CommunityMember.create({
        user_email: user.email,
        full_name: user.full_name || 'Bangor Researcher',
        institution: 'Bangor University',
        membership_tier: 'Founding Member',
        beta_tester: true,
        newsletter: false,
        share_profile: false,
      });
    } else {
      // Update existing record to ensure Founding Member status
      const existing = existingMembers[0];
      if (existing.membership_tier !== 'Founding Member') {
        await base44.asServiceRole.entities.CommunityMember.update(existing.id, {
          membership_tier: 'Founding Member',
          beta_tester: true,
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Bangor user processed - Founding Member status granted',
      user: {
        email: user.email,
        full_name: user.full_name,
        membership_tier: 'Founding Member',
      },
    });
  } catch (error) {
    console.error('Error processing Bangor login:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});