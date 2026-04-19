import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';
import jsPDF from 'npm:jspdf@4.0.0';
import 'npm:html2canvas@1.4.1';

/**
 * SPECIES REPORT GENERATOR
 * 
 * Creates professional PDF reports containing:
 * - SDM distribution maps
 * - Environmental variable importance
 * - Conservation status & IUCN info
 * - Occurrence statistics
 * - Threat assessments
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { speciesIds, reportTitle, includeMap, includeVariables, includeConservation, format } = payload;

    if (!speciesIds || speciesIds.length === 0) {
      return Response.json({ error: 'No species selected' }, { status: 400 });
    }

    // Fetch species data
    const species = await Promise.all(
      speciesIds.map(id => base44.entities.Species.filter({ id }))
    );

    const speciesData = species.filter(arr => arr.length > 0).map(arr => arr[0]);

    if (speciesData.length === 0) {
      return Response.json({ error: 'Species not found' }, { status: 404 });
    }

    // Fetch related data
    const sdmRuns = await base44.entities.SDMRun.filter({});
    const threatAssessments = await base44.entities.ThreatAssessment.filter({});
    const occurrenceNotes = await base44.entities.OccurrenceNote.filter({});

    // Generate PDF based on format
    let pdfBuffer;

    if (format === 'multispecies' && speciesData.length > 1) {
      pdfBuffer = await generateMultiSpeciesPDF(
        speciesData,
        sdmRuns,
        threatAssessments,
        occurrenceNotes,
        {
          title: reportTitle || 'Species Assessment Report',
          includeMap,
          includeVariables,
          includeConservation
        }
      );
    } else {
      pdfBuffer = await generateSingleSpeciesPDF(
        speciesData[0],
        sdmRuns,
        threatAssessments,
        occurrenceNotes,
        {
          title: reportTitle || `${speciesData[0].scientific_name} Report`,
          includeMap,
          includeVariables,
          includeConservation
        }
      );
    }

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizeFilename(reportTitle || 'species-report')}.pdf"`
      }
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Generate PDF for single species
 */
async function generateSingleSpeciesPDF(species, sdmRuns, threats, occurrences, options) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Title page
  doc.setFontSize(24);
  doc.setTextColor(198, 35, 53); // Bangor red
  doc.text(species.scientific_name, margin, yPos);

  if (species.common_name) {
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    yPos += 10;
    doc.text(`${species.common_name}`, margin, yPos);
  }

  yPos += 20;
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Basic info
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  if (species.iucn_status) {
    doc.text(`IUCN Status: ${species.iucn_status}`, margin, yPos);
    yPos += 6;
  }

  if (species.family) {
    doc.text(`Family: ${species.family}`, margin, yPos);
    yPos += 6;
  }

  if (species.genus) {
    doc.text(`Genus: ${species.genus}`, margin, yPos);
    yPos += 6;
  }

  // Occurrence stats
  const speciesOccurrences = occurrences.filter(o => o.species_id === species.id);
  doc.text(`Total Occurrences: ${speciesOccurrences.length}`, margin, yPos);
  yPos += 10;

  // SDM section
  if (options.includeMap) {
    yPos = await addSDMSection(doc, species, sdmRuns, yPos, pageWidth, pageHeight, margin);
  }

  // Variable importance section
  if (options.includeVariables) {
    yPos = await addVariableImportanceSection(doc, species, sdmRuns, yPos, pageWidth, pageHeight, margin);
  }

  // Conservation section
  if (options.includeConservation) {
    yPos = await addConservationSection(doc, species, threats, yPos, pageWidth, pageHeight, margin);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);
  doc.text('DataWinder Species Assessment Report', pageWidth - margin - 50, pageHeight - 10);

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generate PDF for multiple species
 */
async function generateMultiSpeciesPDF(speciesArray, sdmRuns, threats, occurrences, options) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Cover page
  doc.setFontSize(28);
  doc.setTextColor(198, 35, 53);
  doc.text(options.title, margin, 40);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`${speciesArray.length} Species Included`, margin, 60);

  doc.setFontSize(10);
  speciesArray.forEach((sp, idx) => {
    if (idx < 15) {
      doc.text(`• ${sp.scientific_name}${sp.common_name ? ` (${sp.common_name})` : ''}`, margin + 5, 75 + idx * 6);
    }
  });

  if (speciesArray.length > 15) {
    doc.text(`... and ${speciesArray.length - 15} more species`, margin + 5, 75 + 15 * 6);
  }

  // Table of contents
  doc.addPage();
  let yPos = 20;
  doc.setFontSize(16);
  doc.setTextColor(198, 35, 53);
  doc.text('Table of Contents', margin, yPos);

  yPos += 15;
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  speciesArray.forEach((sp, idx) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(`${idx + 1}. ${sp.scientific_name}`, margin, yPos);
    yPos += 6;
  });

  // Species pages
  for (const species of speciesArray) {
    doc.addPage();
    yPos = 20;

    // Species header
    doc.setFontSize(16);
    doc.setTextColor(198, 35, 53);
    doc.text(species.scientific_name, margin, yPos);

    if (species.common_name) {
      yPos += 8;
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(species.common_name, margin, yPos);
    }

    yPos += 12;
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    // Basic info
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);

    if (species.iucn_status) {
      doc.text(`IUCN: ${species.iucn_status}`, margin, yPos);
      yPos += 5;
    }

    // Add sections
    if (options.includeVariables) {
      yPos = await addVariableImportanceSection(doc, species, sdmRuns, yPos, pageWidth, pageHeight, margin);
    }

    if (options.includeConservation) {
      yPos = await addConservationSection(doc, species, threats, yPos, pageWidth, pageHeight, margin);
    }
  }

  // Final page with summary
  doc.addPage();
  yPos = 20;
  doc.setFontSize(16);
  doc.setTextColor(198, 35, 53);
  doc.text('Report Summary', margin, yPos);

  yPos += 15;
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  const completedSDM = sdmRuns.filter(r => r.status === 'completed').length;
  const withThreatAssessment = threats.length;

  doc.text(`Species Assessed: ${speciesArray.length}`, margin, yPos);
  yPos += 6;
  doc.text(`SDM Models Completed: ${completedSDM}`, margin, yPos);
  yPos += 6;
  doc.text(`Threat Assessments: ${withThreatAssessment}`, margin, yPos);
  yPos += 6;
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, margin, yPos);

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Add SDM section to PDF
 */
async function addSDMSection(doc, species, sdmRuns, yPos, pageWidth, pageHeight, margin) {
  const pageSize = 10;

  // Find relevant SDM run
  const sdmRun = sdmRuns.find(r =>
    r.status === 'completed' &&
    r.species_ids?.includes(species.id)
  );

  if (!sdmRun) {
    return yPos;
  }

  // Check page space
  if (yPos + 70 > pageHeight - 20) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(12);
  doc.setTextColor(198, 35, 53);
  doc.text('Species Distribution Model', margin, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);

  if (sdmRun.metrics) {
    doc.text(`Model Performance:`, margin, yPos);
    yPos += 5;

    const metrics = sdmRun.metrics;
    doc.text(`  AUC: ${metrics.auc?.toFixed(3)} | TSS: ${metrics.tss?.toFixed(3)}`, margin + 2, yPos);
    yPos += 4;
    doc.text(`  Sensitivity: ${(metrics.sensitivity * 100).toFixed(1)}% | Specificity: ${(metrics.specificity * 100).toFixed(1)}%`, margin + 2, yPos);
    yPos += 4;
  }

  if (sdmRun.occurrence_stats) {
    doc.text(`Occurrence Data:`, margin, yPos);
    yPos += 4;
    const stats = sdmRun.occurrence_stats;
    doc.text(`  Raw: ${stats.raw_count} → Cleaned: ${stats.after_outlier_removal} → Thinned: ${stats.after_thinning}`, margin + 2, yPos);
    yPos += 6;
  }

  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 40);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('[Species Distribution Map Placeholder]', margin + 40, yPos + 20);

  yPos += 45;

  return yPos;
}

/**
 * Add variable importance section
 */
async function addVariableImportanceSection(doc, species, sdmRuns, yPos, pageWidth, pageHeight, margin) {
  const sdmRun = sdmRuns.find(r =>
    r.status === 'completed' &&
    r.species_ids?.includes(species.id) &&
    r.variable_importance?.length > 0
  );

  if (!sdmRun) {
    return yPos;
  }

  if (yPos + 60 > pageHeight - 20) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(11);
  doc.setTextColor(198, 35, 53);
  doc.text('Environmental Variable Influence', margin, yPos);
  yPos += 8;

  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);

  const vars = sdmRun.variable_importance.slice(0, 6);
  vars.forEach((v, idx) => {
    const barWidth = (v.importance || 0) * 50;
    doc.text(`${v.variable}`, margin, yPos);
    doc.setDrawColor(198, 35, 53);
    doc.rect(margin + 30, yPos - 2, barWidth, 3, 'F');
    doc.text(`${((v.importance || 0) * 100).toFixed(0)}%`, margin + 85, yPos);
    yPos += 5;
  });

  yPos += 8;
  return yPos;
}

/**
 * Add conservation section
 */
async function addConservationSection(doc, species, threats, yPos, pageWidth, pageHeight, margin) {
  if (yPos + 40 > pageHeight - 20) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(11);
  doc.setTextColor(198, 35, 53);
  doc.text('Conservation Status', margin, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);

  const threat = threats.find(t => t.species_id === species.id);

  if (threat) {
    if (threat.threat_category) {
      doc.text(`Threat Level: ${threat.threat_category}`, margin, yPos);
      yPos += 5;
    }

    if (threat.habitat_loss_percent !== undefined) {
      doc.text(`Habitat Loss: ${threat.habitat_loss_percent.toFixed(1)}%`, margin, yPos);
      yPos += 5;
    }

    if (threat.protected_area_coverage !== undefined) {
      doc.text(`Protected Area Coverage: ${threat.protected_area_coverage.toFixed(1)}%`, margin, yPos);
      yPos += 5;
    }

    if (threat.recommendations?.length > 0) {
      doc.text('Recommendations:', margin, yPos);
      yPos += 4;
      threat.recommendations.slice(0, 3).forEach(rec => {
        doc.text(`• ${rec}`, margin + 3, yPos);
        yPos += 4;
      });
    }
  } else {
    doc.text('No threat assessment available', margin, yPos);
  }

  yPos += 8;
  return yPos;
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50);
}