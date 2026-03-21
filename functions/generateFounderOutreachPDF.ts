import { jsPDF } from 'npm:jspdf@4.0.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    const setFont = (type = 'normal', size = 12) => {
      if (type === 'title') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
      } else if (type === 'heading') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
      } else if (type === 'subheading') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(size);
      }
    };

    const addText = (text, type = 'normal', spaceAfter = 5) => {
      setFont(type);
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, yPosition);
      yPosition += (lines.length * 7) + spaceAfter;
      
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }
    };

    const addDivider = () => {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
    };

    // Header
    addText('SUBJECT: Free DataWinder Founder Access for Bangor Zoology Researchers', 'title', 15);
    addDivider();
    
    addText('Dear Bangor Zoology Researcher,', 'normal', 10);

    // Important Notice
    doc.setFillColor(230, 245, 255);
    doc.rect(margin - 2, yPosition - 2, contentWidth + 4, 30, 'F');
    doc.setTextColor(25, 73, 120);
    setFont('subheading');
    doc.text('IMPORTANT NOTICE:', margin + 3, yPosition);
    yPosition += 7;
    setFont('normal', 10);
    const importantText = doc.splitTextToSize(
      'This is not an official Bangor University project. DataWinder is an independent initiative created by someone currently studying Zoology at Bangor who received study support and achieved an upper second (2:1) degree despite neurodiversity. This platform exists because collaborative feedback from peers like you is essential for meaningful development.',
      contentWidth - 6
    );
    doc.text(importantText, margin + 3, yPosition);
    yPosition += (importantText.length * 5) + 8;
    doc.setTextColor(0, 0, 0);

    addDivider();

    addText('We are building DataWinder—a pioneering web-based platform for species distribution modelling and conservation assessment that integrates IUCN, iNaturalist, GBIF, and speciesLink occurrence data with climate projections and MAXENT modeling.', 'normal', 10);
    addText('We want your feedback to shape its future, and we\'re offering Bangor University researchers something special.', 'normal', 15);

    // What is DataWinder
    addText('WHAT IS DATAWINDER?', 'heading', 10);
    addText('DataWinder is a comprehensive, integrated platform built on peer-reviewed research frameworks that enables researchers to:', 'normal', 8);

    const features = [
      'Discover species from multiple sources: IUCN Red List, iNaturalist observations, GBIF occurrence records, and speciesLink specimens',
      'Clean and validate occurrence data with outlier detection and quality checks',
      'Select from multiple climate datasets: WorldClim, CHELSA, ERA5, MODIS, CMIP6 projections',
      'Run species distribution models using MAXENT automation',
      'Calculate threat scores integrating habitat loss, population trends, protected area coverage, climate suitability change, and disease risk',
      'Compare climate scenarios and project future habitat shifts under different warming pathways',
      'Generate conservation recommendations based on data-driven threat assessment'
    ];

    features.forEach(feature => {
      setFont('normal', 10);
      const lines = doc.splitTextToSize('• ' + feature, contentWidth - 5);
      doc.text(lines, margin + 5, yPosition);
      yPosition += (lines.length * 5) + 2;
    });

    yPosition += 5;

    // Six-Phase Pipeline
    addText('THE SIX-PHASE RESEARCH PIPELINE:', 'subheading', 8);
    
    const phases = [
      { num: '1', title: 'Species Search & Selection', desc: 'Discover species using IUCN, iNaturalist, and GBIF databases' },
      { num: '2', title: 'Data Tidying & Quality Control', desc: 'Clean, validate, and prepare occurrence data for modeling' },
      { num: '3', title: 'Climate Data Integration', desc: 'Select climate datasets and variables for your analysis' },
      { num: '4', title: 'MAXENT Modeling', desc: 'Run species distribution models with performance validation' },
      { num: '5', title: 'Threat Assessment', desc: 'Evaluate conservation risks and priority rankings' },
      { num: '6', title: 'Scenario & Ensemble Analysis', desc: 'Compare climate scenarios and project future habitat shifts' }
    ];

    phases.forEach(phase => {
      setFont('normal', 10);
      doc.text(`${phase.num}. ${phase.title}`, margin + 3, yPosition);
      yPosition += 5;
      setFont('normal', 9);
      const descLines = doc.splitTextToSize(`→ ${phase.desc}`, contentWidth - 8);
      doc.text(descLines, margin + 8, yPosition);
      yPosition += (descLines.length * 4) + 3;
    });

    yPosition += 5;
    addDivider();

    // Founder Offer
    addText('YOUR FOUNDER OFFER', 'heading', 8);
    addText('Sign up using your @bangor.ac.uk email address and receive:', 'normal', 8);

    const benefits = [
      'Full platform access — all features, unlimited species, unlimited analyses',
      '1-year complimentary membership (no charge)',
      'Recognized as a Founder Member and early tester',
      'Direct input into our development roadmap',
      'Early-adopter advantage before wider release'
    ];

    benefits.forEach(benefit => {
      setFont('normal', 10);
      const lines = doc.splitTextToSize('✓ ' + benefit, contentWidth - 5);
      doc.text(lines, margin + 5, yPosition);
      yPosition += (lines.length * 5) + 2;
    });

    yPosition += 5;
    addDivider();

    // Why Your Collaboration Matters
    addText('WHY YOUR COLLABORATION MATTERS', 'heading', 10);
    addText('This project only works because of peer input and honest feedback from researchers like you.', 'normal', 10);
    
    addText('The creator of DataWinder experienced neurodiversity while studying Zoology at Bangor. With institutional support, they achieved a strong academic result and learned that different perspectives aren\'t limitations—they\'re assets. That insight is central to this work: accessibility and clarity benefit all researchers.', 'normal', 10);

    addText('Collaboration is not optional for this project. It\'s essential. We need:', 'normal', 8);

    const needs = [
      'Your honest observations about what works and what doesn\'t',
      'Real feedback from people doing the work, not just theory',
      'Input from researchers with different backgrounds, learning styles, and working approaches',
      'Peer review and suggestions that push the tool forward'
    ];

    needs.forEach(need => {
      setFont('normal', 10);
      const lines = doc.splitTextToSize('• ' + need, contentWidth - 5);
      doc.text(lines, margin + 5, yPosition);
      yPosition += (lines.length * 5) + 2;
    });

    yPosition += 5;

    addText('In exchange for free access, we value your genuine feedback:', 'normal', 8);

    const feedback = [
      'Does the platform solve your research problems?',
      'What features are missing or could work better?',
      'Where do you encounter friction or barriers?',
      'What would make this indispensable to your work?',
      'How can we make this more intuitive for you?'
    ];

    feedback.forEach(item => {
      setFont('normal', 10);
      const lines = doc.splitTextToSize('• ' + item, contentWidth - 5);
      doc.text(lines, margin + 5, yPosition);
      yPosition += (lines.length * 5) + 2;
    });

    yPosition += 5;

    addText('We\'re not looking for praise. We\'re looking for real, candid observations about whether DataWinder actually works for conservation researchers. Even 15 minutes of testing and one observation can help us iterate toward something truly valuable.', 'normal', 15);

    addDivider();

    // Getting Started
    addText('GETTING STARTED', 'heading', 8);
    const steps = [
      '1. Visit: [LANDING_PAGE_URL]',
      '2. Click "Claim Your Founder Access"',
      '3. Enter your @bangor.ac.uk email',
      '4. Sign up and verify your account',
      '5. Your 1-year founder membership activates immediately'
    ];

    steps.forEach(step => {
      setFont('normal', 10);
      doc.text(step, margin + 5, yPosition);
      yPosition += 6;
    });

    yPosition += 5;

    addText('Once you\'re in, explore:', 'normal', 6);
    const sections = [
      '→ Home: Species Search & Selection',
      '→ Data Preparation: Clean and validate occurrence records',
      '→ Climate Data: Configure climate variables and datasets',
      '→ MAXENT Modeler: Run species distribution models',
      '→ Threat Assessment: Calculate conservation risks',
      '→ Scenario Comparison: Project future habitat under climate change'
    ];

    sections.forEach(section => {
      setFont('normal', 9);
      doc.text(section, margin + 8, yPosition);
      yPosition += 5;
    });

    yPosition += 5;
    addDivider();

    // Scientific Foundation
    addText('SCIENTIFIC FOUNDATION', 'heading', 8);
    addText('DataWinder is built on peer-reviewed conservation research:', 'normal', 8);

    const references = [
      'Duran et al. (2013) - Climate-driven species distribution modelling methodology',
      'Chapman et al. (2020) - Ensemble approaches for biodiversity assessment',
      'Hill & Winder (2019) - Conservation threat profiling and prioritization'
    ];

    references.forEach(ref => {
      setFont('normal', 9);
      const lines = doc.splitTextToSize('• ' + ref, contentWidth - 5);
      doc.text(lines, margin + 5, yPosition);
      yPosition += (lines.length * 4) + 2;
    });

    yPosition += 8;
    addDivider();

    // Closing
    addText('This is a unique opportunity. DataWinder will only become what it needs to be through collaboration with researchers like you. Help us build something that actually works for practicing zoologists.', 'normal', 10);

    addText('We believe this platform can transform how we approach biodiversity assessment. But that transformation only happens through genuine peer input and diverse perspectives.', 'normal', 15);

    setFont('normal', 10);
    doc.text('With warm regards,', margin, yPosition);
    yPosition += 10;

    setFont('normal', 11);
    doc.text('DataWinder', margin, yPosition);
    yPosition += 5;
    setFont('normal', 9);
    doc.text('An independent initiative by a Bangor Zoology researcher', margin, yPosition);

    yPosition += 15;
    addDivider();

    // Important Reminders
    addText('IMPORTANT REMINDERS', 'subheading', 8);
    const reminders = [
      'This is NOT an official Bangor University project',
      'This is an independent initiative created by a Bangor Zoology student',
      'Institutional support enabled the creator to succeed despite neurodiversity—that shaped this vision',
      'This tool only succeeds through collaboration and peer feedback',
      'Your voice directly shapes what gets built'
    ];

    reminders.forEach(reminder => {
      setFont('normal', 9);
      const lines = doc.splitTextToSize('• ' + reminder, contentWidth - 5);
      doc.text(lines, margin + 3, yPosition);
      yPosition += (lines.length * 4) + 2;
    });

    // Convert to bytes
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="DataWinder_Founder_Outreach_Letter.pdf"'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});