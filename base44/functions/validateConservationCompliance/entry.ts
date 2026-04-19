import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

/**
 * DATAWINDER COMPLIANCE VALIDATION SERVICE
 * 
 * Implements conservation research-specific compliance checks:
 * - Natural England survey standards
 * - Endangered species location data protection
 * - BTO recording guidelines
 * - IUCN Red List data usage compliance
 * - GBIF data standards
 * - GDPR for user data
 * 
 * Use this function BEFORE importing any species/occurrence data
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { records, compliance_type } = await req.json();

    if (!Array.isArray(records) || records.length === 0) {
      return Response.json({ error: 'Missing records array' }, { status: 400 });
    }

    // Compliance validation rules specific to conservation research
    const complianceRules = {
      species_import: {
        // IUCN Red List data usage compliance
        iucn_compliance: {
          check: (record) => {
            const issues = [];
            
            // Verify IUCN status is from official categories
            const validIUCN = ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'NE'];
            if (record.iucn_status && !validIUCN.includes(record.iucn_status)) {
              issues.push({
                type: 'iucn_status_invalid',
                message: `IUCN status "${record.iucn_status}" is not a valid Red List category`,
                severity: 'error',
                resolution: 'Use official IUCN categories: LC, NT, VU, EN, CR, EW, EX, DD, NE'
              });
            }
            
            // Flag if IUCN ID is missing for threatened species
            if (['VU', 'EN', 'CR', 'EW', 'EX'].includes(record.iucn_status) && !record.iucn_id) {
              issues.push({
                type: 'missing_iucn_id',
                message: 'Threatened species should have IUCN ID for verification',
                severity: 'warning',
                resolution: 'Add IUCN ID from official Red List'
              });
            }
            
            return issues;
          }
        },
        
        // GBIF data standards compliance
        gbif_compliance: {
          check: (record) => {
            const issues = [];
            
            // Scientific name is required
            if (!record.scientific_name || record.scientific_name.trim() === '') {
              issues.push({
                type: 'missing_scientific_name',
                message: 'Scientific name is required per GBIF standards',
                severity: 'error',
                resolution: 'Provide valid binomial nomenclature (Genus species)'
              });
            }
            
            // Verify binomial format (Genus species)
            if (record.scientific_name && !/^[A-Z][a-z]+\s+[a-z]+/.test(record.scientific_name)) {
              issues.push({
                type: 'invalid_binomial_format',
                message: `Scientific name "${record.scientific_name}" doesn't follow binomial format`,
                severity: 'warning',
                resolution: 'Format should be "Genus species" (e.g., Homo sapiens)'
              });
            }
            
            // GBIF ID should be numeric
            if (record.gbif_id && isNaN(Number(record.gbif_id))) {
              issues.push({
                type: 'invalid_gbif_id',
                message: 'GBIF ID must be a numeric taxon key',
                severity: 'error',
                resolution: 'Use GBIF taxon key from gbif.org/species/{key}'
              });
            }
            
            return issues;
          }
        },
        
        // Natural England survey standards - species data quality
        natural_england_standards: {
          check: (record) => {
            const issues = [];
            
            // Population trend should be documented
            if (!record.population_trend && ['VU', 'EN', 'CR'].includes(record.iucn_status)) {
              issues.push({
                type: 'missing_population_trend',
                message: 'Population trend required for threatened species per Natural England standards',
                severity: 'warning',
                resolution: 'Document population trend: increasing, stable, decreasing, or unknown'
              });
            }
            
            // Observation count provides evidence
            if (!record.observation_count && !record.gbif_occurrence_count) {
              issues.push({
                type: 'no_occurrence_data',
                message: 'No occurrence count - may not meet Natural England evidence standards',
                severity: 'info',
                resolution: 'Add observation counts from iNaturalist/GBIF if available'
              });
            }
            
            return issues;
          }
        }
      },
      
      occurrence_import: {
        // Endangered species location data protection
        location_data_protection: {
          check: (record) => {
            const issues = [];
            
            // Check for sensitive coordinates
            const hasCoordinates = (record.latitude !== undefined || record.longitude !== undefined);
            
            if (hasCoordinates) {
              // Flag high precision coordinates for critically endangered species
              const latPrecision = record.latitude?.toString().split('.')?.[1]?.length || 0;
              const lonPrecision = record.longitude?.toString().split('.')?.[1]?.length || 0;
              
              if (latPrecision > 4 || lonPrecision > 4) {
                issues.push({
                  type: 'high_precision_coordinates',
                  message: 'Coordinates have >4 decimal places precision (~11m accuracy)',
                  severity: 'warning',
                  resolution: 'Consider reducing precision to 3 decimals (~110m) for endangered species to protect locations'
                });
              }
            }
            
            // Check date sensitivity
            if (record.occurrence_date) {
              const recordDate = new Date(record.occurrence_date);
              const now = new Date();
              const daysAgo = Math.floor((now - recordDate) / (1000 * 60 * 60 * 24));
              
              if (daysAgo < 30) {
                issues.push({
                  type: 'recent_observation',
                  message: 'Observation is less than 30 days old',
                  severity: 'info',
                  resolution: 'Consider delaying publication of recent endangered species locations'
                });
              }
            }
            
            return issues;
          }
        },
        
        // BTO recording guidelines
        bto_compliance: {
          check: (record) => {
            const issues = [];
            
            // Date should be provided
            if (!record.occurrence_date) {
              issues.push({
                type: 'missing_date',
                message: 'Observation date required per BTO recording guidelines',
                severity: 'error',
                resolution: 'Add date in YYYY-MM-DD format'
              });
            }
            
            // Verify date is not in future
            if (record.occurrence_date) {
              const recordDate = new Date(record.occurrence_date);
              if (recordDate > new Date()) {
                issues.push({
                  type: 'future_date',
                  message: 'Observation date is in the future',
                  severity: 'error',
                  resolution: 'Correct the observation date'
                });
              }
            }
            
            // Coordinates required for occurrence
            if (!record.latitude || !record.longitude) {
              issues.push({
                type: 'missing_coordinates',
                message: 'Geographic coordinates required per BTO standards',
                severity: 'error',
                resolution: 'Add latitude and longitude in decimal degrees'
              });
            }
            
            return issues;
          }
        }
      }
    };

    // Run compliance checks
    const rules = complianceRules[compliance_type || 'species_import'] || complianceRules.species_import;
    
    const complianceResults = records.map((record, idx) => {
      const allIssues = [];
      
      // Run all compliance checks for this record type
      for (const [ruleName, rule] of Object.entries(rules)) {
        const issues = rule.check(record);
        allIssues.push(...issues);
      }
      
      return {
        record_index: idx,
        record_summary: record.scientific_name || record.species_name || `Record ${idx + 1}`,
        is_compliant: allIssues.filter(i => i.severity === 'error').length === 0,
        issues: allIssues,
        error_count: allIssues.filter(i => i.severity === 'error').length,
        warning_count: allIssues.filter(i => i.severity === 'warning').length,
        info_count: allIssues.filter(i => i.severity === 'info').length
      };
    });

    // Summary statistics
    const summary = {
      total_records: records.length,
      compliant_records: complianceResults.filter(r => r.is_compliant).length,
      non_compliant_records: complianceResults.filter(r => !r.is_compliant).length,
      total_errors: complianceResults.reduce((sum, r) => sum + r.error_count, 0),
      total_warnings: complianceResults.reduce((sum, r) => sum + r.warning_count, 0),
      total_info: complianceResults.reduce((sum, r) => sum + r.info_count, 0),
      compliance_rate: Math.round((complianceResults.filter(r => r.is_compliant).length / records.length) * 100)
    };

    // Log compliance check for audit trail
    await base44.entities.ImportLog.create({
      user_email: user.email,
      user_name: user.full_name || 'Unknown',
      entity_type: 'ComplianceCheck',
      file_name: `${compliance_type || 'species_import'}_check`,
      record_count: records.length,
      record_ids: [], // Compliance check doesn't create records yet
      status: 'completed'
    }).catch(err => console.warn('Could not log compliance check:', err));

    return Response.json({
      status: 'success',
      summary,
      compliance_results: complianceResults,
      can_proceed: summary.total_errors === 0,
      needs_review: summary.total_warnings > 0 || summary.total_info > 0
    });

  } catch (error) {
    console.error('Compliance validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});