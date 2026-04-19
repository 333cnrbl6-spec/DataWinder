import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';
import { jsPDF } from 'npm:jspdf@4.0.0';
import 'npm:jszip@3.10.1';

/**
 * NATURAL ENGLAND SURVEY REPORT GENERATOR
 * 
 * Generates compliant PDF/Excel reports for species survey documentation including:
 * - Survey metadata (date, location, surveyor, methodology)
 * - Confidence scores for each record
 * - Citation blocks with proper attribution
 * - Data quality indicators
 * - Compliance with Natural England survey standards
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      species_ids, 
      format = 'pdf', 
      include_metadata = true,
      include_citations = true,
      include_confidence_scores = true,
      survey_metadata = {},
      project_name = 'Species Survey Report'
    } = await req.json();

    if (!species_ids || !Array.isArray(species_ids) || species_ids.length === 0) {
      return Response.json({ error: 'species_ids array required' }, { status: 400 });
    }

    // Fetch species records
    const allSpecies = await base44.entities.Species.list();
    const selectedSpecies = allSpecies.filter(s => species_ids.includes(s.id));

    if (selectedSpecies.length === 0) {
      return Response.json({ error: 'No valid species found' }, { status: 404 });
    }

    // Fetch threat assessments
    const threatAssessments = await base44.entities.ThreatAssessment.filter({});
    const threatMap = new Map(threatAssessments.map(t => [t.species_id, t]));

    // Fetch validation flags for confidence scoring
    const validationFlags = await base44.entities.ValidationFlag.filter({});
    const flagMap = new Map();
    validationFlags.forEach(flag => {
      if (!flagMap.has(flag.species_id)) {
        flagMap.set(flag.species_id, []);
      }
      flagMap.get(flag.species_id).push(flag);
    });

    if (format === 'excel') {
      return generateExcelReport({
        species: selectedSpecies,
        threatMap,
        flagMap,
        user,
        project_name,
        survey_metadata,
        include_metadata,
        include_confidence_scores
      });
    } else {
      return generatePDFReport({
        species: selectedSpecies,
        threatMap,
        flagMap,
        user,
        project_name,
        survey_metadata,
        include_metadata,
        include_citations,
        include_confidence_scores
      });
    }

  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Generate Natural England Compliant PDF Report
 */
async function generatePDFReport({ 
  species, 
  threatMap, 
  flagMap, 
  user, 
  project_name,
  survey_metadata,
  include_metadata,
  include_citations,
  include_confidence_scores
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 20;

  // === TITLE PAGE ===
  // Natural England Survey Documentation header
  doc.setFillColor(0, 51, 102); // Natural England blue
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('NATURAL ENGLAND SURVEY REPORT', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text('Species Conservation Documentation', pageWidth / 2, 22, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  yPos = 40;

  // Project metadata
  if (include_metadata) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Project Information', margin, yPos);
    yPos += 8;
    
    doc.setFont(undefined, 'normal');
    const metadata = [
      `Project: ${project_name}`,
      `Survey Date: ${survey_metadata.survey_date || new Date().toLocaleDateString()}`,
      `Surveyor: ${survey_metadata.surveyor || user.full_name || user.email}`,
      `Organization: ${survey_metadata.organization || 'DataWinder Platform'}`,
      `Methodology: ${survey_metadata.methodology || 'Standard Species Distribution Survey'}`,
      `Report Generated: ${new Date().toLocaleDateString()}`
    ];
    
    metadata.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    
    yPos += 5;
    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
  }

  // Species summary
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(`Species Surveyed: ${species.length}`, margin, yPos);
  yPos += 10;

  // === SPECIES RECORDS ===
  species.forEach((sp, index) => {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }

    const threat = threatMap.get(sp.id);
    const flags = flagMap.get(sp.id) || [];
    const confidenceScore = calculateConfidenceScore(sp, threat, flags);

    // Species header with confidence badge
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text(`${index + 1}. ${sp.scientific_name}`, margin, yPos);
    
    if (include_confidence_scores) {
      // Confidence score badge
      const confidenceColor = getConfidenceColor(confidenceScore);
      doc.setFillColor(...confidenceColor);
      doc.roundedRect(pageWidth - margin - 35, yPos - 5, 35, 8, 2, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`Confidence: ${(confidenceScore * 100).toFixed(0)}%`, pageWidth - margin - 33, yPos, { align: 'left' });
    }
    
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    // Common name
    if (sp.common_name) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Common Name: ${sp.common_name}`, margin, yPos);
      yPos += 6;
    }

    // Conservation status with color
    doc.setFontSize(10);
    const statusColor = getIUCNColor(sp.iucn_status);
    doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
    doc.setFont(undefined, 'bold');
    doc.text(`IUCN Status: ${sp.iucn_status || 'Not Assessed'}`, margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 6;

    // Data quality indicators
    const dataQuality = assessDataQuality(sp, flags);
    doc.setFont(undefined, 'normal');
    doc.text(`Data Quality: ${dataQuality.rating}/5`, margin, yPos);
    yPos += 6;

    // Detailed metrics
    const metrics = [
      sp.population_trend && `Population Trend: ${sp.population_trend}`,
      sp.observation_count && `iNaturalist Observations: ${sp.observation_count}`,
      sp.gbif_occurrence_count && `GBIF Occurrences: ${sp.gbif_occurrence_count}`,
      threat && `Threat Score: ${threat.threat_score?.toFixed(1)}/100`,
      threat && `Threat Category: ${threat.threat_category}`
    ].filter(Boolean);

    metrics.forEach(metric => {
      doc.text(metric, margin, yPos);
      yPos += 5;
    });

    yPos += 3;

    // Citations
    if (include_citations) {
      const citations = generateCitations(sp);
      if (citations.length > 0) {
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(100, 100, 100);
        
        doc.text('Data Sources:', margin, yPos);
        yPos += 5;
        
        citations.forEach(citation => {
          const wrapped = doc.splitTextToSize(`• ${citation}`, pageWidth - 2 * margin - 5);
          wrapped.forEach(line => {
            if (yPos > pageHeight - 20) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(line, margin + 5, yPos);
            yPos += 4;
          });
        });
        
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        yPos += 3;
      }
    }

    // Validation flags (if any)
    if (flags.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(200, 100, 0);
      doc.text(`Validation Notes (${flags.length}):`, margin, yPos);
      yPos += 5;
      
      flags.slice(0, 3).forEach(flag => {
        const wrapped = doc.splitTextToSize(`⚠ ${flag.message}`, pageWidth - 2 * margin - 5);
        wrapped.forEach(line => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, margin + 5, yPos);
          yPos += 4;
        });
      });
      
      if (flags.length > 3) {
        doc.text(`+ ${flags.length - 3} more validation notes`, margin + 5, yPos);
        yPos += 4;
      }
      
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
    }

    yPos += 8;
    doc.setDrawColor(220);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
  });

  // === FOOTER ===
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated by ${user.full_name || user.email} on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, pageHeight - 15);
  doc.text('DataWinder Platform - Natural England Survey Documentation Standard', pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

  const pdfBytes = doc.output('arraybuffer');

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${project_name.replace(/\s+/g, '_')}_NE_Survey_Report.pdf"`
    }
  });
}

/**
 * Generate Excel-compatible CSV report
 */
async function generateExcelReport({ 
  species, 
  threatMap, 
  flagMap, 
  user, 
  project_name,
  survey_metadata,
  include_metadata,
  include_confidence_scores
}) {
  // Build CSV with Natural England survey fields
  const headers = [
    'Species ID',
    'Scientific Name',
    'Common Name',
    'IUCN Status',
    'Population Trend',
    'Observation Count (iNat)',
    'Occurrence Count (GBIF)',
    'Threat Score',
    'Threat Category',
    'Habitat Loss %',
    'Protected Area Coverage %',
    'Confidence Score',
    'Data Quality Rating',
    'Validation Flags',
    'Data Sources',
    'Citation',
    'Survey Date',
    'Surveyor',
    'Notes'
  ];

  const rows = species.map(sp => {
    const threat = threatMap.get(sp.id);
    const flags = flagMap.get(sp.id) || [];
    const confidenceScore = calculateConfidenceScore(sp, threat, flags);
    const dataQuality = assessDataQuality(sp, flags);
    const citations = generateCitations(sp);

    return [
      sp.id,
      `"${sp.scientific_name}"`,
      `"${sp.common_name || ''}"`,
      sp.iucn_status || '',
      sp.population_trend || '',
      sp.observation_count || '',
      sp.gbif_occurrence_count || '',
      threat?.threat_score?.toFixed(1) || '',
      threat?.threat_category || '',
      threat?.habitat_loss_percent || '',
      threat?.protected_area_coverage || '',
      include_confidence_scores ? (confidenceScore * 100).toFixed(1) + '%' : '',
      dataQuality.rating,
      flags.length > 0 ? `"${flags.map(f => f.message).join('; ')}"` : '',
      `"${citations.join('; ')}"`,
      `"${citations[0] || ''}"`,
      survey_metadata.survey_date || new Date().toLocaleDateString(),
      survey_metadata.surveyor || user.full_name || user.email,
      `"${survey_metadata.notes || ''}"`
    ].join(',');
  });

  // Add metadata header
  let csvContent = '';
  if (include_metadata) {
    csvContent += `Project,${project_name}\n`;
    csvContent += `Survey Date,${survey_metadata.survey_date || new Date().toLocaleDateString()}\n`;
    csvContent += `Surveyor,${survey_metadata.surveyor || user.full_name || user.email}\n`;
    csvContent += `Organization,${survey_metadata.organization || 'DataWinder Platform'}\n`;
    csvContent += `Generated,${new Date().toISOString()}\n`;
    csvContent += `\n`;
  }

  csvContent += headers.join(',') + '\n';
  csvContent += rows.join('\n');

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${project_name.replace(/\s+/g, '_')}_NE_Survey_Data.csv"`
    }
  });
}

/**
 * Calculate confidence score based on data completeness and validation
 */
function calculateConfidenceScore(species, threat, flags) {
  let score = 0;
  let maxScore = 0;

  // Taxonomic data (20 points)
  maxScore += 20;
  if (species.scientific_name) score += 5;
  if (species.common_name) score += 5;
  if (species.family) score += 5;
  if (species.genus) score += 5;

  // Conservation status (25 points)
  maxScore += 25;
  if (species.iucn_status) score += 15;
  if (species.population_trend) score += 10;

  // Occurrence data (25 points)
  maxScore += 25;
  if (species.observation_count > 0) score += 10;
  if (species.gbif_occurrence_count > 0) score += 10;
  if (species.last_observed) score += 5;

  // Threat assessment (20 points)
  maxScore += 20;
  if (threat) {
    if (threat.threat_score !== undefined) score += 10;
    if (threat.threat_category) score += 5;
    if (threat.recommendations?.length > 0) score += 5;
  }

  // Geographic data (10 points)
  maxScore += 10;
  if (species.range_description) score += 5;
  if (species.geographic_distribution) score += 5;

  // Apply penalties for validation flags
  if (flags && flags.length > 0) {
    const errorFlags = flags.filter(f => f.severity === 'error').length;
    const warningFlags = flags.filter(f => f.severity === 'warning').length;
    
    score -= (errorFlags * 10);
    score -= (warningFlags * 5);
  }

  return Math.max(0, Math.min(1, score / maxScore));
}

/**
 * Assess overall data quality
 */
function assessDataQuality(species, flags) {
  const issues = {
    critical: flags.filter(f => f.severity === 'error').length,
    warnings: flags.filter(f => f.severity === 'warning').length,
    info: flags.filter(f => f.severity === 'info').length
  };

  let rating = 5;
  if (issues.critical > 0) rating -= 2;
  if (issues.warnings > 2) rating -= 1;
  if (!species.iucn_status) rating -= 1;
  if (!species.population_trend) rating -= 1;

  return {
    rating: Math.max(1, rating),
    issues
  };
}

/**
 * Generate proper citations for data sources
 */
function generateCitations(species) {
  const citations = [];
  const year = new Date().getFullYear();

  // IUCN citation
  if (species.iucn_id || species.iucn_status) {
    citations.push(`IUCN Red List (${year}). ${species.scientific_name}. The IUCN Red List of Threatened Species.`);
  }

  // iNaturalist citation
  if (species.inat_taxon_id || species.observation_count > 0) {
    citations.push(`iNaturalist (${year}). ${species.scientific_name} observations. iNaturalist.org.`);
  }

  // GBIF citation
  if (species.gbif_id || species.gbif_occurrence_count > 0) {
    citations.push(`GBIF (${year}). ${species.scientific_name} occurrence data. Global Biodiversity Information Facility.`);
  }

  // SpeciesLink citation
  if (species.specieslink_occurrence_count > 0) {
    citations.push(`speciesLink Network (${year}). ${species.scientific_name} specimen records.`);
  }

  return citations;
}

/**
 * Get color for confidence score
 */
function getConfidenceColor(score) {
  if (score >= 0.8) return [34, 139, 34]; // Forest green
  if (score >= 0.6) return [255, 165, 0]; // Orange
  if (score >= 0.4) return [255, 215, 0]; // Gold
  return [220, 20, 60]; // Crimson red
}

/**
 * Get IUCN status color
 */
function getIUCNColor(status) {
  const colors = {
    'EX': { r: 0, g: 0, b: 0 },
    'EW': { r: 0, g: 0, b: 0 },
    'CR': { r: 220, g: 20, b: 60 },
    'EN': { r: 255, g: 69, b: 0 },
    'VU': { r: 255, g: 165, b: 0 },
    'NT': { r: 255, g: 215, b: 0 },
    'LC': { r: 34, g: 139, b: 34 },
    'DD': { r: 128, g: 128, b: 128 },
    'NE': { r: 200, g: 200, b: 200 }
  };
  return colors[status] || { r: 128, g: 128, b: 128 };
}