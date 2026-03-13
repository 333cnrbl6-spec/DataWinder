import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

// ── Colour helpers ────────────────────────────────────────────────────────────
const AUC_THRESHOLDS  = { excellent: 0.9, good: 0.8, fair: 0.7 };
const TSS_THRESHOLDS  = { excellent: 0.6, good: 0.4, fair: 0.2 };

function aucLabel(v)  { return v >= AUC_THRESHOLDS.excellent ? 'Excellent' : v >= AUC_THRESHOLDS.good ? 'Good' : v >= AUC_THRESHOLDS.fair ? 'Fair' : 'Poor'; }
function tssLabel(v)  { return v >= TSS_THRESHOLDS.excellent ? 'Excellent' : v >= TSS_THRESHOLDS.good ? 'Good' : v >= TSS_THRESHOLDS.fair ? 'Fair' : 'Poor'; }

// ── Drawing helpers ───────────────────────────────────────────────────────────
function drawBangorHeader(doc, pageW) {
  // Red top bar
  doc.setFillColor(240, 0, 0);
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DataWinder  —  Bangor University Species Distribution Modelling', 14, 9.5);
  doc.setTextColor(30, 30, 30);
}

function drawSectionTitle(doc, text, y) {
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(12, y, 186, 8, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 0, 0);
  doc.text(text.toUpperCase(), 16, y + 5.5);
  doc.setTextColor(30, 30, 30);
  return y + 12;
}

function drawKeyValue(doc, label, value, x, y, labelW = 48) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(String(value ?? '—'), x + labelW, y);
}

function drawMetricBox(doc, label, value, qualityLabel, x, y, w = 42) {
  const numVal = value != null ? Number(value) : null;
  // colour background by quality
  const qual = qualityLabel?.toLowerCase();
  const colours = {
    excellent: [220, 252, 231],
    good:      [219, 234, 254],
    fair:      [254, 249, 195],
    poor:      [254, 226, 226],
  };
  const bg = colours[qual] || [245, 247, 250];
  doc.setFillColor(...bg);
  doc.roundedRect(x, y, w, 20, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text(label, x + w / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(numVal != null ? numVal.toFixed(3) : '—', x + w / 2, y + 13.5, { align: 'center' });
  if (qualityLabel) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(qualityLabel, x + w / 2, y + 18.5, { align: 'center' });
  }
  doc.setTextColor(30, 30, 30);
}

function drawFeatureTable(doc, featureMap, x, y, pageH) {
  const entries = Object.entries(featureMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20); // max 20 rows

  const colW = [100, 40, 40];
  const rowH = 6.5;

  // header
  doc.setFillColor(30, 30, 30);
  doc.rect(x, y, colW[0] + colW[1] + colW[2], rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Variable', x + 3, y + 4.5);
  doc.text('Contribution (%)', x + colW[0] + 3, y + 4.5);
  doc.text('Permutation (%)', x + colW[0] + colW[1] + 3, y + 4.5);
  doc.setTextColor(30, 30, 30);

  let curY = y + rowH;
  entries.forEach(([varName, val], i) => {
    if (curY + rowH > pageH - 20) return; // don't overflow
    doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
    doc.rect(x, curY, colW[0] + colW[1] + colW[2], rowH, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(varName, x + 3, curY + 4.5);
    const pct = (Number(val) * 100).toFixed(1) + '%';
    doc.text(pct, x + colW[0] + 3, curY + 4.5);
    doc.text('—', x + colW[0] + colW[1] + 3, curY + 4.5);

    // bar
    const barMaxW = 35;
    const barW = Math.max(0.5, Number(val) * barMaxW);
    doc.setFillColor(229, 0, 0, 0.6);
    doc.setFillColor(220, 50, 50);
    doc.rect(x + colW[0] + 22, curY + 1.5, barW, 2.5, 'F');

    curY += rowH;
  });

  return curY + 4;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReportGenerator({ runs, species }) {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (runs.length === 0) return;
    setGenerating(true);

    await new Promise(r => setTimeout(r, 50)); // allow UI update

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const margin = 12;
    const contentW = pageW - margin * 2;

    const generatedAt = format(new Date(), 'dd MMMM yyyy, HH:mm');

    runs.forEach((run, runIdx) => {
      if (runIdx > 0) doc.addPage();

      let y = 0;

      // ── Header ──
      drawBangorHeader(doc, pageW);
      y = 22;

      // Report title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('MAXENT Model Report', margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(run.species_name || 'Unknown species', margin, y);
      y += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${generatedAt}   |   Run: ${run.name || run.id}`, margin, y);
      y += 10;

      doc.setDrawColor(220, 0, 0);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      // ── Species summary ──
      y = drawSectionTitle(doc, '1. Species Summary', y);

      const sp = species?.find(s => s.id === run.species_id || s.scientific_name === run.species_name);

      const col1x = margin;
      const col2x = margin + contentW / 2;

      doc.setFontSize(8);
      drawKeyValue(doc, 'Scientific name:', run.species_name || '—', col1x, y);
      drawKeyValue(doc, 'Common name:', sp?.common_name || '—', col2x, y);
      y += 6;
      drawKeyValue(doc, 'IUCN Status:', sp?.iucn_status || '—', col1x, y);
      drawKeyValue(doc, 'Population trend:', sp?.population_trend || '—', col2x, y);
      y += 6;
      drawKeyValue(doc, 'Family:', sp?.family || '—', col1x, y);
      drawKeyValue(doc, 'Order:', sp?.order_name || '—', col2x, y);
      y += 12;

      // ── Run configuration ──
      y = drawSectionTitle(doc, '2. Run Configuration', y);
      doc.setFontSize(8);
      drawKeyValue(doc, 'Run name:', run.name || run.id, col1x, y);
      drawKeyValue(doc, 'Status:', run.status || '—', col2x, y);
      y += 6;
      drawKeyValue(doc, 'Occurrences used:', run.occurrence_count ?? '—', col1x, y);
      drawKeyValue(doc, 'Climate layers:', run.climate_dataset_names?.length ?? '—', col2x, y);
      y += 6;
      drawKeyValue(doc, 'Regularisation mult.:', run.parameters?.regularization_multiplier ?? '—', col1x, y);
      drawKeyValue(doc, 'Max iterations:', run.parameters?.max_iterations ?? '—', col2x, y);
      y += 6;
      drawKeyValue(doc, 'Replicates:', run.parameters?.replicates ?? '—', col1x, y);
      drawKeyValue(doc, 'Output type:', run.parameters?.output_type ?? '—', col2x, y);
      y += 6;
      if (run.parameters?.feature_types?.length > 0) {
        drawKeyValue(doc, 'Feature types:', run.parameters.feature_types.join(', '), col1x, y);
        y += 6;
      }
      if (run.climate_dataset_names?.length > 0) {
        const layerText = run.climate_dataset_names.join(', ');
        const lines = doc.splitTextToSize(layerText, contentW - 50);
        drawKeyValue(doc, 'Layers:', '', col1x, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(lines, col1x + 48, y);
        y += lines.length * 4.5;
      }
      y += 6;

      // ── Performance metrics ──
      y = drawSectionTitle(doc, '3. Performance Metrics', y);

      if (!run.results) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('No results data available for this run yet.', margin, y + 4);
        doc.setTextColor(30, 30, 30);
        y += 14;
      } else {
        const auc = run.results?.auc != null ? Number(run.results.auc) : null;
        const tss = run.results?.tss != null ? Number(run.results.tss) : null;
        const omit = run.results?.omission_rate != null ? Number(run.results.omission_rate) : null;
        const reps = run.results?.replicates_completed ?? run.parameters?.replicates;

        const boxW = 44;
        const gap = 4;
        drawMetricBox(doc, 'AUC (ROC)', auc, auc != null ? aucLabel(auc) : null, margin, y, boxW);
        drawMetricBox(doc, 'TSS', tss, tss != null ? tssLabel(tss) : null, margin + boxW + gap, y, boxW);
        drawMetricBox(doc, 'Omission Rate', omit, null, margin + (boxW + gap) * 2, y, boxW);
        drawMetricBox(doc, 'Replicates', reps, null, margin + (boxW + gap) * 3, y, boxW);
        y += 26;

        if (run.results?.auc_sd != null || run.results?.tss_sd != null) {
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          const sdParts = [];
          if (run.results.auc_sd != null) sdParts.push(`AUC SD: ±${Number(run.results.auc_sd).toFixed(4)}`);
          if (run.results.tss_sd != null) sdParts.push(`TSS SD: ±${Number(run.results.tss_sd).toFixed(4)}`);
          doc.text(sdParts.join('   |   '), margin, y);
          doc.setTextColor(30, 30, 30);
          y += 8;
        }
      }

      // ── Feature importance ──
      y = drawSectionTitle(doc, '4. Feature Importance', y);

      const featureMap = run.results?.feature_importance || run.results?.variable_importance || null;

      if (!featureMap || Object.keys(featureMap).length === 0) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('No feature importance data available. Populate results.feature_importance on this run.', margin, y + 4);
        doc.setTextColor(30, 30, 30);
        y += 14;
      } else {
        y = drawFeatureTable(doc, featureMap, margin, y, pageH);
      }

      // ── Notes ──
      if (run.notes) {
        if (y + 30 > pageH - 20) {
          doc.addPage();
          drawBangorHeader(doc, pageW);
          y = 22;
        }
        y = drawSectionTitle(doc, '5. Notes', y);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const noteLines = doc.splitTextToSize(run.notes, contentW - 4);
        doc.text(noteLines, margin, y);
        y += noteLines.length * 4.5 + 6;
      }

      // ── Footer ──
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `DataWinder — Bangor University SDM Platform  |  ${generatedAt}  |  For research purposes only`,
        pageW / 2, pageH - 8, { align: 'center' }
      );
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    });

    const fileName = runs.length === 1
      ? `MAXENT_Report_${runs[0].species_name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`
      : `MAXENT_Report_${runs.length}runs_${format(new Date(), 'yyyyMMdd')}.pdf`;

    doc.save(fileName);
    setGenerating(false);
  };

  return (
    <Button
      onClick={generate}
      disabled={generating || runs.length === 0}
      className="bg-bangor-red hover:bg-red-700 text-white gap-2"
    >
      {generating ? (
        <><Loader2 className="w-4 h-4 animate-spin" />Generating PDF…</>
      ) : (
        <><FileDown className="w-4 h-4" />Export PDF Report{runs.length > 1 ? ` (${runs.length} runs)` : ''}</>
      )}
    </Button>
  );
}