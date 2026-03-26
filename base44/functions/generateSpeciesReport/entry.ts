import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import jsPDF from 'npm:jspdf@4.0.0';
import { base44Integrations } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId, itemName, format, sections } = await req.json();

    // Fetch species data
    const species = await base44.entities.Species.get(itemId);
    
    // Fetch related data
    const assessment = species.iucn_assessment_id
      ? await base44.entities.IUCNAssessment.get(species.iucn_assessment_id)
      : null;
    
    const taxonomy = species.iucn_taxonomy_id
      ? await base44.entities.IUCNTaxonomy.get(species.iucn_taxonomy_id)
      : null;

    const rangeData = species.iucn_range_data_id
      ? await base44.entities.IUCNRangeData.get(species.iucn_range_data_id)
      : null;

    const threatAssessment = await base44.entities.ThreatAssessment.filter(
      { species_id: itemId },
      '-created_date',
      1
    );

    const notes = await base44.entities.SpeciesNote.filter(
      { species_scientific_name: species.scientific_name },
      '-observation_date',
      10
    );

    // Create PDF
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.text(`${species.scientific_name} Report`, 20, yPosition);
    yPosition += 15;

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 8;

    doc.setTextColor(0);

    // Overview Section
    if (sections.includes('overview')) {
      doc.setFontSize(14);
      doc.text('Overview & Status', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      if (species.common_name) {
        doc.text(`Common Name: ${species.common_name}`, 20, yPosition);
        yPosition += 6;
      }
      
      doc.text(`IUCN Status: ${species.iucn_status || 'Not assessed'}`, 20, yPosition);
      yPosition += 6;

      if (species.population_trend) {
        doc.text(`Population Trend: ${species.population_trend}`, 20, yPosition);
        yPosition += 6;
      }

      yPosition += 5;
    }

    // Taxonomy Section
    if (sections.includes('taxonomy') && taxonomy) {
      doc.setFontSize(14);
      doc.text('Taxonomic Classification', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      const taxFields = [
        ['Kingdom', taxonomy.kingdom],
        ['Phylum', taxonomy.phylum],
        ['Class', taxonomy.class_name],
        ['Order', taxonomy.order_name],
        ['Family', taxonomy.family],
        ['Genus', taxonomy.genus],
      ];

      taxFields.forEach(([label, value]) => {
        if (value) {
          doc.text(`${label}: ${value}`, 20, yPosition);
          yPosition += 6;
        }
      });

      yPosition += 5;
    }

    // Conservation Section
    if (sections.includes('conservation') && assessment) {
      doc.setFontSize(14);
      doc.text('Conservation Assessment', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      if (assessment.assessment_date) {
        doc.text(`Assessment Date: ${assessment.assessment_date}`, 20, yPosition);
        yPosition += 6;
      }

      if (assessment.habitat) {
        doc.text('Habitat:', 20, yPosition);
        yPosition += 6;
        const habitatWrapped = doc.splitTextToSize(assessment.habitat, 170);
        doc.text(habitatWrapped, 20, yPosition);
        yPosition += habitatWrapped.length * 6 + 5;
      }

      yPosition += 5;
    }

    // Threats Section
    if (sections.includes('threats') && threatAssessment.length > 0) {
      const threat = threatAssessment[0];
      doc.setFontSize(14);
      doc.text('Threat Assessment', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.text(`Threat Score: ${threat.threat_score || 'N/A'}`, 20, yPosition);
      yPosition += 6;

      doc.text(`Threat Category: ${threat.threat_category || 'N/A'}`, 20, yPosition);
      yPosition += 6;

      if (threat.habitat_loss_percent) {
        doc.text(`Estimated Habitat Loss: ${threat.habitat_loss_percent}%`, 20, yPosition);
        yPosition += 6;
      }

      if (threat.recommendations && threat.recommendations.length > 0) {
        doc.text('Conservation Recommendations:', 20, yPosition);
        yPosition += 6;
        threat.recommendations.slice(0, 3).forEach(rec => {
          const recWrapped = doc.splitTextToSize(`• ${rec}`, 165);
          doc.text(recWrapped, 25, yPosition);
          yPosition += recWrapped.length * 6;
        });
      }

      yPosition += 5;
    }

    // Notes Section
    if (sections.includes('notes') && notes.length > 0) {
      doc.setFontSize(14);
      doc.text('Research Notes', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      notes.forEach(note => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(`Date: ${note.observation_date}`, 20, yPosition);
        yPosition += 5;

        if (note.location) {
          doc.text(`Location: ${note.location}`, 20, yPosition);
          yPosition += 5;
        }

        const noteWrapped = doc.splitTextToSize(note.note, 170);
        doc.text(noteWrapped, 20, yPosition);
        yPosition += noteWrapped.length * 5 + 5;
      });
    }

    // Generate PDF as data URL
    const pdfData = doc.output('dataurlstring');

    return Response.json({
      success: true,
      fileUrl: pdfData,
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});