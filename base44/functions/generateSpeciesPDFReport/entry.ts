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
    const { speciesId } = body;

    if (!speciesId) {
      return Response.json({ error: 'Species ID required' }, { status: 400 });
    }

    // Fetch species data
    const species = await base44.entities.Species.list();
    const selectedSpecies = species.find(s => s.id === speciesId);

    if (!selectedSpecies) {
      return Response.json({ error: 'Species not found' }, { status: 404 });
    }

    // Fetch threat assessment
    const threats = await base44.entities.ThreatAssessment.filter({
      species_id: speciesId
    });
    const threatAssessment = threats[0] || null;

    // Fetch IUCN assessment for additional details
    const iucnAssessments = await base44.entities.IUCNAssessment.filter({
      species_id: speciesId
    });
    const iucnData = iucnAssessments[0] || null;

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;
    const margin = 15;

    // Title
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('Species Report', margin, yPos);
    yPos += 15;

    // Species Name
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(selectedSpecies.scientific_name, margin, yPos);
    yPos += 8;

    if (selectedSpecies.common_name) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Common Name: ${selectedSpecies.common_name}`, margin, yPos);
      yPos += 8;
    }

    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // --- CONSERVATION STATUS SECTION ---
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Conservation Status', margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    const statusColor = getIUCNColor(selectedSpecies.iucn_status);
    doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
    doc.text(`IUCN Status: ${selectedSpecies.iucn_status || 'Not Assessed'}`, margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 6;

    if (selectedSpecies.population_trend) {
      doc.text(`Population Trend: ${selectedSpecies.population_trend}`, margin, yPos);
      yPos += 6;
    }

    if (selectedSpecies.observation_count !== undefined) {
      doc.text(`iNaturalist Observations: ${selectedSpecies.observation_count}`, margin, yPos);
      yPos += 6;
    }

    if (selectedSpecies.gbif_occurrence_count !== undefined) {
      doc.text(`GBIF Occurrences: ${selectedSpecies.gbif_occurrence_count}`, margin, yPos);
      yPos += 6;
    }

    yPos += 5;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // --- THREAT ASSESSMENT SECTION ---
    if (threatAssessment) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Threat Assessment', margin, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');

      doc.text(`Threat Score: ${threatAssessment.threat_score?.toFixed(1) || 'N/A'}/100`, margin, yPos);
      yPos += 6;

      doc.text(`Threat Category: ${threatAssessment.threat_category || 'Unknown'}`, margin, yPos);
      yPos += 6;

      if (threatAssessment.habitat_loss_percent !== undefined) {
        doc.text(`Habitat Loss: ${threatAssessment.habitat_loss_percent}%`, margin, yPos);
        yPos += 6;
      }

      if (threatAssessment.protected_area_coverage !== undefined) {
        doc.text(`Protected Area Coverage: ${threatAssessment.protected_area_coverage}%`, margin, yPos);
        yPos += 6;
      }

      if (threatAssessment.climate_suitability_change !== undefined) {
        const sign = threatAssessment.climate_suitability_change >= 0 ? '+' : '';
        doc.text(`Climate Suitability Change (2050): ${sign}${threatAssessment.climate_suitability_change}%`, margin, yPos);
        yPos += 6;
      }

      if (threatAssessment.range_area_km2) {
        doc.text(`Range Area: ${threatAssessment.range_area_km2?.toFixed(0)} km²`, margin, yPos);
        yPos += 6;
      }

      if (threatAssessment.recommendations && threatAssessment.recommendations.length > 0) {
        yPos += 5;
        doc.setFont(undefined, 'bold');
        doc.text('Recommendations:', margin, yPos);
        yPos += 6;
        doc.setFont(undefined, 'normal');

        threatAssessment.recommendations.forEach((rec, idx) => {
          const wrapped = doc.splitTextToSize(`• ${rec}`, pageWidth - 2 * margin - 5);
          wrapped.forEach(line => {
            if (yPos > pageHeight - 20) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(line, margin + 5, yPos);
            yPos += 5;
          });
        });
      }

      yPos += 5;
    }

    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // --- ADDITIONAL DETAILS SECTION ---
    if (iucnData) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Additional Details', margin, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');

      if (iucnData.habitat) {
        doc.setFont(undefined, 'bold');
        doc.text('Habitat:', margin, yPos);
        yPos += 5;
        doc.setFont(undefined, 'normal');
        const habitatWrapped = doc.splitTextToSize(iucnData.habitat, pageWidth - 2 * margin - 5);
        habitatWrapped.slice(0, 3).forEach(line => {
          doc.text(line, margin + 5, yPos);
          yPos += 5;
        });
        yPos += 2;
      }

      if (iucnData.threats) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont(undefined, 'bold');
        doc.text('Threats:', margin, yPos);
        yPos += 5;
        doc.setFont(undefined, 'normal');
        const threatsWrapped = doc.splitTextToSize(iucnData.threats, pageWidth - 2 * margin - 5);
        threatsWrapped.slice(0, 3).forEach(line => {
          doc.text(line, margin + 5, yPos);
          yPos += 5;
        });
      }
    }

    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // --- FOOTER ---
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString()} | DataWinder Species Report`, margin, pageHeight - 10);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${selectedSpecies.scientific_name.replace(/\s+/g, '_')}_report.pdf"`
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getIUCNColor(status) {
  const colors = {
    'EX': { r: 0, g: 0, b: 0 },
    'EW': { r: 0, g: 0, b: 0 },
    'CR': { r: 255, g: 0, b: 0 },
    'EN': { r: 255, g: 85, b: 0 },
    'VU': { r: 255, g: 192, b: 0 },
    'NT': { r: 200, g: 200, b: 0 },
    'LC': { r: 0, g: 128, b: 0 },
    'DD': { r: 128, g: 128, b: 128 },
    'NE': { r: 200, g: 200, b: 200 }
  };
  return colors[status] || { r: 128, g: 128, b: 128 };
}