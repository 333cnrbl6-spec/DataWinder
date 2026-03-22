import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { records, target_entity, file_type } = await req.json();

    if (!Array.isArray(records) || records.length === 0 || !target_entity) {
      return Response.json({ error: 'Missing records array (empty or not provided) or target_entity' }, { status: 400 });
    }

    // Inline schema properties for supported entities (schema() not available in backend)
    const entitySchemas = {
      Species: {
        properties: {
          iucn_status: { type: 'string', enum: ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'NE'] },
          population_trend: { type: 'string', enum: ['increasing', 'stable', 'decreasing', 'unknown'] },
          iucn_id: { type: 'number' },
          assessment_id: { type: 'number' },
          observation_count: { type: 'number' },
          gbif_occurrence_count: { type: 'number' },
          specieslink_occurrence_count: { type: 'number' },
          gbif_id: { type: 'number' },
          inat_taxon_id: { type: 'number' },
        }
      },
      IUCNTaxonomy: { properties: {} },
      ClimateDataset: {
        properties: {
          source: { type: 'string', enum: ['WorldClim', 'CHELSA', 'ERA5', 'MODIS', 'ESA CCI', 'CGIAR', 'TerraClimate', 'ISIMIP', 'CMIP6/ESGF', 'Other'] }
        }
      }
    };
    const schema = entitySchemas[target_entity] || { properties: {} };

    // Validation rules
    const validationRules = {
      Species: {
        required: ['scientific_name'],
        ranges: {
          iucn_status: ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'NE'],
          population_trend: ['increasing', 'stable', 'decreasing', 'unknown'],
          iucn_id: { min: 0 },
          observation_count: { min: 0 },
          gbif_occurrence_count: { min: 0 },
        },
        coordinates: {
          fields: ['observations', 'gbif_occurrences', 'specieslink_occurrences']
        }
      },
      IUCNTaxonomy: {
        required: ['species_id', 'scientific_name'],
        ranges: {}
      },
      ClimateDataset: {
        required: ['name', 'source'],
        ranges: {}
      }
    };

    const rules = validationRules[target_entity] || { required: [], ranges: {} };

    // Validate records
    const validationResults = records.map((record, idx) => {
      const errors = [];
      const warnings = [];
      const corrections = [];

      // Check required fields
      rules.required.forEach(field => {
        if (!record[field] || record[field] === '') {
          errors.push({
            type: 'missing_required',
            field,
            message: `Required field "${field}" is missing`,
            severity: 'error'
          });
        }
      });

      // Check field types and ranges
      Object.entries(schema.properties || {}).forEach(([fieldName, fieldSchema]) => {
        if (!(fieldName in record)) return;

        const value = record[fieldName];
        if (value === null || value === undefined || value === '') return;

        // Type checking
        if (fieldSchema.type === 'number' && typeof value !== 'number') {
          try {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              corrections.push({
                field: fieldName,
                original: value,
                corrected: numValue,
                reason: `Converted "${value}" to number ${numValue}`
              });
            } else {
              errors.push({
                type: 'type_mismatch',
                field: fieldName,
                value,
                message: `Expected number, got "${value}"`,
                severity: 'error'
              });
            }
          } catch {
            errors.push({
              type: 'type_mismatch',
              field: fieldName,
              value,
              message: `Cannot convert "${value}" to number`,
              severity: 'error'
            });
          }
        }

        // Enum validation
        if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
          errors.push({
            type: 'invalid_enum',
            field: fieldName,
            value,
            message: `Invalid value "${value}". Allowed: ${fieldSchema.enum.join(', ')}`,
            severity: 'error',
            suggestions: fieldSchema.enum
          });
        }

        // Coordinate validation
        if ((fieldName === 'latitude' || fieldName.includes('lat')) && typeof value === 'number') {
          if (value < -90 || value > 90) {
            errors.push({
              type: 'coordinate_range',
              field: fieldName,
              value,
              message: `Latitude ${value} is outside valid range [-90, 90]`,
              severity: 'error'
            });
          }
        }

        if ((fieldName === 'longitude' || fieldName.includes('lon')) && typeof value === 'number') {
          if (value < -180 || value > 180) {
            errors.push({
              type: 'coordinate_range',
              field: fieldName,
              value,
              message: `Longitude ${value} is outside valid range [-180, 180]`,
              severity: 'error'
            });
          }
        }

        // Numeric ranges from rules
        if (rules.ranges[fieldName]) {
          const range = rules.ranges[fieldName];
          const numValue = typeof value === 'number' ? value : parseFloat(value);

          if (range.min !== undefined && numValue < range.min) {
            warnings.push({
              type: 'range_warning',
              field: fieldName,
              value,
              message: `${fieldName} (${numValue}) is below recommended minimum (${range.min})`,
              severity: 'warning'
            });
          }

          if (range.max !== undefined && numValue > range.max) {
            warnings.push({
              type: 'range_warning',
              field: fieldName,
              value,
              message: `${fieldName} (${numValue}) exceeds recommended maximum (${range.max})`,
              severity: 'warning'
            });
          }
        }
      });

      // Check coordinate validity in nested objects
      if (rules.coordinates) {
        rules.coordinates.fields.forEach(fieldName => {
          if (Array.isArray(record[fieldName])) {
            record[fieldName].forEach((item, itemIdx) => {
              if (item.latitude && (item.latitude < -90 || item.latitude > 90)) {
                errors.push({
                  type: 'coordinate_range',
                  field: `${fieldName}[${itemIdx}].latitude`,
                  value: item.latitude,
                  message: `Invalid latitude in ${fieldName}[${itemIdx}]`,
                  severity: 'error'
                });
              }
              if (item.longitude && (item.longitude < -180 || item.longitude > 180)) {
                errors.push({
                  type: 'coordinate_range',
                  field: `${fieldName}[${itemIdx}].longitude`,
                  value: item.longitude,
                  message: `Invalid longitude in ${fieldName}[${itemIdx}]`,
                  severity: 'error'
                });
              }
            });
          }
        });
      }

      const isValid = errors.length === 0;

      return {
        record_index: idx,
        record_summary: {
          scientific_name: record.scientific_name || record.name || `Record ${idx + 1}`,
          id_field: record.id || record.species_id || null
        },
        is_valid: isValid,
        errors,
        warnings,
        corrections,
        error_count: errors.length,
        warning_count: warnings.length,
        correction_count: corrections.length
      };
    });

    // Summary statistics
    const summary = {
      total_records: records.length,
      valid_records: validationResults.filter(r => r.is_valid).length,
      invalid_records: validationResults.filter(r => !r.is_valid).length,
      total_errors: validationResults.reduce((sum, r) => sum + r.error_count, 0),
      total_warnings: validationResults.reduce((sum, r) => sum + r.warning_count, 0),
      total_corrections_available: validationResults.reduce((sum, r) => sum + r.correction_count, 0),
      pass_rate: Math.round((validationResults.filter(r => r.is_valid).length / records.length) * 100)
    };

    return Response.json({
      status: 'success',
      summary,
      validations: validationResults,
      can_import: summary.invalid_records === 0,
      needs_review: summary.invalid_records > 0 || summary.total_corrections_available > 0
    });

  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});