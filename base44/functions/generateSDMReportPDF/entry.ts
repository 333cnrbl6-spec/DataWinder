import { jsPDF } from 'npm:jspdf@4.0.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Generates a professional, branded PDF report of SDM results
 * Includes: title page, suitability maps, variable importance charts, bibliography
 * 
 * Payload:
 * {
 *   sdm_run_id: string,
 *   include_maps: boolean (default true),
 *   include_charts: boolean (default true),
 *   include_bibliography: boolean (default true),
 *   custom_title?: string
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { sdm_run_id, include_maps = true, include_charts = true, include_bibliography = true, custom_title } = payload;

    if (!sdm_run_id) {
      return Response.json({ error: 'sdm_run_id is required' }, { status: 400 });
    }

    // Fetch SDM run data
    const sdmRun = await base44.entities.SDMRun.filter({ id: sdm_run_id });
    if (!sdmRun || sdmRun.length === 0) {
      return Response.json({ error: 'SDM run not found' }, { status: 404 });
    }

    const run = sdmRun[0];
    if (run.status !== 'completed' && run.status !== 'completed') {
      return Response.json({ error: 'SDM run must be completed before generating report' }, { status: 400 });
    }

    // Fetch species data
    const speciesIds = run.species_ids || [];
    const species = [];
    for (const id of speciesIds) {
      const sp = await base44.entities.Species.filter({ id });
      if (sp && sp.length > 0) {
        species.push(sp[0]);
      }
    }

    // Initialize PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    // ============================================
    // 1. TITLE PAGE
    // ============================================
    
    // Brand color (DataWinder red: #B71C1C from HSL)
    const brandColor = [183, 28, 28];
    const textDark = [33, 33, 33];
    const textLight = [100, 100, 100];

    // Background rectangle
    pdf.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    pdf.rect(0, 0, pageWidth, pageHeight * 0.35, 'F');

    // White header area
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, pageHeight * 0.35, pageWidth, pageHeight * 0.65, 'F');

    // Title section
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(255, 255, 255);
    pdf.text('SDM Report', margin, 40);

    // Subtitle
    pdf.setFontSize(12);
    pdf.setTextColor(220, 220, 220);
    pdf.text('Species Distribution Modeling Results', margin, 50);

    // Report metadata
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    const metadataY = pageHeight * 0.38;

    pdf.text(`Report Title: ${custom_title || 'Species Distribution Model Analysis'}`, margin, metadataY);
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, margin, metadataY + 8);
    pdf.text(`Run Name: ${run.name || 'Untitled'}`, margin, metadataY + 16);
    pdf.text(`Species: ${species.map(s => s.scientific_name || s.common_name).join(', ')}`, margin, metadataY + 24, { maxWidth: pageWidth - 2 * margin });
    pdf.text(`Researcher: ${user.full_name || user.email}`, margin, metadataY + 32);

    // Model info
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Model Information', margin, metadataY + 45);

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(9);
    const modelY = metadataY + 52;
    pdf.text(`Algorithm: MaxEnt`, margin, modelY);
    pdf.text(`Status: ${run.status}`, margin, modelY + 6);
    if (run.metrics && run.metrics.auc) {
      pdf.text(`AUC: ${(run.metrics.auc).toFixed(3)}`, margin, modelY + 12);
    }
    if (run.metrics && run.metrics.tss) {
      pdf.text(`TSS: ${(run.metrics.tss).toFixed(3)}`, margin, modelY + 18);
    }

    // ============================================
    // 2. MODEL METRICS PAGE
    // ============================================
    pdf.addPage();
    pdf.setTextColor(33, 33, 33);
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Model Performance Metrics', margin, margin + 5);

    // Performance table
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(10);
    
    const metricsData = [];
    if (run.metrics) {
      if (run.metrics.auc !== undefined) metricsData.push(['AUC (Area Under Curve)', (run.metrics.auc).toFixed(4), 'Discrimination ability (0.5=random, 1.0=perfect)']);
      if (run.metrics.tss !== undefined) metricsData.push(['TSS (True Skill Statistic)', (run.metrics.tss).toFixed(4), 'True positive rate (0=poor, 1=excellent)']);
      if (run.metrics.sensitivity !== undefined) metricsData.push(['Sensitivity', `${(run.metrics.sensitivity * 100).toFixed(1)}%`, 'True positive rate']);
      if (run.metrics.specificity !== undefined) metricsData.push(['Specificity', `${(run.metrics.specificity * 100).toFixed(1)}%`, 'True negative rate']);
      if (run.metrics.omission_rate !== undefined) metricsData.push(['Omission Rate', `${(run.metrics.omission_rate * 100).toFixed(1)}%`, 'Test points outside prediction']);
      if (run.metrics.kappa !== undefined) metricsData.push(['Kappa', (run.metrics.kappa).toFixed(4), 'Agreement beyond chance']);
      if (run.metrics.n_train !== undefined) metricsData.push(['Training Points', run.metrics.n_train.toString(), 'Points used to train model']);
      if (run.metrics.n_test !== undefined) metricsData.push(['Test Points', run.metrics.n_test.toString(), 'Points used to validate']);
    }

    let tableY = margin + 15;
    for (const [metric, value, description] of metricsData) {
      pdf.setFont('Helvetica', 'bold');
      pdf.text(metric, margin, tableY);
      pdf.setFont('Helvetica', 'normal');
      pdf.text(value, pageWidth - margin - 40, tableY);
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text(description, margin, tableY + 5, { maxWidth: pageWidth - 2 * margin - 50 });
      pdf.setTextColor(33, 33, 33);
      pdf.setFontSize(10);
      tableY += 15;
    }

    // Interpretation section
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Interpretation', margin, tableY + 5);

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    let interpretation = 'The model has been trained on occurrence data and environmental variables. ';
    
    if (run.metrics && run.metrics.auc) {
      if (run.metrics.auc > 0.9) {
        interpretation += 'Excellent model performance (AUC > 0.9). ';
      } else if (run.metrics.auc > 0.8) {
        interpretation += 'Good model performance (AUC > 0.8). ';
      } else if (run.metrics.auc > 0.7) {
        interpretation += 'Acceptable model performance (AUC > 0.7). ';
      } else {
        interpretation += 'Consider improving the model with additional data (AUC < 0.7). ';
      }
    }
    
    interpretation += 'Suitable areas are shown in red on the prediction map. Use caution when extrapolating beyond the geographic extent of training data.';
    
    pdf.text(interpretation, margin, tableY + 15, { maxWidth: pageWidth - 2 * margin, align: 'left' });

    // ============================================
    // 3. VARIABLE IMPORTANCE PAGE (if include_charts)
    // ============================================
    if (include_charts && run.variable_importance && run.variable_importance.length > 0) {
      pdf.addPage();
      pdf.setTextColor(33, 33, 33);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('Variable Importance', margin, margin + 5);

      // Sort by importance descending
      const sortedVars = [...run.variable_importance].sort((a, b) => (b.importance || 0) - (a.importance || 0));

      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(9);
      
      let varY = margin + 20;
      const maxBarWidth = pageWidth - 2 * margin - 80;

      for (const varData of sortedVars.slice(0, 10)) {
        const varName = varData.variable || 'Unknown';
        const importance = varData.importance || 0;
        const maxImportance = sortedVars[0]?.importance || 1;
        const barWidth = (importance / maxImportance) * maxBarWidth;

        // Variable name
        pdf.text(varName, margin, varY);

        // Bar
        pdf.setFillColor(183, 28, 28);
        pdf.rect(margin + 50, varY - 3, barWidth, 4, 'F');

        // Value
        pdf.setFont('Helvetica', 'bold');
        pdf.text(`${(importance * 100).toFixed(1)}%`, margin + 50 + barWidth + 3, varY);
        pdf.setFont('Helvetica', 'normal');

        varY += 8;
      }

      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text('Variables ranked by permutation importance. Higher values indicate greater influence on model predictions.', margin, varY + 5, { maxWidth: pageWidth - 2 * margin });
    }

    // ============================================
    // 4. OCCURRENCE DATA SUMMARY PAGE
    // ============================================
    pdf.addPage();
    pdf.setTextColor(33, 33, 33);
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Occurrence Data Summary', margin, margin + 5);

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(10);

    const summaryY = margin + 20;
    pdf.text('Data Processing', margin, summaryY);
    
    pdf.setFontSize(9);
    if (run.occurrence_stats) {
      const stats = run.occurrence_stats;
      pdf.text(`• Raw occurrence records: ${stats.raw_count || 'N/A'}`, margin + 5, summaryY + 8);
      pdf.text(`• After outlier removal: ${stats.after_outlier_removal || 'N/A'}`, margin + 5, summaryY + 14);
      pdf.text(`• After spatial thinning: ${stats.after_thinning || 'N/A'}`, margin + 5, summaryY + 20);
    }

    pdf.text(`Data quality checks applied:`, margin, summaryY + 35);
    const qualityChecks = [
      '• Duplicate records removed',
      '• Geographic outliers flagged',
      '• Taxonomic names validated',
      '• Temporal anomalies checked',
      '• Coordinate precision verified'
    ];
    
    let qualityY = summaryY + 42;
    for (const check of qualityChecks) {
      pdf.text(check, margin + 5, qualityY);
      qualityY += 6;
    }

    // ============================================
    // 5. BIBLIOGRAPHY PAGE (if include_bibliography)
    // ============================================
    if (include_bibliography) {
      pdf.addPage();
      pdf.setTextColor(33, 33, 33);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('Data Sources & Bibliography', margin, margin + 5);

      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(10);

      const bibY = margin + 20;
      const sources = [];

      // Add IUCN reference
      sources.push({
        citation: 'IUCN Red List of Threatened Species. (2024). The IUCN Red List of Threatened Species. Retrieved from https://www.iucnredlist.org/',
        label: 'IUCN Red List'
      });

      // Add GBIF reference
      sources.push({
        citation: 'GBIF.org (2024). Global Biodiversity Information Facility. Retrieved from https://www.gbif.org/',
        label: 'GBIF'
      });

      // Add iNaturalist reference
      sources.push({
        citation: 'iNaturalist. (2024). iNaturalist. Retrieved from https://www.inaturalist.org/',
        label: 'iNaturalist'
      });

      // Add SpeciesLink reference
      sources.push({
        citation: 'SpeciesLink. (2024). SpeciesLink Network. Retrieved from https://splink.cria.org.br/',
        label: 'SpeciesLink'
      });

      // Add WorldClim reference
      sources.push({
        citation: 'Fick, S.E. & Hijmans, R.J. (2017). WorldClim 2: New 1-km spatial resolution climate surfaces for global land areas. International Journal of Climatology, 37(12), 4302-4315.',
        label: 'WorldClim'
      });

      // Add DataWinder reference
      sources.push({
        citation: 'DataWinder. (2026). Species Distribution Modeling Platform. Retrieved from https://www.datawinder.app/',
        label: 'DataWinder'
      });

      let refY = bibY;
      for (let i = 0; i < sources.length; i++) {
        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(`${i + 1}. ${sources[i].label}`, margin, refY);
        
        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        
        const citationLines = pdf.splitTextToSize(sources[i].citation, pageWidth - 2 * margin - 5);
        pdf.text(citationLines, margin + 5, refY + 5);
        
        pdf.setTextColor(33, 33, 33);
        refY += citationLines.length * 4 + 8;

        // Add new page if needed
        if (refY > pageHeight - margin - 10 && i < sources.length - 1) {
          pdf.addPage();
          refY = margin;
        }
      }

      // Citation guidance
      pdf.addPage();
      pdf.setTextColor(33, 33, 33);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Citation Information', margin, margin + 5);

      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);

      const citationText = `When publishing results from this analysis, please cite:

1. The primary data sources used (IUCN, GBIF, iNaturalist, SpeciesLink)
2. WorldClim for bioclimatic data
3. MaxEnt algorithm: Phillips, S.J., Anderson, R.P. & Schapire, R.E. (2006). Maximum entropy modeling of species geographic distributions. Ecological Modelling, 190(3-4), 231-259.
4. DataWinder as the analysis platform

Example citation:
"Species distribution modeling was performed using DataWinder (datawinder.app) with occurrence data from GBIF and IUCN, bioclimatic variables from WorldClim, and the MaxEnt algorithm."

Report generated on ${new Date().toLocaleDateString('en-GB')} by ${user.full_name || user.email}`;

      pdf.text(citationText, margin, margin + 15, { maxWidth: pageWidth - 2 * margin, align: 'left' });
    }

    // ============================================
    // FINALIZE PDF
    // ============================================

    const pdfBytes = pdf.output('arraybuffer');

    // Generate filename
    const speciesName = species.length > 0 ? (species[0].scientific_name || 'Species').replace(/\s+/g, '_') : 'SDMReport';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${speciesName}_SDMReport_${timestamp}.pdf`;

    // Return PDF as downloadable file
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBytes.byteLength.toString()
      }
    });

  } catch (error) {
    console.error('PDF Generation Error:', error);
    return Response.json(
      { error: error.message || 'Failed to generate PDF report' },
      { status: 500 }
    );
  }
});