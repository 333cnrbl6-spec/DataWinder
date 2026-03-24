import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SECTIONS = [
  { key: 'abstract', label: 'Abstract' },
  { key: 'introduction', label: '1. Introduction' },
  { key: 'methods', label: '2. Materials & Methods' },
  { key: 'results', label: '3. Results' },
  { key: 'discussion', label: '4. Discussion' },
  { key: 'conclusion', label: '5. Conclusion' },
  { key: 'references', label: 'References' },
];

function Section({ label, content, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="text-sm font-bold text-slate-800">{label}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-6 py-5 bg-white prose prose-sm prose-slate max-w-none text-sm leading-relaxed">
          <ReactMarkdown>{content || '*Section not generated.*'}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default function PaperViewer({ draft }) {
  if (!draft) return null;
  const { title, sections, keywords, word_count, citation_style, genus } = draft;

  return (
    <div className="space-y-4">
      {/* Title block */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-2">
        <h1 className="text-lg font-bold text-slate-900 leading-snug">{title}</h1>
        {keywords?.length > 0 && (
          <p className="text-xs text-slate-500 italic">
            <span className="font-semibold">Keywords:</span> {keywords.join(', ')}
          </p>
        )}
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400 mt-1">
          <span>Genus: <strong className="italic text-slate-600">{genus}</strong></span>
          <span>Style: <strong className="text-slate-600">{citation_style}</strong></span>
          {word_count && <span>~{word_count.toLocaleString()} words</span>}
        </div>
        <div className="mt-2 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-700 font-medium">
          ⚠ PRIVATE DEVELOPER DRAFT — AI-GENERATED, NOT FOR DISTRIBUTION
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {SECTIONS.map((s, i) => (
          <Section
            key={s.key}
            label={s.label}
            content={sections?.[s.key]}
            defaultOpen={i === 0}
          />
        ))}
      </div>
    </div>
  );
}