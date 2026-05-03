import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { occurrence } = await req.json();

    if (!occurrence || !occurrence.id) {
      return Response.json({ error: 'Invalid occurrence' }, { status: 400 });
    }

    // Get all active subscriptions
    const subscriptions = await base44.asServiceRole.entities.AlertSubscription.filter(
      { active: true },
      '-created_date',
      1000
    );

    if (!subscriptions || subscriptions.length === 0) {
      return Response.json({ processed: 0 });
    }

    const speciesName = occurrence.species_name || 'Unknown Species';
    const occurrenceId = occurrence.id;
    let alertsCreated = 0;

    for (const sub of subscriptions) {
      // Check species match
      const speciesMatch =
        sub.alert_type === 'species' || sub.alert_type === 'both'
          ? sub.species_ids?.includes(occurrence.species_id)
          : false;

      // Check zone match
      let zoneMatch = false;
      let matchedZoneIds = [];
      let matchedZoneNames = [];

      if ((sub.alert_type === 'zone' || sub.alert_type === 'both') && occurrence.latitude && occurrence.longitude) {
        // Get all zones to check containment
        if (sub.zone_ids && sub.zone_ids.length > 0) {
          const zones = await base44.asServiceRole.entities.GeoJSONBoundary.filter(
            { id: { $in: sub.zone_ids } },
            '',
            100
          );

          for (const zone of zones) {
            if (isPointInPolygon(occurrence.latitude, occurrence.longitude, zone.geojson_data)) {
              zoneMatch = true;
              matchedZoneIds.push(zone.id);
              matchedZoneNames.push(zone.name);
            }
          }
        }
      }

      // Create alert if either condition is met
      if (speciesMatch || zoneMatch) {
        const triggerReason =
          speciesMatch && zoneMatch ? 'both' : speciesMatch ? 'species_match' : 'zone_match';

        const alertData = {
          subscription_id: sub.id,
          user_email: sub.user_email,
          occurrence_id: occurrenceId,
          species_id: occurrence.species_id,
          species_name: speciesName,
          latitude: occurrence.latitude,
          longitude: occurrence.longitude,
          observation_date: occurrence.observation_date,
          trigger_reason: triggerReason,
          zone_ids: matchedZoneIds,
          zone_names: matchedZoneNames,
          email_sent: false
        };

        // Create alert history record
        const alert = await base44.asServiceRole.entities.AlertHistory.create(alertData);

        // Send email if enabled
        if (sub.enable_email) {
          try {
            const emailBody = `
A new species observation matches your alert settings.

Species: ${speciesName}
Location: ${occurrence.latitude.toFixed(4)}, ${occurrence.longitude.toFixed(4)}
Observed: ${new Date(occurrence.observation_date).toLocaleDateString()}
Reason: ${triggerReason === 'both' ? 'Species match + Zone alert' : triggerReason === 'species_match' ? 'Species of interest' : 'Conservation zone'}
${matchedZoneNames.length > 0 ? `Zones: ${matchedZoneNames.join(', ')}` : ''}

Log in to DataWinder to view details and manage your alerts.
            `.trim();

            await base44.asServiceRole.integrations.Core.SendEmail({
              to: sub.user_email,
              subject: `Alert: ${speciesName} observation detected`,
              body: emailBody,
              from_name: 'DataWinder Alerts'
            });

            // Mark alert as email sent
            await base44.asServiceRole.entities.AlertHistory.update(alert.id, {
              email_sent: true
            });
          } catch (emailError) {
            // Log email error but don't fail
            await base44.asServiceRole.entities.AlertHistory.update(alert.id, {
              email_error: emailError.message
            });
          }
        }

        alertsCreated++;
      }
    }

    return Response.json({ processed: alertsCreated });
  } catch (error) {
    console.error('Alert processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Point-in-polygon algorithm
function isPointInPolygon(lat, lon, geojson) {
  if (!geojson || geojson.type !== 'Polygon') return false;

  const coords = geojson.coordinates[0];
  let inside = false;

  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[j];

    if (
      lat > Math.min(lat1, lat2) &&
      lat < Math.max(lat1, lat2) &&
      lon < ((lon2 - lon1) * (lat - lat1)) / (lat2 - lat1) + lon1
    ) {
      inside = !inside;
    }
  }

  return inside;
}