/**
 * BOARD VOTE ON PRICING
 * =====================
 * Handles board member votes on pricing structure
 * Stores votes and calculates majority decision
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { productId, proposedPricing, rationale } = payload;

    // Get or create board meeting for pricing discussion
    const meetings = await base44.entities.BoardMeeting.filter({
      agenda_items: { $elemMatch: { topic: `${productId}-pricing` } }
    });

    let meeting = meetings.length > 0 ? meetings[0] : null;

    if (!meeting) {
      // Create new board meeting for pricing discussion
      meeting = await base44.entities.BoardMeeting.create({
        title: `${productId} Pricing Vote - ${new Date().toISOString().split('T')[0]}`,
        called_by: user.email,
        meeting_date: new Date().toISOString(),
        status: 'in_progress',
        agenda_items: [
          {
            topic: `${productId}-pricing`,
            priority: 'high',
            description: 'Vote on pricing structure for the upcoming quarter'
          }
        ],
        discussion_threads: [],
        decisions: []
      });
    }

    // Record vote as a discussion message
    const updatedMeeting = await base44.entities.BoardMeeting.update(meeting.id, {
      discussion_threads: [
        ...(meeting.discussion_threads || []),
        {
          agenda_item: `${productId}-pricing`,
          messages: [
            ...(meeting.discussion_threads?.[0]?.messages || []),
            {
              from: user.full_name,
              timestamp: new Date().toISOString(),
              content: `Voting for: ${proposedPricing}`,
              perspective: 'vote',
              recommendation: rationale
            }
          ]
        }
      ]
    });

    console.log(`Vote recorded for ${productId} pricing by ${user.full_name}`);

    return Response.json({
      success: true,
      meeting_id: updatedMeeting.id,
      vote_recorded: true
    });
  } catch (error) {
    console.error('Pricing vote error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});