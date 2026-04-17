import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { speciesId, occurrenceData } = body;

    if (!occurrenceData) {
      return Response.json({ error: 'Occurrence data required' }, { status: 400 });
    }

    // Fetch active validation rules
    const rules = await base44.entities.ValidationRule.filter({
      enabled: true
    });

    const flags = [];

    // Apply each rule to the occurrence
    for (const rule of rules) {
      // Skip rules for different species (if species-specific)
      if (rule.species_id && rule.species_id !== speciesId) {
        continue;
      }

      let flag = null;

      // Geographic rules
      if (rule.rule_type === 'geographic') {
        flag = checkGeographicRule(rule, occurrenceData);
      }

      // Temporal rules
      else if (rule.rule_type === 'temporal') {
        flag = checkTemporalRule(rule, occurrenceData);
      }

      // Biological rules
      else if (rule.rule_type === 'biological') {
        flag = checkBiologicalRule(rule, occurrenceData);
      }

      // Statistical rules
      else if (rule.rule_type === 'statistical') {
        flag = checkStatisticalRule(rule, occurrenceData);
      }

      if (flag) {
        flag.rule_id = rule.id;
        flag.rule_name = rule.name;
        flag.severity = rule.severity;
        flags.push(flag);
      }
    }

    // Create validation flags in database
    const createdFlags = [];
    for (const flag of flags) {
      const created = await base44.entities.ValidationFlag.create({
        occurrence_id: occurrenceData.id || occurrenceData.occurrence_id,
        species_id: speciesId,
        species_name: occurrenceData.species_name || occurrenceData.scientific_name,
        rule_id: flag.rule_id,
        rule_name: flag.rule_name,
        flag_type: flag.flag_type,
        severity: flag.severity,
        message: flag.message,
        occurrence_data: occurrenceData,
        suggested_correction: flag.suggested_correction,
        status: 'flagged'
      });
      createdFlags.push(created);
    }

    return Response.json({
      flags_count: createdFlags.length,
      flags: createdFlags,
      has_errors: createdFlags.some(f => f.severity === 'error')
    });

  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function checkGeographicRule(rule, occurrence) {
  const params = rule.parameters || {};
  const lat = occurrence.latitude || occurrence.lat;
  const lon = occurrence.longitude || occurrence.lon;

  // Check latitude bounds
  if (params.lat_min !== undefined && lat < params.lat_min) {
    return {
      flag_type: 'geographic',
      message: `Latitude ${lat} is below minimum ${params.lat_min}`,
      suggested_correction: { latitude: params.lat_min }
    };
  }

  if (params.lat_max !== undefined && lat > params.lat_max) {
    return {
      flag_type: 'geographic',
      message: `Latitude ${lat} is above maximum ${params.lat_max}`,
      suggested_correction: { latitude: params.lat_max }
    };
  }

  // Check longitude bounds
  if (params.lon_min !== undefined && lon < params.lon_min) {
    return {
      flag_type: 'geographic',
      message: `Longitude ${lon} is below minimum ${params.lon_min}`,
      suggested_correction: { longitude: params.lon_min }
    };
  }

  if (params.lon_max !== undefined && lon > params.lon_max) {
    return {
      flag_type: 'geographic',
      message: `Longitude ${lon} is above maximum ${params.lon_max}`,
      suggested_correction: { longitude: params.lon_max }
    };
  }

  // Check excluded countries
  if (params.exclude_countries && Array.isArray(params.exclude_countries)) {
    if (params.exclude_countries.includes(occurrence.country)) {
      return {
        flag_type: 'geographic',
        message: `Country ${occurrence.country} is excluded for this species`,
        suggested_correction: {}
      };
    }
  }

  return null;
}

function checkTemporalRule(rule, occurrence) {
  const params = rule.parameters || {};
  const occurrenceDate = new Date(occurrence.occurrence_date || occurrence.date);

  // Check date bounds
  if (params.date_min) {
    const minDate = new Date(params.date_min);
    if (occurrenceDate < minDate) {
      return {
        flag_type: 'temporal',
        message: `Date ${occurrenceDate.toLocaleDateString()} is before minimum ${minDate.toLocaleDateString()}`,
        suggested_correction: { occurrence_date: params.date_min }
      };
    }
  }

  if (params.date_max) {
    const maxDate = new Date(params.date_max);
    if (occurrenceDate > maxDate) {
      return {
        flag_type: 'temporal',
        message: `Date ${occurrenceDate.toLocaleDateString()} is after maximum ${maxDate.toLocaleDateString()}`,
        suggested_correction: { occurrence_date: params.date_max }
      };
    }
  }

  // Check days from present
  if (params.days_from_present_max) {
    const today = new Date();
    const daysDiff = Math.floor((today - occurrenceDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > params.days_from_present_max) {
      return {
        flag_type: 'temporal',
        message: `Observation is ${daysDiff} days old (max: ${params.days_from_present_max} days)`,
        suggested_correction: {}
      };
    }
  }

  return null;
}

function checkBiologicalRule(rule, occurrence) {
  const params = rule.parameters || {};

  // Check minimum confidence
  if (params.min_confidence !== undefined && occurrence.confidence_score) {
    if (occurrence.confidence_score < params.min_confidence) {
      return {
        flag_type: 'biological',
        message: `Confidence score ${occurrence.confidence_score} is below minimum ${params.min_confidence}`,
        suggested_correction: {}
      };
    }
  }

  // Check habitat types
  if (params.habitat_types && Array.isArray(params.habitat_types)) {
    if (occurrence.habitat && !params.habitat_types.includes(occurrence.habitat)) {
      return {
        flag_type: 'biological',
        message: `Habitat type "${occurrence.habitat}" not in allowed list`,
        suggested_correction: { habitat: params.habitat_types[0] }
      };
    }
  }

  return null;
}

function checkStatisticalRule(rule, occurrence) {
  const params = rule.parameters || {};

  // Check elevation bounds
  if (params.elevation_min !== undefined && occurrence.elevation) {
    if (occurrence.elevation < params.elevation_min) {
      return {
        flag_type: 'statistical',
        message: `Elevation ${occurrence.elevation}m is below minimum ${params.elevation_min}m`,
        suggested_correction: { elevation: params.elevation_min }
      };
    }
  }

  if (params.elevation_max !== undefined && occurrence.elevation) {
    if (occurrence.elevation > params.elevation_max) {
      return {
        flag_type: 'statistical',
        message: `Elevation ${occurrence.elevation}m is above maximum ${params.elevation_max}m`,
        suggested_correction: { elevation: params.elevation_max }
      };
    }
  }

  return null;
}