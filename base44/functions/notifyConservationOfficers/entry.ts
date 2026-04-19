/**
 * DATAWINDER — Conservation Officer Notification
 * ================================================
 * Triggered by entity automation on ValidationFlag create.
 * Uses service role — no user session available in automation context.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ENDANGERED_STATUSES = ['EN', 'CR', 'EW'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Entity automations don't carry a user session — use service role throughout
    const payload = await req.json();

    // Support both direct invocation and automation payload shapes
    const flagData = payload?.data || payload;

    if (!flagData || flagData.severity !== 'error') {
      return Response.json({ skipped: 'Not error severity' });
    }

    if (!flagData.species_id) {
      return Response.json({ skipped: 'No species_id on flag' });
    }

    // Fetch species using service role
    const speciesList = await base44.asServiceRole.entities.Species.list();
    const targetSpecies = speciesList.find(s => s.id === flagData.species_id);

    if (!targetSpecies) {
      return Response.json({ error: 'Species not found' }, { status: 404 });
    }

    if (!ENDANGERED_STATUSES.includes(targetSpecies.iucn_status)) {
      return Response.json({
        skipped: `Species status ${targetSpecies.iucn_status} not in endangered category`
      });
    }

    // Get admin users as conservation officers
    const allUsers = await base44.asServiceRole.entities.User.list();
    const conservationOfficers = allUsers.filter(u => u.role === 'admin');

    if (!conservationOfficers.length) {
      return Response.json({ skipped: 'No admin conservation officers found' });
    }

    const results = await Promise.allSettled(
      conservationOfficers.map(officer =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: officer.email,
          subject: `🚨 CRITICAL: Validation Error — ${targetSpecies.scientific_name} [${targetSpecies.iucn_status}]`,
          body: buildEmailBody(targetSpecies, flagData, officer.full_name || officer.email),
          from_name: 'DataWinder Conservation Alerts',
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Conservation alert: sent=${sent} failed=${failed} species=${targetSpecies.scientific_name}`);

    return Response.json({
      success: true,
      species: { id: targetSpecies.id, name: targetSpecies.scientific_name, iucn_status: targetSpecies.iucn_status },
      flag: { id: flagData.id, rule_name: flagData.rule_name, message: flagData.message },
      notifications: { sent, failed },
    });

  } catch (error) {
    console.error('Conservation officer notification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

const STATUS_LABELS = { CR: 'Critically Endangered', EN: 'Endangered', EW: 'Extinct in the Wild' };

function buildEmailBody(species, flag, officerName) {
  const statusLabel = STATUS_LABELS[species.iucn_status] || species.iucn_status;
  const now = new Date();

  return `Dear ${officerName},

A critical validation error has been detected for an endangered species in DataWinder.

SPECIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scientific Name : ${species.scientific_name}
Common Name     : ${species.common_name || 'Not recorded'}
IUCN Status     : ${statusLabel} (${species.iucn_status})
Population Trend: ${species.population_trend || 'Unknown'}

VALIDATION ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rule        : ${flag.rule_name || 'Unknown rule'}
Severity    : ERROR (Critical)
Message     : ${flag.message || 'No message provided'}
Occurrence  : ${flag.occurrence_id || 'N/A'}
Flagged     : ${now.toLocaleDateString('en-GB')} at ${now.toLocaleTimeString('en-GB')}

ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Log into DataWinder
2. Navigate to Data Validation → Validation Monitor
3. Review the flagged occurrence record
4. Take corrective action or dismiss with a reviewer note

This species is ${statusLabel}. Data accuracy is critical for conservation planning.

---
DataWinder Conservation Alerts — automated notification. Do not reply.`.trim();
}