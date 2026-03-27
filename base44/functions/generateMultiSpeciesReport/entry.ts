import { jsPDF } from 'npm:jspdf@4.0.0';
import autoTable from 'npm:jspdf-autotable@3.8.3';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { species_ids, report_name } = await req.json();

    if (!species_ids || !Array.isArray(species_ids) || species_ids.length === 0) {
      return Response.json({ error: 'No species provided' }, { status: 400 });
    }

    // Fetch species data
    const speciesData = await Promise.all(
      species_ids.map(id => base44.asServiceRole.entities.Species.get(id))
    );

    // Calculate aggregated metrics
    const metrics = calculateMetrics(speciesData);

    // Generate PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPos = 15;

    // Header
    pdf.setFillColor(198, 35, 53); // Bangor red
    pdf.rect(0, 0, pageWidth, 35, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont(undefined, 'bold');
    pdf.text(report_name || 'Multi-Species Report', 15, 20);
    
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 28);

    yPos = 45;
    pdf.setTextColor(0, 0, 0);

    // Executive Summary
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Executive Summary', 15, yPos);
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    const summaryLines = pdf.splitTextToSize(
      `This report summarizes key conservation metrics for ${speciesData.length} species. ` +
      `Total observations: ${metrics.totalObservations.toLocaleString()}. ` +
      `Conservation status: ${metrics.statusBreakdown.CR} Critically Endangered, ` +
      `${metrics.statusBreakdown.EN} Endangered, ${metrics.statusBreakdown.VU} Vulnerable. ` +
      `Population trend: ${metrics.populationTrend.decreasing}% decreasing, ` +
      `${metrics.populationTrend.stable}% stable, ${metrics.populationTrend.increasing}% increasing.`,
      pageWidth - 30
    );
    pdf.text(summaryLines, 15, yPos);
    yPos += summaryLines.length * 5 + 5;

    // Key Metrics Table
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('Key Metrics', 15, yPos);
    yPos += 8;

    const metricsTable = [
      ['Metric', 'Value'],
      ['Total Species', speciesData.length.toString()],
      ['Total Observations', metrics.totalObservations.toLocaleString()],
      ['Avg. Observations per Species', Math.round(metrics.totalObservations / speciesData.length).toString()],
      ['Species with Decreasing Population', metrics.populationTrend.decreasingCount.toString()],
      ['Species with Data Gaps', metrics.dataGaps.toString()],
    ];

    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    autoTable(pdf, {
      startY: yPos,
      head: [metricsTable[0]],
      body: metricsTable.slice(1),
      margin: { left: 15, right: 15 },
      theme: 'grid',
      headerStyles: { fillColor: [198, 35, 53], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    yPos = pdf.lastAutoTable.finalY + 10;

    // Conservation Status Breakdown
    if (yPos > pageHeight - 60) {
      pdf.addPage();
      yPos = 15;
    }

    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('Conservation Status Breakdown', 15, yPos);
    yPos += 8;

    const statusData = [
      ['Status', 'Count', 'Percentage'],
      ['Critically Endangered (CR)', metrics.statusBreakdown.CR.toString(), 
        `${Math.round((metrics.statusBreakdown.CR / speciesData.length) * 100)}%`],
      ['Endangered (EN)', metrics.statusBreakdown.EN.toString(),
        `${Math.round((metrics.statusBreakdown.EN / speciesData.length) * 100)}%`],
      ['Vulnerable (VU)', metrics.statusBreakdown.VU.toString(),
        `${Math.round((metrics.statusBreakdown.VU / speciesData.length) * 100)}%`],
      ['Near Threatened (NT)', metrics.statusBreakdown.NT.toString(),
        `${Math.round((metrics.statusBreakdown.NT / speciesData.length) * 100)}%`],
      ['Least Concern (LC)', metrics.statusBreakdown.LC.toString(),
        `${Math.round((metrics.statusBreakdown.LC / speciesData.length) * 100)}%`],
      ['Data Deficient (DD)', metrics.statusBreakdown.DD.toString(),
        `${Math.round((metrics.statusBreakdown.DD / speciesData.length) * 100)}%`],
    ];

    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    autoTable(pdf, {
      startY: yPos,
      head: [statusData[0]],
      body: statusData.slice(1),
      margin: { left: 15, right: 15 },
      theme: 'grid',
      headerStyles: { fillColor: [198, 35, 53], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    yPos = pdf.lastAutoTable.finalY + 10;

    // Species List
    if (yPos > pageHeight - 60) {
      pdf.addPage();
      yPos = 15;
    }

    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('Species Included in Assessment', 15, yPos);
    yPos += 8;

    const speciesList = speciesData.map(s => [
      s.scientific_name,
      s.common_name || '—',
      s.iucn_status || 'Unknown',
      (s.observation_count || 0) + (s.gbif_occurrence_count || 0),
    ]);

    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    autoTable(pdf, {
      startY: yPos,
      head: [['Scientific Name', 'Common Name', 'IUCN Status', 'Observations']],
      body: speciesList,
      margin: { left: 15, right: 15 },
      theme: 'grid',
      headerStyles: { fillColor: [198, 35, 53], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' } },
    });

    yPos = pdf.lastAutoTable.finalY + 10;

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Generated by DataWinder • ${new Date().toLocaleString()}`,
      15,
      pageHeight - 10
    );

    // Save to file storage
    const pdfBytes = pdf.output('arraybuffer');
    const fileName = `report_${Date.now()}.pdf`;
    
    const uploadRes = await base44.integrations.Core.UploadFile({
      file: new Blob([pdfBytes], { type: 'application/pdf' })
    });

    return Response.json({ pdf_url: uploadRes.file_url });
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateMetrics(speciesData) {
  const metrics = {
    totalObservations: 0,
    statusBreakdown: { CR: 0, EN: 0, VU: 0, NT: 0, LC: 0, DD: 0, NE: 0, EX: 0, EW: 0 },
    populationTrend: { increasing: 0, stable: 0, decreasing: 0, unknown: 0, decreasingCount: 0 },
    dataGaps: 0,
  };

  speciesData.forEach(species => {
    // Observations
    metrics.totalObservations += (species.observation_count || 0) + (species.gbif_occurrence_count || 0);

    // Status
    const status = species.iucn_status || 'DD';
    if (metrics.statusBreakdown.hasOwnProperty(status)) {
      metrics.statusBreakdown[status]++;
    }

    // Population trend
    const trend = species.population_trend || 'unknown';
    if (trend === 'decreasing') {
      metrics.populationTrend.decreasing++;
      metrics.populationTrend.decreasingCount++;
    } else if (trend === 'stable') {
      metrics.populationTrend.stable++;
    } else if (trend === 'increasing') {
      metrics.populationTrend.increasing++;
    } else {
      metrics.populationTrend.unknown++;
    }

    // Data gaps
    if (!species.observation_count || species.observation_count === 0) {
      metrics.dataGaps++;
    }
  });

  // Convert to percentages
  const total = speciesData.length;
  metrics.populationTrend.decreasing = Math.round((metrics.populationTrend.decreasing / total) * 100);
  metrics.populationTrend.stable = Math.round((metrics.populationTrend.stable / total) * 100);
  metrics.populationTrend.increasing = Math.round((metrics.populationTrend.increasing / total) * 100);

  return metrics;
}