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
  Share2, ShieldCheck, Hash, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import PaperViewer from '@/components/paperlab/PaperViewer';
import PaperFigures from '@/components/paperlab/PaperFigures';
import SimilarityMeter from '@/components/paperlab/SimilarityMeter';

const GENERA = ['Callithrix', 'Papio', 'Gorilla', 'Pan', 'Pongo', 'Macaca'];
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
  const [genus, setGenus] = useState('Callithrix');
  const [citationStyle, setCitationStyle] = useState('Harvard');
  const [generating, setGenerating] = useState(false);
  const [activeDraft, setActiveDraft] = useState(null);

  // Auth check
  const { data: user, isLoading: authLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  // Load saved drafts
  const { data: drafts = [], refetch: refetchDrafts } = useQuery({
    queryKey: ['paper_drafts'],
    queryFn: () => base44.entities.PaperDraft.list('-created_date', 20),
    enabled: user?.role === 'admin',
  });

  const generate = async () => {
    setGenerating(true);
    setActiveDraft(null);
    try {
      const res = await base44.functions.invoke('generateAcademicPaper', {
        genus,
        citation_style: citationStyle,
        save_draft: true,
      });
      const data = res.data;
      setActiveDraft({
        title: data.title,
        genus,
        citation_style: citationStyle,
        sections: data.sections,
        figures_data: data.figures_data,
        similarity_scores: data.similarity_scores,
        keywords: data.keywords,
        word_count: data.word_count,
        id: data.draft_id
      });
      refetchDrafts();
      toast.success(`Draft generated — ${data.word_count?.toLocaleString()} words`);
    } catch (e) {
      toast.error('Generation failed: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const deleteDraft = async (id) => {
    await base44.entities.PaperDraft.delete(id);
    refetchDrafts();
    if (activeDraft?.id === id) setActiveDraft(null);
    toast.success('Draft deleted');
  };

  const printPaper = () => {
    if (!activeDraft) return;
    const { title, sections, keywords, word_count, citation_style, similarity_scores } = activeDraft;
    const sectionBlocks = [
      ['Abstract', sections.abstract],
      ['1. Introduction', sections.introduction],
      ['2. Materials & Methods', sections.methods],
      ['3. Results', sections.results],
      ['4. Discussion', sections.discussion],
      ['5. Conclusion', sections.conclusion],
      ['References', sections.references],
    ].map(([heading, body]) => `
      <section>
        <h2>${heading}</h2>
        ${(body || '').split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
      </section>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page { size: A4; margin: 25mm 20mm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.7; color: #111; max-width: 170mm; margin: 0 auto; }
  .watermark { background: #fff3cd; border: 1px solid #ffc107; padding: 8pt 12pt; font-size: 9pt; font-family: Arial, sans-serif; margin-bottom: 20pt; border-radius: 4pt; }
  h1 { font-size: 16pt; font-weight: bold; margin-bottom: 6pt; line-height: 1.3; }
  .meta { font-size: 9pt; color: #555; margin-bottom: 18pt; border-bottom: 1pt solid #ccc; padding-bottom: 8pt; }
  h2 { font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5pt; margin-top: 20pt; margin-bottom: 6pt; border-top: 1pt solid #ddd; padding-top: 10pt; }
  p { margin: 0 0 8pt 0; text-align: justify; }
  section:first-of-type h2 { border-top: none; padding-top: 0; }
  @media print { .watermark { display: none; } body { max-width: 100%; } }
</style>
</head>
<body>
  <div class="watermark">⚠ PRIVATE DEVELOPER DRAFT — AI-GENERATED — FOR EVALUATION ONLY — NOT FOR DISTRIBUTION</div>
  <h1>${title}</h1>
  <div class="meta">
    <strong>Genus:</strong> ${genus} &nbsp;|&nbsp;
    <strong>Style:</strong> ${citation_style} &nbsp;|&nbsp;
    <strong>Words:</strong> ~${word_count?.toLocaleString()} &nbsp;|&nbsp;
    <strong>Similarity:</strong> ${similarity_scores?.overall ?? '?'}% &nbsp;|&nbsp;
    <strong>Keywords:</strong> ${(keywords || []).join('; ')} &nbsp;|&nbsp;
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

  const exportMarkdown = () => {
    if (!activeDraft) return;
    const { title, sections, similarity_scores, word_count } = activeDraft;
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
    a.download = `${genus}_academic_draft_${new Date().toISOString().slice(0, 10)}.md`;
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
          <div className="mt-5 flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Genus</label>
              <Select value={genus} onValueChange={setGenus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENERA.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              disabled={generating}
              className="bg-bangor-red hover:bg-bangor-red/90 text-white"
            >
              {generating
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                : <><BookOpen className="w-4 h-4 mr-2" />Generate Paper</>
              }
            </Button>
            {activeDraft && (
              <>
                <Button variant="outline" onClick={printPaper}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print / Read
                </Button>
                <Button variant="outline" onClick={exportMarkdown}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Markdown
                </Button>
              </>
            )}
          </div>

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

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Draft history + similarity */}
          <div className="space-y-4">

            {/* Draft History */}
            {drafts.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-700">Saved Drafts</h3>
                    <Badge variant="outline" className="text-xs ml-auto">{drafts.length}</Badge>
                  </div>
                  <div>
                    {drafts.map(d => (
                      <DraftHistoryItem
                        key={d.id}
                        draft={d}
                        onLoad={(draft) => {
                          setActiveDraft({
                            ...draft,
                            sections: draft.sections,
                          });
                        }}
                        onDelete={deleteDraft}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
          <div className="lg:col-span-2">
            {activeDraft ? (
              <PaperViewer draft={activeDraft} />
            ) : (
              <div className="h-96 flex items-center justify-center bg-white border border-dashed border-slate-300 rounded-2xl">
                <div className="text-center space-y-2 text-slate-400">
                  <BookOpen className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-sm font-medium">Select a genus and click Generate</p>
                  <p className="text-xs">Paper will appear here with all sections, figures and similarity scores</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}