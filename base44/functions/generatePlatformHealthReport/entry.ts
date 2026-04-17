import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch species metrics
    const species = await base44.entities.Species.list();
    const speciesCount = species.length;
    const iucnStatusBreakdown = {};
    species.forEach(s => {
      const status = s.iucn_status || 'Unknown';
      iucnStatusBreakdown[status] = (iucnStatusBreakdown[status] || 0) + 1;
    });

    // Fetch SDM runs metrics
    const sdmRuns = await base44.entities.SDMRun.list();
    const completedRuns = sdmRuns.filter(r => r.status === 'completed').length;
    const failedRuns = sdmRuns.filter(r => r.status === 'failed').length;
    const successRate = sdmRuns.length > 0 ? ((completedRuns / sdmRuns.length) * 100).toFixed(1) : 0;

    // Fetch threat assessments
    const threatAssessments = await base44.entities.ThreatAssessment.list();
    const criticalThreats = threatAssessments.filter(t => t.threat_category === 'Critical').length;
    const highThreats = threatAssessments.filter(t => t.threat_category === 'High').length;

    // Generate report text
    const reportDate = new Date().toISOString().split('T')[0];
    const reportContent = `
**PLATFORM HEALTH REPORT** — ${reportDate}

📊 **Biodiversity Data**
• Total Species: ${speciesCount}
• Conservation Status Breakdown:
${Object.entries(iucnStatusBreakdown).map(([status, count]) => `  - ${status}: ${count}`).join('\n')}

🔬 **Species Distribution Modeling**
• SDM Runs Completed: ${completedRuns}/${sdmRuns.length}
• Success Rate: ${successRate}%
• Failed Runs: ${failedRuns}

🚨 **Conservation Threat Status**
• Critical Priority Species: ${criticalThreats}
• High Priority Species: ${highThreats}
• Total Assessments: ${threatAssessments.length}

✅ **Report Generated**: Automated analysis from Species Explorer & SDM Pipeline
    `.trim();

    // Find the latest board meeting and post to discussion
    const meetings = await base44.entities.BoardMeeting.list('-meeting_date', 1);
    
    if (meetings.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'Report generated but no active board meeting found',
        report: reportContent 
      });
    }

    const latestMeeting = meetings[0];
    
    // Add message to first discussion thread (or create one if needed)
    let discussionThread = latestMeeting.discussion_threads?.[0];
    
    if (!discussionThread) {
      // Create a new discussion thread if none exist
      discussionThread = {
        agenda_item: 'Platform Health Monitoring',
        messages: [],
        decision: null,
        action_items: []
      };
      latestMeeting.discussion_threads = [discussionThread];
    }

    // Add the health report message
    const reportMessage = {
      from: 'System Reporter',
      timestamp: new Date().toISOString(),
      content: reportContent,
      perspective: 'Data-driven platform metrics'
    };

    if (!discussionThread.messages) {
      discussionThread.messages = [];
    }
    discussionThread.messages.push(reportMessage);

    // Update the meeting with new discussion thread
    await base44.entities.BoardMeeting.update(latestMeeting.id, {
      discussion_threads: latestMeeting.discussion_threads
    });

    return Response.json({
      success: true,
      message: 'Platform health report generated and posted to board',
      meetingId: latestMeeting.id,
      metrics: {
        speciesCount,
        sdmRunsCompleted: completedRuns,
        threatsCritical: criticalThreats
      }
    });

  } catch (error) {
    console.error('Platform health report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});