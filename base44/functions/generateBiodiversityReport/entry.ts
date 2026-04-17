import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { reportId, format = 'both', manualFilters } = body;

    // Fetch report configuration
    let report;
    if (reportId) {
      report = await base44.entities.ScheduledReport.filter({ id: reportId });
      report = report[0];
    } else if (manualFilters) {
      report = { filters: manualFilters, report_type: 'biodiversity_health' };
    } else {
      return Response.json({ error: 'Report ID or filters required' }, { status: 400 });
    }

    // Gather occurrence data
    const occurrences = await fetchOccurrenceData(base44, report.filters);

    // Gather validation flags
    const flags = await fetchValidationFlags(base44, report.filters);

    // Calculate statistics
    const stats = calculateStatistics(occurrences, flags);

    // Generate reports
    const reports = {};

    if (format === 'pdf' || format === 'both') {
      reports.pdf = await generatePDFReport(report, occurrences, flags, stats);
    }

    if (format === 'csv' || format === 'both') {
      reports.csv = generateCSVReport(occurrences, flags);
    }

    // Update last generated timestamp
    if (reportId) {
      await base44.entities.ScheduledReport.update(reportId, {
        last_generated: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      stats,
      files: Object.keys(reports).filter(k => reports[k])
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function fetchOccurrenceData(base44, filters = {}) {
  let query = {};

  if (filters.species_ids?.length > 0) {
    // Filter by species - would need to fetch and match
  }

  if (filters.date_range_days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filters.date_range_days);
    // Would add date filtering to query
  }

  // Fetch all available occurrence notes as proxy for occurrence data
  const occurrences = await base44.entities.OccurrenceNote.list();

  return occurrences;
}

async function fetchValidationFlags(base44, filters = {}) {
  let flagQuery = {};

  if (filters.flag_severity?.length > 0) {
    // Would filter by severity if API supports it
  }

  if (filters.include_validation_flags === false) {
    return [];
  }

  const flags = await base44.entities.ValidationFlag.list();

  return flags;
}

function calculateStatistics(occurrences, flags) {
  const stats = {
    total_occurrences: occurrences.length,
    total_flags: flags.length,
    flag_breakdown: {
      error: flags.filter(f => f.severity === 'error').length,
      warning: flags.filter(f => f.severity === 'warning').length,
      info: flags.filter(f => f.severity === 'info').length
    },
    flag_status: {
      flagged: flags.filter(f => f.status === 'flagged').length,
      reviewed: flags.filter(f => f.status === 'reviewed').length,
      corrected: flags.filter(f => f.status === 'corrected').length,
      dismissed: flags.filter(f => f.status === 'dismissed').length
    },
    geographic_coverage: {
      unique_countries: new Set(occurrences.map(o => o.country || 'Unknown')).size,
      latitude_range: {
        min: Math.min(...occurrences.map(o => o.latitude || 0)),
        max: Math.max(...occurrences.map(o => o.latitude || 0))
      }
    },
    temporal_coverage: {
      earliest: occurrences.length > 0 ? occurrences.map(o => o.occurrence_date).sort()[0] : 'N/A',
      latest: occurrences.length > 0 ? occurrences.map(o => o.occurrence_date).sort().pop() : 'N/A'
    }
  };

  return stats;
}

async function generatePDFReport(report, occurrences, flags, stats) {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;

  // Title
  doc.setFontSize(20);
  doc.text('Biodiversity Health Report', margin, yPosition);
  yPosition += 15;

  // Date and metadata
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Report Type: ${report.report_type}`, margin, yPosition);
  yPosition += 10;

  doc.setTextColor(0);

  // Summary Stats
  doc.setFontSize(14);
  doc.text('Summary Statistics', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.text(`Total Occurrences: ${stats.total_occurrences}`, margin + 2, yPosition);
  yPosition += 5;
  doc.text(`Total Validation Flags: ${stats.total_flags}`, margin + 2, yPosition);
  yPosition += 5;
  doc.text(`  • Critical Errors: ${stats.flag_breakdown.error}`, margin + 4, yPosition);
  yPosition += 4;
  doc.text(`  • Warnings: ${stats.flag_breakdown.warning}`, margin + 4, yPosition);
  yPosition += 4;
  doc.text(`  • Info: ${stats.flag_breakdown.info}`, margin + 4, yPosition);
  yPosition += 10;

  // Geographic Coverage
  doc.setFontSize(14);
  doc.text('Geographic Coverage', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.text(`Countries Represented: ${stats.geographic_coverage.unique_countries}`, margin + 2, yPosition);
  yPosition += 5;
  doc.text(
    `Latitude Range: ${stats.geographic_coverage.latitude_range.min.toFixed(2)}° to ${stats.geographic_coverage.latitude_range.max.toFixed(2)}°`,
    margin + 2,
    yPosition
  );
  yPosition += 10;

  // Temporal Coverage
  doc.setFontSize(14);
  doc.text('Temporal Coverage', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.text(`Earliest Record: ${stats.temporal_coverage.earliest}`, margin + 2, yPosition);
  yPosition += 5;
  doc.text(`Latest Record: ${stats.temporal_coverage.latest}`, margin + 2, yPosition);
  yPosition += 10;

  // Flag Status Breakdown
  if (stats.total_flags > 0) {
    doc.setFontSize(14);
    doc.text('Flag Status', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    doc.text(`Flagged (Unreviewed): ${stats.flag_status.flagged}`, margin + 2, yPosition);
    yPosition += 4;
    doc.text(`Reviewed: ${stats.flag_status.reviewed}`, margin + 2, yPosition);
    yPosition += 4;
    doc.text(`Corrected: ${stats.flag_status.corrected}`, margin + 2, yPosition);
    yPosition += 4;
    doc.text(`Dismissed: ${stats.flag_status.dismissed}`, margin + 2, yPosition);
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('DataWinder Biodiversity Analysis Platform', margin, pageHeight - 10);

  return doc.output('arraybuffer');
}

function generateCSVReport(occurrences, flags) {
  const rows = [];

  // Header
  rows.push(['Type', 'Species', 'Latitude', 'Longitude', 'Date', 'Source', 'Status/Severity', 'Message']);

  // Occurrences
  occurrences.forEach(occ => {
    rows.push([
      'Occurrence',
      occ.species_name || 'Unknown',
      occ.latitude || '',
      occ.longitude || '',
      occ.occurrence_date || '',
      occ.source || 'Unknown',
      'Active',
      ''
    ]);
  });

  // Validation Flags
  flags.forEach(flag => {
    rows.push([
      'Validation Flag',
      flag.species_name || 'Unknown',
      flag.occurrence_data?.latitude || '',
      flag.occurrence_data?.longitude || '',
      flag.created_date || '',
      flag.rule_name,
      flag.severity.toUpperCase(),
      flag.message
    ]);
  });

  // Convert to CSV
  const csv = rows.map(row =>
    row.map(cell => {
      const value = cell ? String(cell).replace(/"/g, '""') : '';
      return `"${value}"`;
    }).join(',')
  ).join('\n');

  return csv;
}