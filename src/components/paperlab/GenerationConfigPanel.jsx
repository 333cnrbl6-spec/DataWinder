/**
 * GenerationConfigPanel
 * Controls AI generation parameters: Conservatism & Narrative Style.
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SlidersHorizontal, ChevronDown, ChevronUp, ShieldCheck, BookText } from 'lucide-react';

const NARRATIVE_STYLES = [
  {
    value: 'technical',
    label: 'Technical Dense',
    description: 'Maximal jargon, passive voice, clause-heavy sentences. Mimics high-impact journal style.',
  },
  {
    value: 'balanced',
    label: 'Balanced Academic',
    description: 'Clear and precise with appropriate terminology. Suitable for broad scientific audiences.',
  },
  {
    value: 'readable',
    label: 'Readable Academic',
    description: 'Accessible prose, active voice where appropriate. Good for review articles and grant proposals.',
  },
];

function SliderRow({ label, icon: Icon, value, onChange, min = 0, max = 100, step = 10, lowLabel, highLabel, description }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">{label}</span>
        </div>
        <span className="text-xs font-bold text-bangor-red tabular-nums">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 appearance-none bg-slate-200 rounded-full cursor-pointer accent-bangor-red"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

export default function GenerationConfigPanel({ config, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-slate-200">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Generation Parameters</span>
          <span className="text-xs text-slate-400 ml-1">
            · {NARRATIVE_STYLES.find(s => s.value === config.narrativeStyle)?.label || 'Balanced Academic'}
            · Conservatism {config.conservatism}%
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <CardContent className="px-4 pb-4 pt-0 space-y-5 border-t border-slate-100">

          {/* Conservatism */}
          <SliderRow
            label="Conservatism"
            icon={ShieldCheck}
            value={config.conservatism}
            onChange={v => onChange({ ...config, conservatism: v })}
            lowLabel="Inferred / modelled"
            highLabel="Peer-reviewed only"
            description="High conservatism restricts claims to directly cited, peer-reviewed sources. Low conservatism allows the model to draw broader inferences from occurrence and threat data."
          />

          {/* Narrative Style */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <BookText className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Narrative Style</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {NARRATIVE_STYLES.map(style => (
                <button
                  key={style.value}
                  onClick={() => onChange({ ...config, narrativeStyle: style.value })}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                    config.narrativeStyle === style.value
                      ? 'border-bangor-red bg-bangor-red/5 text-bangor-red'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold">{style.label}</p>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">{style.description}</p>
                </button>
              ))}
            </div>
          </div>

        </CardContent>
      )}
    </Card>
  );
}