import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, species_id, check_type } = await req.json();

    if (!project_id || !species_id || !check_type) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch species and occurrences
    const species = await base44.entities.Species.filter({ id: species_id }).then(s => s[0]);
    if (!species) {
      return Response.json({ error: 'Species not found' }, { status: 404 });
    }

    const occurrences = await base44.entities.OccurrenceNote.filter(
      { species_id },
      null,
      1000
    );

    const issues = [];
    const summary = {
      duplicates_count: 0,
      taxonomy_issues_count: 0,
      outliers_count: 0,
      temporal_issues_count: 0,
      data_completeness: 0
    };

    // Calculate data completeness
    const withDates = occurrences.filter(o => o.occurrence_date).length;
    const withCoords = occurrences.filter(o => o.latitude && o.longitude).length;
    const withValidation = occurrences.filter(o => o.validation_status && o.validation_status !== 'unreviewed').length;
    summary.data_completeness = Math.round(
      ((withDates + withCoords + withValidation) / (occurrences.length * 3)) * 100
    );

    // Duplicate detection
    if (['duplicate_detection', 'comprehensive'].includes(check_type)) {
      const coordMap = new Map();
      occurrences.forEach(occ => {
        const key = `${occ.latitude.toFixed(4)},${occ.longitude.toFixed(4)}`;
        if (!coordMap.has(key)) {
          coordMap.set(key, []);
        }
        coordMap.get(key).push(occ);
      });

      coordMap.forEach((group, coords) => {
        if (group.length > 1) {
          const dateDiff = group.length === 2
            ? Math.abs(
                new Date(group[0].occurrence_date || 0) -
                new Date(group[1].occurrence_date || 0)
              ) / (1000 * 60 * 60 * 24)
            : 0;

          group.slice(1).forEach(occ => {
            issues.push({
              occurrence_id: occ.id,
              issue_type: 'potential_duplicate',
              severity: dateDiff < 30 ? 'critical' : 'warning',
              message: `Potential duplicate: same coordinates within ${Math.round(dateDiff)} days`,
              suggested_action: 'Review and merge with primary record',
              confidence: dateDiff < 7 ? 0.95 : 0.7,
              reference_source: 'internal'
            });
            summary.duplicates_count++;
          });
        }
      });
    }

    // Taxonomic validation
    if (['taxonomic_validation', 'comprehensive'].includes(check_type)) {
      // Check name variations
      const nameVariations = [
        species.scientific_name.toLowerCase().replace(/\s+/g, ''),
        species.common_name?.toLowerCase().replace(/\s+/g, '')
      ].filter(Boolean);

      occurrences.forEach(occ => {
        if (!nameVariations.some(v => occ.species_name?.toLowerCase().includes(v.split(/\s+/)[0]))) {
          issues.push({
            occurrence_id: occ.id,
            issue_type: 'name_variation',
            severity: 'warning',
            message: `Name variation detected: "${occ.species_name}" vs expected "${species.scientific_name}"`,
            suggested_action: 'Standardize to canonical scientific name',
            confidence: 0.6,
            reference_source: 'internal'
          });
          summary.taxonomy_issues_count++;
        }
      });
    }

    // Coordinate outlier detection
    if (['coordinate_outlier', 'comprehensive'].includes(check_type)) {
      if (occurrences.length > 3) {
        const lats = occurrences.map(o => o.latitude).filter(l => l);
        const lons = occurrences.map(o => o.longitude).filter(l => l);

        const meanLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const meanLon = lons.reduce((a, b) => a + b, 0) / lons.length;
        const stdLat = Math.sqrt(
          lats.reduce((a, b) => a + Math.pow(b - meanLat, 2), 0) / lats.length
        );
        const stdLon = Math.sqrt(
          lons.reduce((a, b) => a + Math.pow(b - meanLon, 2), 0) / lons.length
        );

        occurrences.forEach(occ => {
          if (occ.latitude && occ.longitude) {
            const zLat = Math.abs((occ.latitude - meanLat) / (stdLat || 1));
            const zLon = Math.abs((occ.longitude - meanLon) / (stdLon || 1));

            if (zLat > 3 || zLon > 3) {
              issues.push({
                occurrence_id: occ.id,
                issue_type: 'extreme_coordinate',
                severity: zLat > 4 || zLon > 4 ? 'critical' : 'warning',
                message: `Coordinate outlier: ${Math.max(zLat, zLon).toFixed(1)}σ from mean distribution`,
                suggested_action: 'Verify coordinates against source records',
                confidence: Math.min(0.9, 0.7 + (zLat + zLon) / 20),
                reference_source: 'statistical'
              });
              summary.outliers_count++;
            }
          }
        });
      }
    }

    // Temporal validation
    if (['temporal_validation', 'comprehensive'].includes(check_type)) {
      const now = new Date();
      occurrences.forEach(occ => {
        if (occ.occurrence_date) {
          const occDate = new Date(occ.occurrence_date);
          const yearsDiff = (now - occDate) / (1000 * 60 * 60 * 24 * 365);

          if (occDate > now) {
            issues.push({
              occurrence_id: occ.id,
              issue_type: 'suspicious_date',
              severity: 'critical',
              message: 'Observation date is in the future',
              suggested_action: 'Correct the date',
              confidence: 0.99,
              reference_source: 'internal'
            });
            summary.temporal_issues_count++;
          } else if (yearsDiff > 200) {
            issues.push({
              occurrence_id: occ.id,
              issue_type: 'suspicious_date',
              severity: 'warning',
              message: `Very old record (${Math.round(yearsDiff)} years ago) - verify accuracy`,
              suggested_action: 'Review historical data source',
              confidence: 0.6,
              reference_source: 'internal'
            });
            summary.temporal_issues_count++;
          }
        }
      });
    }

    // Calculate quality score
    const totalPossibleIssues = occurrences.length * 3;
    const issueWeight = issues.reduce((sum, issue) => {
      const weight = issue.severity === 'critical' ? 10 : issue.severity === 'warning' ? 5 : 1;
      return sum + (weight * issue.confidence);
    }, 0);
    const qualityScore = Math.max(0, 100 - (issueWeight / totalPossibleIssues) * 100);

    // Generate recommendations
    const recommendations = [];
    if (summary.duplicates_count > 0) {
      recommendations.push(
        `Review and merge ${summary.duplicates_count} potential duplicates to improve data integrity`
      );
    }
    if (summary.outliers_count > occurrences.length * 0.1) {
      recommendations.push(
        'Consider reviewing outlier records - unusually high proportion of geographic anomalies'
      );
    }
    if (summary.data_completeness < 60) {
      recommendations.push(
        'Increase data completeness by adding dates and validation status to records'
      );
    }
    if (summary.taxonomy_issues_count > 0) {
      recommendations.push(
        'Standardize species names to canonical scientific nomenclature'
      );
    }

    // Save quality check result
    const checkResult = await base44.entities.DataQualityCheck.create({
      project_id,
      species_id,
      species_name: species.scientific_name,
      check_type,
      total_records: occurrences.length,
      issues_found: issues.length,
      issues,
      summary,
      quality_score: Math.round(qualityScore),
      recommendations,
      run_date: new Date().toISOString(),
      run_by: user.email,
      run_by_name: user.full_name,
      status: 'completed'
    });

    return Response.json({
      success: true,
      check_id: checkResult.id,
      issues_found: issues.length,
      quality_score: Math.round(qualityScore),
      summary
    });
  } catch (error) {
    console.error('Quality check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});