import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sdm_run_id } = await req.json();

    if (!sdm_run_id) {
      return Response.json({ error: 'SDM run ID required' }, { status: 400 });
    }

    // Fetch SDM run data
    const sdmRun = await base44.entities.SDMRun.filter({ id: sdm_run_id }).then(r => r[0]);

    if (!sdmRun) {
      return Response.json({ error: 'SDM run not found' }, { status: 404 });
    }

    // Create PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Set fonts
    const setHeading = (size, weight = 'bold') => {
      doc.setFont('Helvetica', weight);
      doc.setFontSize(size);
    };

    const setBody = (size = 11, weight = 'normal') => {
      doc.setFont('Helvetica', weight);
      doc.setFontSize(size);
    };

    // Helper to add page break
    const addPageBreak = () => {
      doc.addPage();
      yPosition = margin;
    };

    // Helper to wrap text
    const wrapText = (text, maxWidth) => {
      return doc.splitTextToSize(text, maxWidth);
    };

    // ─── TITLE PAGE ───
    setHeading(24);
    doc.text('Species Distribution Model', margin, yPosition);
    doc.text('Research Report', margin, yPosition + 10);
    yPosition += 25;

    setBody(12);
    doc.setTextColor(100, 100, 100);
    const speciesText = sdmRun.species_names?.join(', ') || 'Unknown Species';
    const wrappedSpecies = wrapText(`Species: ${speciesText}`, contentWidth);
    doc.text(wrappedSpecies, margin, yPosition);
    yPosition += wrappedSpecies.length * 5 + 5;

    doc.text(`Model Name: ${sdmRun.name}`, margin, yPosition);
    yPosition += 10;

    doc.text(`Generated: ${format(new Date(), 'PPPP')}`, margin, yPosition);
    yPosition += 10;

    doc.text(`Status: ${sdmRun.status}`, margin, yPosition);
    yPosition += 20;

    // Add line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    setBody(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Automated Species Distribution Modeling Report', margin, yPosition);

    addPageBreak();

    // ─── TABLE OF CONTENTS ───
    setHeading(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Table of Contents', margin, yPosition);
    yPosition += 12;

    setBody(11);
    doc.setTextColor(50, 50, 50);
    const toc = [
      '1. Executive Summary',
      '2. Methodology',
      '3. Model Performance Metrics',
      '4. Variable Importance Analysis',
      '5. Spatial Predictions',
      '6. Recommendations'
    ];

    toc.forEach(item => {
      doc.text(item, margin + 5, yPosition);
      yPosition += 6;
    });

    addPageBreak();

    // ─── EXECUTIVE SUMMARY ───
    setHeading(16);
    doc.setTextColor(0, 0, 0);
    doc.text('1. Executive Summary', margin, yPosition);
    yPosition += 10;

    setBody(10);
    doc.setTextColor(50, 50, 50);
    const summary = `This report presents the results of a species distribution model (SDM) developed using MaxEnt modeling framework. The model was trained on ${sdmRun.occurrence_stats?.after_thinning || 'N/A'} occurrence records and evaluated using bioclimatic variables. The model demonstrates ${sdmRun.metrics?.auc ? 'strong' : 'moderate'} predictive performance with an AUC value of ${sdmRun.metrics?.auc?.toFixed(3) || 'N/A'}.`;

    const wrappedSummary = wrapText(summary, contentWidth);
    doc.text(wrappedSummary, margin, yPosition);
    yPosition += wrappedSummary.length * 4 + 5;

    // ─── METHODOLOGY ───
    yPosition += 10;
    setHeading(16);
    doc.setTextColor(0, 0, 0);
    doc.text('2. Methodology', margin, yPosition);
    yPosition += 10;

    setBody(10);
    doc.setTextColor(50, 50, 50);

    const methodologyPoints = [
      `Modeling Framework: MaxEnt (Maximum Entropy)`,
      `Occurrence Records: ${sdmRun.occurrence_stats?.raw_count || 'N/A'} raw, ${sdmRun.occurrence_stats?.after_thinning || 'N/A'} after spatial thinning`,
      `Bioclimatic Variables: ${(sdmRun.parameters?.bioclim_vars || []).length} variables selected`,
      `Regularization: ${sdmRun.parameters?.regularization || 'Default'}`,
      `Test Fraction: ${((sdmRun.parameters?.test_fraction || 0.2) * 100).toFixed(0)}%`,
      `Training Records: ${sdmRun.metrics?.n_train || 'N/A'}`,
      `Test Records: ${sdmRun.metrics?.n_test || 'N/A'}`
    ];

    methodologyPoints.forEach(point => {
      doc.text('• ' + point, margin + 5, yPosition);
      yPosition += 6;
      if (yPosition > pageHeight - margin - 10) {
        addPageBreak();
      }
    });

    // ─── PERFORMANCE METRICS ───
    yPosition += 10;
    if (yPosition > pageHeight - 60) addPageBreak();

    setHeading(16);
    doc.setTextColor(0, 0, 0);
    doc.text('3. Model Performance Metrics', margin, yPosition);
    yPosition += 10;

    setBody(10);
    doc.setTextColor(50, 50, 50);

    if (sdmRun.metrics) {
      // Create metrics table
      const metrics = [
        ['Metric', 'Value', 'Interpretation'],
        ['AUC (Area Under Curve)', sdmRun.metrics.auc?.toFixed(3) || 'N/A', 'Discrimination ability (0.5-1.0)'],
        ['TSS (True Skill Statistic)', sdmRun.metrics.tss?.toFixed(3) || 'N/A', 'Overall accuracy (-1 to 1)'],
        ['Sensitivity', (sdmRun.metrics.sensitivity?.toFixed(3) || 'N/A'), 'True positive rate'],
        ['Specificity', (sdmRun.metrics.specificity?.toFixed(3) || 'N/A'), 'True negative rate'],
        ['Omission Rate', (sdmRun.metrics.omission_rate?.toFixed(3) || 'N/A'), 'Prediction error rate'],
        ['Kappa', sdmRun.metrics.kappa?.toFixed(3) || 'N/A', 'Agreement measure']
      ];

      const startY = yPosition;
      let tableY = startY;
      const colWidths = [50, 25, contentWidth - 75];

      // Header
      doc.setFillColor(41, 128, 185);
      doc.setTextColor(255, 255, 255);
      setBody(9, 'bold');
      doc.rect(margin, tableY, contentWidth, 6, 'F');
      doc.text(metrics[0][0], margin + 2, tableY + 4);
      doc.text(metrics[0][1], margin + colWidths[0] + 2, tableY + 4);
      doc.text(metrics[0][2], margin + colWidths[0] + colWidths[1] + 2, tableY + 4);
      tableY += 6;

      // Rows
      doc.setTextColor(0, 0, 0);
      setBody(9);
      metrics.slice(1).forEach((row, idx) => {
        const isEven = idx % 2 === 0;
        if (isEven) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, tableY, contentWidth, 5, 'F');
        }
        doc.text(row[0], margin + 2, tableY + 3.5);
        doc.text(row[1], margin + colWidths[0] + 2, tableY + 3.5);
        doc.text(row[2], margin + colWidths[0] + colWidths[1] + 2, tableY + 3.5);
        tableY += 5;
      });

      yPosition = tableY + 10;
    }

    // ─── VARIABLE IMPORTANCE ───
    if (yPosition > pageHeight - 60) addPageBreak();

    setHeading(16);
    doc.setTextColor(0, 0, 0);
    doc.text('4. Variable Importance Analysis', margin, yPosition);
    yPosition += 10;

    setBody(10);
    doc.setTextColor(50, 50, 50);
    const importance = `The following bioclimatic variables contributed most significantly to the model predictions. Variable importance was calculated using permutation importance, which measures the decrease in model performance when each variable is randomly shuffled.`;
    const wrappedImportance = wrapText(importance, contentWidth);
    doc.text(wrappedImportance, margin, yPosition);
    yPosition += wrappedImportance.length * 4 + 8;

    if (sdmRun.variable_importance && sdmRun.variable_importance.length > 0) {
      setBody(9);
      doc.setTextColor(0, 0, 0);

      const sortedVars = [...sdmRun.variable_importance]
        .sort((a, b) => (b.importance || 0) - (a.importance || 0))
        .slice(0, 8);

      let barY = yPosition;
      const barHeight = 4;
      const barSpacing = 6;
      const maxBarWidth = contentWidth * 0.6;

      sortedVars.forEach((varData, idx) => {
        const importance = varData.importance || 0;
        const maxImportance = Math.max(...sortedVars.map(v => v.importance || 0));
        const barWidth = (importance / maxImportance) * maxBarWidth;

        // Label
        const label = varData.variable || `Variable ${idx + 1}`;
        doc.text(label, margin + 2, barY + 2);

        // Bar
        doc.setFillColor(41, 128, 185);
        doc.rect(margin + 70, barY - 1, barWidth, barHeight, 'F');

        // Value
        doc.setTextColor(100, 100, 100);
        doc.text(`${importance.toFixed(2)}%`, margin + 70 + barWidth + 3, barY + 2);

        barY += barSpacing;
        if (barY > pageHeight - margin - 20) {
          addPageBreak();
          barY = yPosition;
        }
      });

      yPosition = barY + 10;
    }

    // ─── SPATIAL PREDICTIONS ───
    if (yPosition > pageHeight - 60) addPageBreak();

    setHeading(16);
    doc.setTextColor(0, 0, 0);
    doc.text('5. Spatial Predictions', margin, yPosition);
    yPosition += 10;

    setBody(10);
    doc.setTextColor(50, 50, 50);
    const predictions = `The model generates continuous suitability predictions across the study area, ranging from 0 (unsuitable) to 1 (highly suitable). These predictions represent the relative probability of species presence based on the environmental conditions.`;
    const wrappedPredictions = wrapText(predictions, contentWidth);
    doc.text(wrappedPredictions, margin, yPosition);
    yPosition += wrappedPredictions.length * 4 + 8;

    if (sdmRun.prediction_grid && sdmRun.prediction_grid.length > 0) {
      const predictionStats = calculatePredictionStats(sdmRun.prediction_grid);
      setBody(9);
      doc.setTextColor(50, 50, 50);

      doc.text(`Minimum Suitability: ${predictionStats.min.toFixed(3)}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Maximum Suitability: ${predictionStats.max.toFixed(3)}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Mean Suitability: ${predictionStats.mean.toFixed(3)}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Grid Cells: ${sdmRun.prediction_grid.length.toLocaleString()}`, margin, yPosition);
    }

    // ─── RECOMMENDATIONS ───
    if (yPosition > pageHeight - 60) addPageBreak();

    setHeading(16);
    doc.setTextColor(0, 0, 0);
    doc.text('6. Recommendations', margin, yPosition);
    yPosition += 10;

    setBody(10);
    doc.setTextColor(50, 50, 50);

    const recommendations = [
      'Field surveys should prioritize areas with high suitability predictions to validate model accuracy',
      'Consider incorporating additional environmental variables or temporal data for improved predictions',
      'Use the model predictions for conservation planning and habitat management strategies',
      'Regularly update the model as new occurrence data becomes available',
      'Validate predictions using independent occurrence data not used in model training'
    ];

    recommendations.forEach(rec => {
      if (yPosition > pageHeight - margin - 10) addPageBreak();
      const wrapped = wrapText(rec, contentWidth - 5);
      doc.text('• ' + wrapped[0], margin + 3, yPosition);
      for (let i = 1; i < wrapped.length; i++) {
        yPosition += 5;
        if (yPosition > pageHeight - margin - 5) {
          addPageBreak();
        }
        doc.text(wrapped[i], margin + 3, yPosition);
      }
      yPosition += 8;
    });

    // ─── FOOTER ───
    addPageBreak();
    setBody(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by DataWinder Automated Reporting Engine', margin, pageHeight - 15);
    doc.text(`Report Date: ${format(new Date(), 'PPP')}`, margin, pageHeight - 10);

    // Generate PDF and upload
    const pdfBytes = doc.output('arraybuffer');
    const fileName = `sdm_report_${sdmRun.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

    // Upload to file storage
    const fileBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);

    // Create the response with the PDF as a downloadable file
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
});

function calculatePredictionStats(predictions) {
  const suitabilities = predictions.map(p => p.suitability || 0);
  const min = Math.min(...suitabilities);
  const max = Math.max(...suitabilities);
  const mean = suitabilities.reduce((a, b) => a + b, 0) / suitabilities.length;

  return { min, max, mean };
}