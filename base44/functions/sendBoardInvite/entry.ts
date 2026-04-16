import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { app_name, recipient_email, role, expertise } = await req.json();

    if (!app_name || !recipient_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create invite record
    const invite = await base44.asServiceRole.entities.BoardInvite.create({
      app_name,
      recipient_email,
      role: role || 'Representative',
      expertise: expertise || [],
      status: 'pending',
      invited_by: user.email,
      invited_date: new Date().toISOString(),
      accepted_date: null
    });

    // Send email notification
    const inviteLink = `${Deno.env.get('APP_URL') || 'https://datawinder.app'}/accept-board-invite?token=${invite.id}`;
    
    await base44.integrations.Core.SendEmail({
      to: recipient_email,
      subject: '📋 You\'re Invited to the Synergy Flow Board',
      from_name: 'DataWinder Board',
      body: `
Hello,

${user.full_name} from DataWinder is inviting your app (${app_name}) to join the Synergy Flow Board — our collaborative decision-making hub for platform governance.

ACCEPT INVITATION:
${inviteLink}

WHAT THIS MEANS:
• Your app's voice in major platform decisions
• Visibility into cross-app roadmaps
• Coordinate releases and dependencies
• Shape the future of Synergy Flow

Questions? Reply to this email or contact Base44 AI on the board.

Best regards,
Synergy Flow Board
      `
    });

    console.log(`Board invite sent to ${recipient_email} for ${app_name}`);

    return Response.json({
      status: 'invite_sent',
      invite_id: invite.id,
      recipient: recipient_email,
      app: app_name
    });
  } catch (error) {
    console.error('sendBoardInvite error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});