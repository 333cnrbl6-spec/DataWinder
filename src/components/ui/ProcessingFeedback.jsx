import React, { useEffect, useState } from 'react';
import { Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ProcessingFeedback — reusable animated feedback panel for long-running operations.
 *
 * Props:
 *   label       string   — primary status headline  (e.g. "Geocoding contacts…")
 *   detail      string   — supporting description   (e.g. "Looking up postcodes via API")
 *   tips        string[] — rotating tips shown every 8s (optional but recommended)
 *   step        number   — current step number (optional)
 *   totalSteps  number   — total steps (optional — shows a real progress bar when provided)
 *   className   string   — extra Tailwind classes
 */
export default function ProcessingFeedback({ label, detail, tips = [], step, totalSteps, className }) {
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [label]);

  useEffect(() => {
    if (!tips.length) return;
    setTipIndex(0);
    const t = setInterval(() => setTipIndex(i => (i + 1) % tips.length), 8000);
    return () => clearInterval(t);
  }, [tips.length, label]);

  const formatTime = (s) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div className={cn('bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3', className)}>
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary">{label || 'Working…'}</p>
          {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <Clock className="w-3 h-3" />
          <span>{formatTime(elapsed)}</span>
          {totalSteps > 1 && <span className="ml-2 font-medium">{step}/{totalSteps}</span>}
        </div>
      </div>

      {totalSteps > 1 ? (
        <div className="w-full bg-primary/10 rounded-full h-1.5">
          <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${(step / totalSteps) * 100}%` }} />
        </div>
      ) : (
        <div className="w-full bg-primary/10 rounded-full h-1.5 overflow-hidden">
          <div className="h-full w-1/3 bg-primary rounded-full animate-pulse" />
        </div>
      )}

      {tips.length > 0 && (
        <div className="text-xs text-muted-foreground bg-white/60 rounded-lg px-3 py-2 border border-primary/10 flex items-start gap-2">
          <span className="font-semibold text-primary mt-0.5 flex-shrink-0">💡</span>
          <span>{tips[tipIndex]}</span>
        </div>
      )}
    </div>
  );
}