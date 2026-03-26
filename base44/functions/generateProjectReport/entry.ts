import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import jsPDF from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId, itemName, format, sections } = await req.json();

    // Fetch project data
    const project = await base44.entities.Project.get(itemId);

    // Fetch species list if referenced
    let speciesList = [];
    if (project.species_lists_ids && project.species_lists_ids.length > 0) {
      const list = await base44.entities.SpeciesList.get(project.species_lists_ids[0]);
      if (list && list.species_ids) {
        // Fetch first 20 species for summary
        const speciesIds = list.species_ids.slice(0, 20);
        for (const spId of speciesIds) {
          try {
            const sp = await base44.entities.Species.get(spId);
            speciesList.push(sp);
          } catch (e) {
            // Skip if species not found
          }
        }
      }
    }

    // Fetch climate datasets if referenced
    let climateDatasets = [];
    if (project.climate_dataset_ids && project.climate_dataset_ids.length > 0) {
      for (const dataId of project.climate_dataset_ids) {
        try {
          const dataset = await base44.entities.ClimateDataset.get(dataId);
          climateDatasets.push(dataset);
        } catch (e) {
          // Skip if not found
        }
      }
    }

    // Fetch MAXENT results if available
    let maxentRuns = [];
    if (project.maxent_run_ids && project.maxent_run_ids.length > 0) {
      for (const runId of project.maxent_run_ids.slice(0, 5)) {
        try {
          const run = await base44.entities.MaxentRun.get(runId);
          maxentRuns.push(run);
        } catch (e) {
          // Skip if not found
        }
      }
    }

    // Create PDF
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.text(`${project.name} Report`, 20, yPosition);
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
      doc.text('Project Overview', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      if (project.description) {
        const descWrapped = doc.splitTextToSize(project.description, 170);
        doc.text(descWrapped, 20, yPosition);
        yPosition += descWrapped.length * 6 + 5;
      }

      if (project.research_area) {
        doc.text(`Research Area: ${project.research_area}`, 20, yPosition);
        yPosition += 6;
      }

      doc.text(`Status: ${project.status}`, 20, yPosition);
      yPosition += 6;

      if (project.start_date) {
        doc.text(`Start Date: ${project.start_date}`, 20, yPosition);
        yPosition += 6;
      }

      yPosition += 5;
    }

    // Species Section
    if (sections.includes('species') && speciesList.length > 0) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text('Species Summary', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      const tableData = speciesList.map(sp => [
        sp.scientific_name || '',
        sp.common_name || '',
        sp.iucn_status || 'DD',
        sp.population_trend || 'unknown',
      ]);

      doc.autoTable({
        head: [['Scientific Name', 'Common Name', 'IUCN Status', 'Trend']],
        body: tableData,
        startY: yPosition,
        margin: 20,
        headStyles: { fillColor: [51, 51, 51] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      yPosition = doc.lastAutoTable.finalY + 10;
      if (project.species_count) {
        doc.setFontSize(9);
        doc.text(`Total species in project: ${project.species_count}`, 20, yPosition);
        yPosition += 8;
      }
    }

    // Climate Data Section
    if (sections.includes('climate') && climateDatasets.length > 0) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text('Climate Datasets', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      climateDatasets.forEach((dataset, idx) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(`${idx + 1}. ${dataset.name || 'Dataset'}`, 20, yPosition);
        yPosition += 6;

        if (dataset.description) {
          const descWrapped = doc.splitTextToSize(dataset.description, 165);
          doc.setFontSize(9);
          doc.text(descWrapped, 25, yPosition);
          yPosition += descWrapped.length * 5 + 3;
          doc.setFontSize(10);
        }
      });

      yPosition += 5;
    }

    // MAXENT Models Section
    if (sections.includes('models') && maxentRuns.length > 0) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text('MAXENT Model Results', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      maxentRuns.forEach((run, idx) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(`${idx + 1}. ${run.name || run.species_name}`, 20, yPosition);
        yPosition += 6;

        doc.setFontSize(9);
        doc.text(`Status: ${run.status}`, 25, yPosition);
        yPosition += 5;

        doc.text(`Occurrences: ${run.occurrence_count || 'N/A'}`, 25, yPosition);
        yPosition += 5;

        if (run.notes) {
          const notesWrapped = doc.splitTextToSize(run.notes, 160);
          doc.text(notesWrapped, 25, yPosition);
          yPosition += notesWrapped.length * 4 + 3;
        }

        doc.setFontSize(10);
        yPosition += 3;
      });
    }

    // Notes Section
    if (sections.includes('notes') && project.notes) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text('Project Notes', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      const notesWrapped = doc.splitTextToSize(project.notes, 170);
      doc.text(notesWrapped, 20, yPosition);
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