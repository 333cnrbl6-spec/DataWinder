import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Tooltip ────────────────────────────────────────────────────────────────
function HelpTip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1 align-middle">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="text-slate-400 hover:text-bangor-red transition-colors"
        aria-label="More information"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-2xl leading-relaxed pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </span>
  );
}

// ─── Parameter Row ───────────────────────────────────────────────────────────
function ParamRow({ label, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 py-5 border-b border-slate-100 last:border-0">
      <div className="sm:w-64 shrink-0">
        <div className="text-sm font-semibold text-slate-800 flex items-center">
          {label}
        </div>
        <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ParametersPanel({ parameters, onChange }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const set = (key, val) => onChange({ ...parameters, [key]: val });

  return (
    <Card className="shadow-lg border-slate-200">
      <CardHeader className="bg-gradient-to-r from-bangor-red/8 to-bangor-sun/8 border-b border-slate-200">
        <CardTitle className="text-bangor-red text-lg">Configure Model Parameters</CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          The defaults below are suitable for most studies. You can leave these as they are if you're unsure —
          the model will still produce meaningful results.
        </p>
      </CardHeader>
      <CardContent className="p-6">

        {/* "Defaults are fine" callout */}
        <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-6 text-xs text-green-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
          <span>
            <strong>Not sure what these mean?</strong> That's fine — the default values (shown below)
            are well-established starting points used in published research. You can always adjust them later.
          </span>
        </div>

        {/* ── Regularisation ── */}
        <ParamRow
          label={
            <>
              Regularisation Multiplier
              <HelpTip text="Controls how 'strict' the model is. A value of 1.0 is standard. If your species has fewer than 30 records, try increasing this to 2–4 to avoid overfitting (making the model too specific to your data)." />
            </>
          }
          description="How flexible should the model be? Higher = simpler model. (Default: 1.0)"
        >
          <div className="flex items-center gap-4">
            <Slider
              min={0.1} max={10} step={0.1}
              value={[parameters.regularization_multiplier]}
              onValueChange={([v]) => set('regularization_multiplier', Math.round(v * 10) / 10)}
              className="flex-1"
            />
            <span className="w-14 text-center text-sm font-bold text-bangor-red bg-bangor-red/10 rounded-lg py-1.5 shrink-0">
              {parameters.regularization_multiplier}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1.5 px-0.5">
            <span>← More complex</span>
            <span>Simpler →</span>
          </div>
        </ParamRow>

        {/* ── Max Iterations ── */}
        <ParamRow
          label={
            <>
              Maximum Iterations
              <HelpTip text="How many steps the model takes to find the best solution. 500 is usually enough. If the model log says it didn't converge, try increasing to 1000." />
            </>
          }
          description="How long should the model search for the best fit? (Default: 500)"
        >
          <div className="flex items-center gap-4">
            <Slider
              min={100} max={2000} step={100}
              value={[parameters.max_iterations]}
              onValueChange={([v]) => set('max_iterations', v)}
              className="flex-1"
            />
            <span className="w-16 text-center text-sm font-bold text-bangor-red bg-bangor-red/10 rounded-lg py-1.5 shrink-0">
              {parameters.max_iterations}
            </span>
          </div>
        </ParamRow>

        {/* ── Output Type ── */}
        <ParamRow
          label={
            <>
              Output Type
              <HelpTip text="Logistic gives a score between 0 and 1 (easiest to understand: 0 = unlikely, 1 = highly suitable). Cumulative is useful when you need a probability threshold. Raw output is for expert users only." />
            </>
          }
          description="How should suitability scores be expressed in the output map?"
        >
          <div className="flex gap-2">
            {[
              { value: 'logistic', note: 'Recommended' },
              { value: 'cumulative', note: 'For thresholds' },
              { value: 'raw', note: 'Expert use' },
            ].map(({ value, note }) => (
              <button
                key={value}
                onClick={() => set('output_type', value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 capitalize transition-all ${
                  parameters.output_type === value
                    ? 'border-bangor-red bg-bangor-red text-white shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-bangor-red/40 hover:bg-slate-50'
                }`}
              >
                <div>{value}</div>
                <div className={`text-xs font-normal mt-0.5 ${parameters.output_type === value ? 'opacity-80' : 'text-slate-400'}`}>
                  {note}
                </div>
              </button>
            ))}
          </div>
        </ParamRow>

        {/* ── Replicates ── */}
        <ParamRow
          label={
            <>
              Replicates
              <HelpTip text="Runs the model multiple times with different random splits of your data to test consistency. For exploratory work, 1 replicate is fine. For a publication, 5–10 replicates gives more robust results." />
            </>
          }
          description="How many times to repeat the model run? (Default: 1)"
        >
          <div className="flex items-center gap-4">
            <Slider
              min={1} max={10} step={1}
              value={[parameters.replicates]}
              onValueChange={([v]) => set('replicates', v)}
              className="flex-1"
            />
            <span className="w-14 text-center text-sm font-bold text-bangor-red bg-bangor-red/10 rounded-lg py-1.5 shrink-0">
              {parameters.replicates}
            </span>
          </div>
          {parameters.replicates > 5 && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠ More replicates increases run time significantly.
            </p>
          )}
        </ParamRow>

        {/* ── Feature Types ── */}
        <ParamRow
          label={
            <>
              Feature Types
              <HelpTip text="These control the shape of the response curves MAXENT fits for each variable. Linear and Hinge are good defaults for most datasets. Quadratic adds curvature. Product captures interactions. Threshold creates step-changes. Only add more if you have plenty of occurrence records (50+)." />
            </>
          }
          description="Which mathematical shapes can the model use to fit species responses?"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: 'linear',    label: 'Linear',    symbol: 'L', desc: 'Straight-line response',    recommended: true  },
              { key: 'quadratic', label: 'Quadratic', symbol: 'Q', desc: 'Curved (unimodal) response', recommended: true  },
              { key: 'hinge',     label: 'Hinge',     symbol: 'H', desc: 'Piecewise linear segments',  recommended: true  },
              { key: 'product',   label: 'Product',   symbol: 'P', desc: 'Variable interactions',      recommended: false },
              { key: 'threshold', label: 'Threshold', symbol: 'T', desc: 'Step-change response',       recommended: false },
            ].map(({ key, label, symbol, desc, recommended }) => {
              const isOn = (parameters.feature_types || ['linear','quadratic','hinge']).includes(key);
              const toggle = () => {
                const current = parameters.feature_types || ['linear','quadratic','hinge'];
                set('feature_types', isOn ? current.filter(f => f !== key) : [...current, key]);
              };
              return (
                <button
                  key={key}
                  onClick={toggle}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all ${
                    isOn
                      ? 'border-bangor-red bg-bangor-red/5 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-bangor-red/30 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-sm ${
                    isOn ? 'bg-bangor-red text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {symbol}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      {label}
                      {!recommended && <span className="text-xs font-normal text-amber-500">(adv.)</span>}
                    </div>
                    <div className="text-xs text-slate-400 leading-tight">{desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </ParamRow>

        {/* ── Advanced Toggle ── */}
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-bangor-red transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAdvanced ? 'Hide' : 'Show'} advanced options
        </button>

        {showAdvanced && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500 italic mb-4">
              Only adjust these if you have specific technical requirements.
            </p>
            <ParamRow
              label={
                <>
                  Convergence Threshold
                  <HelpTip text="The model stops when improvement between steps falls below this value. Smaller = more precise but slower. The default (0.00001) is fine for almost all use cases." />
                </>
              }
              description="Stop when improvement is this small (Default: 0.00001)"
            >
              <input
                type="number"
                step="0.000001"
                min="0.000001"
                max="0.01"
                value={parameters.convergence_threshold}
                onChange={e => set('convergence_threshold', parseFloat(e.target.value) || 0.00001)}
                className="border-2 border-slate-200 rounded-lg px-3 py-1.5 text-sm w-36 focus:border-bangor-red outline-none transition-colors"
              />
            </ParamRow>
          </div>
        )}
      </CardContent>
    </Card>
  );
}