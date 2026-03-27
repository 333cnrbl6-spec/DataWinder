/**
 * AcademicPaperLab — PRIVATE DEVELOPER TOOL
 *
 * Generates academic paper drafts from real DataWinder data.
 * Modelled on Hill & Winder (2019) Journal of Biogeography.
 * ADMIN ONLY. Never linked from the public nav.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FlaskConical, Loader2, Download, BookOpen, Trash2,
  FileText, History, AlertTriangle, Lock, Printer,
  Share2, ShieldCheck, Hash, CheckCircle2, BarChart2, Eye, BookMarked,
  GitCompare, ArrowLeftRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import PaperViewer from '@/components/paperlab/PaperViewer';
import PaperFigures from '@/components/paperlab/PaperFigures';
import SimilarityMeter from '@/components/paperlab/SimilarityMeter';
import EvolutionaryContextPanel from '@/components/paperlab/EvolutionaryContextPanel';
import VisualReportViewer from '@/components/paperlab/VisualReportViewer';
import ComparativeMetricsPanel from '@/components/paperlab/ComparativeMetricsPanel';
import GenerationConfigPanel from '@/components/paperlab/GenerationConfigPanel';

const TAXA = [
  { name: 'Callithrix', rank: 'genus' },
  { name: 'Callitrichidae', rank: 'family' },
  { name: 'Papio', rank: 'genus' },
  { name: 'Gorilla', rank: 'genus' },
  { name: 'Pan', rank: 'genus' },
  { name: 'Pongo', rank: 'genus' },
  { name: 'Macaca', rank: 'genus' },
];
const CITATION_STYLES = ['Harvard', 'APA', 'Vancouver'];

function DraftHistoryItem({ draft, onLoad, onDelete }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700 truncate">{draft.title || draft.genus}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-xs py-0">{draft.genus}</Badge>
          <span className="text-xs text-slate-400">{draft.citation_style}</span>
          {draft.similarity_scores?.overall !== undefined && (
            <span className="text-xs text-slate-400">
              Sim: {draft.similarity_scores.overall}%
            </span>
          )}
          <span className="text-xs text-slate-400">
            {new Date(draft.created_date).toLocaleDateString('en-GB')}
          </span>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => onLoad(draft)}>
          Load
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={() => onDelete(draft.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function AcademicPaperLab() {
  const [taxon, setTaxon] = useState('Callithrix');
  const [taxonRank, setTaxonRank] = useState('genus');
  const [citationStyle, setCitationStyle] = useState('Harvard');
  const [generating, setGenerating] = useState(false);
  const [activeDraft, setActiveDraft] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [authorshipRecord, setAuthorshipRecord] = useState(null);
  const [reportMode, setReportMode] = useState('text'); // 'text' | 'visual' | 'comparative'
  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [taxonB, setTaxonB] = useState('Papio');
  const [taxonRankB, setTaxonRankB] = useState('genus');
  // Generation config
  const [genConfig, setGenConfig] = useState({ conservatism: 70, narrativeStyle: 'balanced' });

  // Auth check
  const { data: user, isLoading: authLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  // Load saved drafts
  const { data: drafts = [], refetch: refetchDrafts, isLoading: draftsLoading } = useQuery({
    queryKey: ['paper_drafts'],
    queryFn: () => base44.entities.PaperDraft.list('-created_date', 50),
    enabled: !authLoading,
  });

  const generate = async () => {
    setGenerating(true);
    setActiveDraft(null);
    try {
      let data;
      if (compareMode) {
        const res = await base44.functions.invoke('generateComparativePaper', {
          taxon_a: taxon,
          rank_a: taxonRank,
          taxon_b: taxonB,
          rank_b: taxonRankB,
          citation_style: citationStyle,
          save_draft: true,
          conservatism: genConfig.conservatism,
          narrative_style: genConfig.narrativeStyle,
        });
        data = res.data;
      } else {
        const res = await base44.functions.invoke('generateAcademicPaper', {
          taxon,
          taxon_rank: taxonRank,
          citation_style: citationStyle,
          save_draft: true,
          conservatism: genConfig.conservatism,
          narrative_style: genConfig.narrativeStyle,
        });
        data = res.data;
      }

      if (!data.sections || !data.title) throw new Error('Backend returned incomplete paper data');

      const validSections = {
        abstract: data.sections.abstract || '',
        introduction: data.sections.introduction || '',
        methods: data.sections.methods || '',
        results: data.sections.results || '',
        discussion: data.sections.discussion || '',
        conclusion: data.sections.conclusion || '',
        references: data.sections.references || ''
      };
      const figuresData = Array.isArray(data.figures_data) ? data.figures_data : [];

      setActiveDraft({
        title: data.title,
        genus: compareMode ? `${taxon} vs ${taxonB}` : (data.taxon || taxon),
        taxon: data.taxon || taxon,
        taxon_rank: data.taxon_rank || taxonRank,
        citation_style: citationStyle,
        sections: validSections,
        figures_data: figuresData,
        similarity_scores: data.similarity_scores || {},
        keywords: data.keywords || [],
        word_count: data.word_count || 0,
        id: data.draft_id,
        // Comparative-specific fields
        is_comparative: compareMode,
        taxon_a: compareMode ? taxon : undefined,
        taxon_b: compareMode ? taxonB : undefined,
        comparative_metrics: data.comparative_metrics || null,
        raw_data: data.raw_data || null,
      });

      // Auto-switch to comparative report mode
      if (compareMode) setReportMode('comparative');

      refetchDrafts();
      toast.success(`${compareMode ? 'Comparative draft' : 'Draft'} generated — ${data.word_count?.toLocaleString()} words`);
    } catch (e) {
      console.error('Generation error:', e);
      toast.error('Generation failed: ' + e.message);
      setActiveDraft(null);
    } finally {
      setGenerating(false);
    }
  };

  const deleteDraft = async (id) => {
    try {
      await base44.entities.PaperDraft.delete(id);
      toast.success('Draft deleted');
    } catch (e) {
      if (e.message?.includes('not found')) {
        toast.info('Draft already removed');
      } else {
        toast.error('Failed to delete draft: ' + e.message);
      }
    } finally {
      refetchDrafts();
      if (activeDraft?.id === id) setActiveDraft(null);
    }
  };

  const printPaper = () => {
    if (!activeDraft || !activeDraft.sections) {
      toast.error('No valid draft to print');
      return;
    }

    // Validate critical sections exist
    if (!activeDraft.sections.abstract || !activeDraft.sections.introduction) {
      toast.error('Draft is incomplete — cannot print');
      return;
    }

    // Generate figures HTML
    const figuresHtml = (activeDraft.figures_data || []).map((fig, idx) => {
      const colors = ['#1f2937', '#059669', '#d97706', '#2563eb', '#7c3aed'];
      let chartHtml = '';
      let figureNum = idx + 1;
      
      if (fig.type === 'image' && fig.image_url) {
        // Render AI-generated image
        chartHtml = `<div style="text-align: center; margin: 10px 0; page-break-inside: avoid;"><img src="${fig.image_url}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" /></div>`;
      } else if (fig.type === 'pie' && Array.isArray(fig.data) && fig.data.length > 0) {
        // Simple pie chart as SVG
        const total = fig.data.reduce((sum, d) => sum + d.value, 0);
        let angle = 0;
        const slices = fig.data.map((d, i) => {
          const percentage = (d.value / total) * 100;
          const sliceAngle = (percentage / 100) * 360;
          const x1 = 100 + 80 * Math.cos((angle * Math.PI) / 180);
          const y1 = 100 + 80 * Math.sin((angle * Math.PI) / 180);
          const x2 = 100 + 80 * Math.cos(((angle + sliceAngle) * Math.PI) / 180);
          const y2 = 100 + 80 * Math.sin(((angle + sliceAngle) * Math.PI) / 180);
          const largeArc = sliceAngle > 180 ? 1 : 0;
          const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
          angle += sliceAngle;
          return `<path d="${path}" fill="${colors[i % colors.length]}" stroke="white" stroke-width="2" />`;
        }).join('');
        chartHtml = `<svg width="200" height="200" viewBox="0 0 200 200" style="margin: 10px auto; display: block;">${slices}</svg>`;
      } else if (fig.image_url || fig.src) {
        // Render image if available
        const imgUrl = fig.image_url || fig.src;
        chartHtml = `<div style="text-align: center; margin: 10px 0;"><img src="${imgUrl}" style="max-width: 100%; max-height: 400px; border: 1px solid #ddd; border-radius: 4px;" /></div>`;
      } else if (Array.isArray(fig.data) && fig.data.length > 0 && fig.data[0]?.value) {
        // Bar chart placeholder
        const maxValue = Math.max(...fig.data.map(d => d.value || 0));
        const bars = fig.data.map((d, i) => {
          const height = (d.value / maxValue) * 100;
          return `<div style="display: inline-block; width: 30px; height: 150px; margin: 5px; background: linear-gradient(to top, ${colors[i % colors.length]} ${height}%, #f0f0f0 ${height}%); border: 1px solid #ddd;"></div>`;
        }).join('');
        chartHtml = `<div style="text-align: center; margin: 15px 0;">${bars}</div>`;
      } else if (Array.isArray(fig.data) && fig.data.length > 0) {
        // Render table for array data (fallback for any array structure)
        const headers = Object.keys(fig.data[0]);
        const rows = fig.data.map((d, idx) => `
          <tr style="border-bottom: 1px solid #ddd;">
            ${headers.map(h => `<td style="padding: 6px 8px; font-size: 9pt; text-align: left;">${d[h]}</td>`).join('')}
          </tr>
        `).join('');
        chartHtml = `<table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt;">
          <thead style="background: #f0f0f0; font-weight: bold;">
            <tr>${headers.map(h => `<th style="padding: 6px 8px; text-align: left; border-bottom: 2px solid #ddd;">${h}</th>`).join('')}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
      } else {
        // Fallback placeholder
        chartHtml = `<div style="text-align: center; margin: 15px 0; padding: 20px; background: #f5f5f5; border-radius: 4px; color: #999;">Chart data: ${fig.description || 'Figure'}</div>`;
      }
      
      return `
        <div style="margin: 20px 0; page-break-inside: avoid;">
          <h3 style="font-size: 11pt; font-weight: bold; margin-bottom: 10px;">Figure ${figureNum}. ${fig.title || fig.id || fig.type}</h3>
          ${chartHtml}
          <p style="font-size: 9pt; text-align: center; color: #666; margin-top: 8px;">${fig.description || ''}</p>
        </div>
      `;
    }).join('');

    const sectionBlocks = [
      ['Abstract', activeDraft.sections.abstract],
      ['1. Introduction', activeDraft.sections.introduction],
      ['2. Materials & Methods', activeDraft.sections.methods],
      ['3. Results', activeDraft.sections.results, figuresHtml],
      ['4. Discussion', activeDraft.sections.discussion],
      ['5. Conclusion', activeDraft.sections.conclusion],
      ['References', activeDraft.sections.references],
    ].map(([heading, body, figures]) => `
      <section style="page-break-inside: avoid;">
        <h2>${heading}</h2>
        ${(body || '').split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
        ${figures || ''}
      </section>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${activeDraft.title}</title>
<style>
  @page { size: A4; margin: 25mm 20mm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.7; color: #111; max-width: 170mm; margin: 0 auto; }
  .watermark { background: #fff3cd; border: 1px solid #ffc107; padding: 8pt 12pt; font-size: 9pt; font-family: Arial, sans-serif; margin-bottom: 20pt; border-radius: 4pt; }
  h1 { font-size: 16pt; font-weight: bold; margin-bottom: 6pt; line-height: 1.3; }
  .meta { font-size: 9pt; color: #555; margin-bottom: 18pt; border-bottom: 1pt solid #ccc; padding-bottom: 8pt; }
  h2 { font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5pt; margin-top: 20pt; margin-bottom: 6pt; border-top: 1pt solid #ddd; padding-top: 10pt; }
  h3 { font-size: 11pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
  p { margin: 0 0 8pt 0; text-align: justify; }
  section:first-of-type h2 { border-top: none; padding-top: 0; }
  svg { max-width: 100%; height: auto; }
  @media print { .watermark { display: none; } body { max-width: 100%; } section { page-break-inside: avoid; } }
</style>
</head>
<body>
  <div class="watermark">⚠ PRIVATE DEVELOPER DRAFT — AI-GENERATED — FOR EVALUATION ONLY — NOT FOR DISTRIBUTION</div>
  <h1>${activeDraft.title}</h1>
  <div class="meta">
    <strong>Taxon:</strong> ${activeDraft.genus || taxon} &nbsp;|&nbsp;
    <strong>Style:</strong> ${citationStyle} &nbsp;|&nbsp;
    <strong>Words:</strong> ~${activeDraft.word_count?.toLocaleString()} &nbsp;|&nbsp;
    <strong>Similarity:</strong> ${activeDraft.similarity_scores?.overall ?? '?'}% &nbsp;|&nbsp;
    <strong>Keywords:</strong> ${(activeDraft.keywords || []).join('; ')} &nbsp;|&nbsp;
    <strong>Generated:</strong> ${new Date().toLocaleString('en-GB')}
  </div>
  ${sectionBlocks}
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  const createShareLink = async () => {
    if (!activeDraft?.id) { toast.error('Save the draft first (generate with save_draft: true)'); return; }
    setSharing(true);
    setShareLink(null);
    try {
      const res = await base44.functions.invoke('createSecureShare', {
        draft_id: activeDraft.id,
        audio_enabled: true,
        expires_hours: 48,
      });
      const token = res.data.token;
      const url = `${window.location.origin}/SecureView?token=${token}`;
      setShareLink(url);
      await navigator.clipboard.writeText(url);
      toast.success('One-time link copied to clipboard — share it now. It burns on first view.');
    } catch (e) {
      toast.error('Share failed: ' + e.message);
    } finally {
      setSharing(false);
    }
  };

  const registerAuthorship = async () => {
    if (!activeDraft?.id) { toast.error('No saved draft to register'); return; }
    setRegistering(true);
    setAuthorshipRecord(null);
    try {
      const res = await base44.functions.invoke('registerAuthorship', { draft_id: activeDraft.id });
      setAuthorshipRecord(res.data);
      toast.success('Authorship registered & timestamped with SHA-256 hash');
    } catch (e) {
      toast.error('Registration failed: ' + e.message);
    } finally {
      setRegistering(false);
    }
  };

  const exportMarkdown = () => {
    if (!activeDraft) return;
    const { title, sections, similarity_scores, word_count, taxon: draftTaxon } = activeDraft;
    const lines = [
      `# ${title}`,
      `\n> **PRIVATE DEVELOPER DRAFT — AI-GENERATED — NOT FOR DISTRIBUTION**\n`,
      `**Generated:** ${new Date().toLocaleString('en-GB')} | **Words:** ~${word_count?.toLocaleString()} | **Style:** ${activeDraft.citation_style}`,
      `**Similarity (overall):** ${similarity_scores?.overall ?? '?'}%\n`,
      `---\n`,
      `## Abstract\n\n${sections.abstract}\n`,
      `## 1. Introduction\n\n${sections.introduction}\n`,
      `## 2. Materials & Methods\n\n${sections.methods}\n`,
      `## 3. Results\n\n${sections.results}\n`,
      `## 4. Discussion\n\n${sections.discussion}\n`,
      `## 5. Conclusion\n\n${sections.conclusion}\n`,
      `## References\n\n${sections.references}\n`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draftTaxon}_academic_draft_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Access control
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3 p-8">
          <Lock className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="font-bold text-slate-700">Access Restricted</h2>
          <p className="text-sm text-slate-500">This tool is for authorised developers only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-bangor-red/10 rounded-xl">
                <FlaskConical className="w-6 h-6 text-bangor-red" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">Academic Paper Lab</h1>
                  <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs font-bold">
                    🔒 DEVELOPER ONLY
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  Generates peer-review-quality drafts from real DataWinder data · Modelled on Hill &amp; Winder (2019)
                </p>
              </div>
            </div>
          </div>

          {/* Warning banner */}
          <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-bold">Private Research Tool — Ethical Use Only</p>
              <p>This tool generates AI-assisted academic drafts for benchmarking DataWinder's data quality against published research. 
                Outputs are for developer evaluation only. Generated content must never be submitted as original academic work.</p>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-5 space-y-3">
            {/* Mode toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCompareMode(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!compareMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Single Taxon
              </button>
              <button
                onClick={() => setCompareMode(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${compareMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" /> Compare Mode
              </button>
            </div>

            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">{compareMode ? 'Taxon A' : 'Taxon'}</label>
                <Select 
                  value={`${taxon}|${taxonRank}`} 
                  onValueChange={(val) => { const [t, r] = val.split('|'); setTaxon(t); setTaxonRank(r); }}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAXA.map(t => (
                      <SelectItem key={`${t.name}|${t.rank}`} value={`${t.name}|${t.rank}`}>
                        {t.name} <span className="text-xs text-slate-400 ml-2">({t.rank})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {compareMode && (
                <>
                  <div className="flex items-center pb-1">
                    <ArrowLeftRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-red-600">Taxon B</label>
                    <Select
                      value={`${taxonB}|${taxonRankB}`}
                      onValueChange={(val) => { const [t, r] = val.split('|'); setTaxonB(t); setTaxonRankB(r); }}
                    >
                      <SelectTrigger className="w-44 border-red-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TAXA.map(t => (
                          <SelectItem key={`${t.name}|${t.rank}`} value={`${t.name}|${t.rank}`}>
                            {t.name} <span className="text-xs text-slate-400 ml-2">({t.rank})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Citation Style</label>
                <Select value={citationStyle} onValueChange={setCitationStyle}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CITATION_STYLES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={generate}
                disabled={generating || (compareMode && taxon === taxonB)}
                className={compareMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-bangor-red hover:bg-bangor-red/90 text-white'}
              >
                {generating
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                  : compareMode
                    ? <><GitCompare className="w-4 h-4 mr-2" />Compare {taxon} vs {taxonB}</>
                    : <><BookOpen className="w-4 h-4 mr-2" />Generate Paper</>
                }
              </Button>
            </div>
          </div>

          {/* AI Generation Config */}
          <div className="mt-3">
            <GenerationConfigPanel config={genConfig} onChange={setGenConfig} />
          </div>

          {activeDraft && (
            <div className="w-full mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Paper actions */}
                <div className="flex flex-col gap-2 p-3 bg-amber-50 rounded-xl border-2 border-amber-300">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">📄 Paper</p>
                  <Button onClick={printPaper} className="justify-start gap-2 text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white font-semibold border-0">
                    <Printer className="w-4 h-4" /> Print / Read Full Paper
                  </Button>
                  <Button variant="outline" onClick={exportMarkdown} className="justify-start gap-2 text-xs h-8">
                    <Download className="w-3.5 h-3.5" /> Export Markdown
                  </Button>
                  <Button
                    variant="outline"
                    onClick={createShareLink}
                    disabled={sharing || !activeDraft?.id}
                    className="justify-start gap-2 text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    {sharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                    View-Once Share Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={registerAuthorship}
                    disabled={registering || !activeDraft?.id}
                    className="justify-start gap-2 text-xs h-8 border-green-300 text-green-700 hover:bg-green-50"
                  >
                    {registering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hash className="w-3.5 h-3.5" />}
                    Register Authorship (SHA-256)
                  </Button>
                </div>

                {/* Evidence report actions */}
                <div className="flex flex-col gap-2 p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <p className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1">DataWinder Evidence Report</p>
                  <p className="text-xs text-slate-500 leading-relaxed mb-1">
                    Visual companion showing everything DataWinder collected — maps, charts, species images, outlier flags and completeness matrix for <em>{activeDraft?.genus || taxon}</em>.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/DataWinderReport?genus=${activeDraft?.genus || taxon}`, '_blank')}
                    className="justify-start gap-2 text-xs h-8 border-purple-300 text-purple-700 hover:bg-purple-100"
                  >
                    <BarChart2 className="w-3.5 h-3.5" /> Open Evidence Report
                  </Button>
                  <Button
                    onClick={() => {
                      const win = window.open(`/DataWinderReport?genus=${activeDraft?.genus || taxon}&print=1`, '_blank');
                      win.addEventListener('load', () => setTimeout(() => win.print(), 1500));
                    }}
                    className="justify-start gap-2 text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / Save Evidence Report as PDF
                  </Button>
                </div>
              </div>
            )}

          {generating && (
            <div className="mt-4 bg-bangor-red/5 border border-bangor-red/20 rounded-xl p-4 text-sm text-bangor-red flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin shrink-0" />
              <div>
                <p className="font-semibold">Generating academic paper…</p>
                <p className="text-xs mt-0.5 text-slate-500">
                  Fetching live data from IUCN · GBIF · iNaturalist → structuring with Claude Sonnet → similarity check. Takes ~30–60s.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Share link result */}
        {shareLink && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800">View-Once Link Generated & Copied</p>
              <p className="text-xs text-amber-700 mt-1 break-all font-mono">{shareLink}</p>
              <p className="text-xs text-amber-600 mt-2">
                This link burns permanently after the first view. Expires in 48 hours. IP address of viewer is recorded.
                The URL is already in your clipboard.
              </p>
            </div>
          </div>
        )}

        {/* Authorship certificate */}
        {authorshipRecord && (
          <div className="bg-green-50 border border-green-300 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-green-800">Authorship Registered</p>
              <p className="text-xs text-green-700 mt-1">
                <strong>Timestamp:</strong> {authorshipRecord.timestamp_utc}
              </p>
              <p className="text-xs text-green-700 font-mono mt-0.5 break-all">
                <strong>SHA-256:</strong> {authorshipRecord.content_hash}
              </p>
              <p className="text-xs text-green-600 mt-2">
                This hash is stored immutably. Under the Copyright, Designs and Patents Act 1988, 
                copyright subsists from the moment of creation. This record proves you created this 
                exact content at this exact time.
              </p>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Draft history + similarity */}
          <div className="space-y-4">

            {/* Draft History */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">Saved Drafts</h3>
                  <Badge variant="outline" className="text-xs ml-auto">{drafts.length}</Badge>
                </div>
                {draftsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading drafts…
                  </div>
                ) : drafts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No drafts yet — generate one above.</p>
                ) : (
                  <div>
                    {drafts.map(d => (
                      <DraftHistoryItem
                        key={d.id}
                        draft={d}
                        onLoad={(draft) => {
                          if (!draft.sections || !draft.title) {
                            toast.error('Draft is incomplete');
                            return;
                          }
                          setActiveDraft({
                            ...draft,
                            sections: draft.sections || {},
                            figures_data: Array.isArray(draft.figures_data) ? draft.figures_data : [],
                            similarity_scores: draft.similarity_scores || {},
                            keywords: draft.keywords || [],
                            word_count: draft.word_count || 0
                          });
                        }}
                        onDelete={deleteDraft}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Similarity meter */}
            {activeDraft?.similarity_scores && (
              <SimilarityMeter scores={activeDraft.similarity_scores} />
            )}

            {/* Benchmark papers reference */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">Structural Templates</h3>
                </div>
                {[
                  { ref: 'Hill & Winder (2019)', detail: 'J. Biogeography 46(7)', note: 'Primary structure template' },
                  { ref: 'Rylands & Mittermeier (2009)', detail: 'New World Primates taxonomy', note: 'Taxonomy & status' },
                  { ref: 'Zinner et al. (2013)', detail: 'Am. J. Phys. Anthro.', note: 'SDM readiness' },
                  { ref: 'Freitas et al. (2019)', detail: 'Am. J. Primatology', note: 'Habitat & threat' },
                ].map((p, i) => (
                  <div key={i} className="text-xs border-l-2 border-bangor-red/30 pl-3">
                    <p className="font-semibold text-slate-700">{p.ref}</p>
                    <p className="text-slate-400 italic">{p.detail}</p>
                    <p className="text-bangor-red">{p.note}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Evolutionary ecology frameworks */}
            <EvolutionaryContextPanel genus={activeDraft?.genus || activeDraft?.taxon || taxon} />

            {/* Figures */}
            {activeDraft?.figures_data && (
              <div>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Generated Figures
                </h3>
                <PaperFigures figures={activeDraft.figures_data} />
              </div>
            )}
          </div>

          {/* Right: Paper viewer */}
           <div className="lg:col-span-2 space-y-4">
             {activeDraft && (
               <>
                 {/* Mode toggle */}
                 <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 sticky top-6 flex-wrap">
                  <button
                    onClick={() => setReportMode('text')}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition-all ${
                      reportMode === 'text' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <BookMarked className="w-4 h-4" /> Text Report
                  </button>
                  <button
                    onClick={() => setReportMode('visual')}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition-all ${
                      reportMode === 'visual' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Eye className="w-4 h-4" /> Visual Report
                  </button>
                  {activeDraft?.is_comparative && (
                    <button
                      onClick={() => setReportMode('comparative')}
                      className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition-all ${
                        reportMode === 'comparative' ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <GitCompare className="w-4 h-4" /> Comparative
                    </button>
                  )}
                 </div>

                 {/* Content */}
                 {reportMode === 'text' && <PaperViewer draft={activeDraft} />}
                 {reportMode === 'visual' && <VisualReportViewer draft={activeDraft} />}
                 {reportMode === 'comparative' && activeDraft?.is_comparative && (
                  <div className="space-y-4">
                    <ComparativeMetricsPanel
                      metrics={activeDraft.comparative_metrics}
                      figures={activeDraft.figures_data}
                      rawData={activeDraft.raw_data}
                    />
                    <PaperViewer draft={activeDraft} />
                  </div>
                 )}
               </>
             )}
             {!activeDraft && (
               <div className="h-96 flex items-center justify-center bg-white border border-dashed border-slate-300 rounded-2xl">
                 <div className="text-center space-y-2 text-slate-400">
                   <BookOpen className="w-10 h-10 mx-auto opacity-30" />
                   <p className="text-sm font-medium">Ready to generate</p>
                   <p className="text-xs">Select a taxon above and click Generate Paper to get started</p>
                 </div>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}