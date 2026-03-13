import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { GitMerge } from 'lucide-react';

export default function SpatialThinningPanel({ value, onChange, stats }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">Spatial Thinning</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Removes clustered occurrence points within a minimum geographic distance to reduce
            spatial autocorrelation. Applied to MAXENT occurrence output only.
            Hill &amp; Winder (2019) used <strong>10 km</strong>.
          </p>
        </div>
        <Switch
          checked={value.enabled}
          onCheckedChange={enabled => onChange({ ...value, enabled })}
        />
      </div>

      {value.enabled && (
        <div className="pl-4 border-l-2 border-bangor-red/30 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-semibold text-slate-700 shrink-0">
              Minimum distance between points:
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={500}
                value={value.minDistanceKm}
                onChange={e => onChange({ ...value, minDistanceKm: Math.max(1, Number(e.target.value)) })}
                className="w-24"
              />
              <span className="text-sm text-slate-600">km</span>
            </div>
          </div>

          {stats.total > 0 && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-blue-500 shrink-0" />
              <span>
                Estimated MAXENT output: <strong>{stats.total - stats.removed}</strong> points retained,{' '}
                <strong>{stats.removed}</strong> removed from <strong>{stats.total}</strong> total across selected species.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}