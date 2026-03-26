import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PaperFigures from './PaperFigures';

const SECTIONS = [
  { key: 'abstract', label: 'Abstract', figureAfter: false },
  { key: 'introduction', label: '1. Introduction', figureAfter: false },
  { key: 'methods', label: '2. Materials & Methods', figureAfter: true },
  { key: 'results', label: '3. Results', figureAfter: true },
  { key: 'discussion', label: '4. Discussion', figureAfter: true },
  { key: 'conclusion', label: '5. Conclusion', figureAfter: true },
  { key: 'references', label: 'References', figureAfter: false },
];

function Section({ label, content, figures, defaultOpen = false, printMode = false }) {
  // In both interactive and print modes, always start expanded
  const [open, setOpen] = useState(true);
  
  return (
    <>
      {!printMode && (
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
              {figures && figures.length > 0 && (
                <div className="mt-8 border-t pt-8">
                  <h3 className="text-base font-semibold text-slate-800 mb-6">Figures & Evidence</h3>
                  <PaperFigures figures={figures} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {printMode && (
        <div className="mb-12 page-break-inside-avoid">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b-3 border-bangor-red pb-3">{label}</h2>
          <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed mb-8">
            <ReactMarkdown>{content || '*Section not generated.*'}</ReactMarkdown>
          </div>
          {figures && figures.length > 0 && (
            <div className="my-10 page-break-inside-avoid">
              <h3 className="text-xl font-bold text-slate-900 mb-6 border-b-2 border-slate-300 pb-2">Figures & Evidence</h3>
              <div className="space-y-10">
                {figures.map((fig, idx) => (
                  <div key={idx} className="page-break-inside-avoid">
                    {(fig.image_url || fig.src) && (
                      <div className="mb-4 text-center">
                        <img 
                          src={fig.image_url || fig.src}
                          alt={fig.title || `Figure ${idx + 1}`}
                          className="max-w-full h-auto border-2 border-slate-300 rounded-lg shadow-md inline-block"
                          style={{ maxHeight: '500px' }}
                        />
                      </div>
                    )}
                    <p className="text-base font-bold text-slate-900">
                      Figure {idx + 1}: {fig.title}
                    </p>
                    <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                      {fig.description}
                    </p>
                  </div>
                ))}
              </div>
              <PaperFigures figures={figures.filter(f => !f.image_url && !f.src)} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function PaperViewer({ draft, printMode = false }) {
  if (!draft) return null;
  const { title, sections, keywords, word_count, citation_style, genus, figures_data } = draft;

  return (
    <div className={printMode ? 'space-y-0' : 'space-y-4'}>
      {/* Title block */}
      <div className={printMode ? 'mb-8' : 'bg-white border border-slate-200 rounded-xl p-6 text-center space-y-2'}>
        <h1 className={printMode ? 'text-2xl font-bold text-slate-900 mb-2' : 'text-lg font-bold text-slate-900 leading-snug'}>{title}</h1>
        {keywords?.length > 0 && (
          <p className="text-xs text-slate-500 italic">
            <span className="font-semibold">Keywords:</span> {keywords.join(', ')}
          </p>
        )}
        <div className={printMode ? 'text-xs text-slate-600 mb-4' : 'flex items-center justify-center gap-4 text-xs text-slate-400 mt-1'}>
          <span>Genus: <strong className="italic text-slate-600">{genus}</strong></span>
          <span>Style: <strong className="text-slate-600">{citation_style}</strong></span>
          {word_count && <span>~{word_count.toLocaleString()} words</span>}
        </div>
        {!printMode && (
          <div className="mt-2 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-700 font-medium">
            ⚠ PRIVATE DEVELOPER DRAFT — AI-GENERATED, NOT FOR DISTRIBUTION
          </div>
        )}
      </div>

      {/* Sections */}
      <div className={printMode ? 'space-y-0' : 'space-y-2'}>
        {SECTIONS.map((s, i) => {
          const sectionFigures = s.figureAfter && figures_data ? figures_data : null;
          return (
            <Section
              key={s.key}
              label={s.label}
              content={sections?.[s.key]}
              figures={sectionFigures}
              defaultOpen={i === 0}
              printMode={printMode}
            />
          );
        })}
      </div>
    </div>
  );
}