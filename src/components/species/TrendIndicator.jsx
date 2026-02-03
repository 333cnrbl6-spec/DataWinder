import React from 'react';
import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

const trendConfig = {
  increasing: { icon: TrendingUp, color: "text-emerald-600", label: "Increasing" },
  stable: { icon: Minus, color: "text-slate-500", label: "Stable" },
  decreasing: { icon: TrendingDown, color: "text-red-500", label: "Decreasing" },
  unknown: { icon: HelpCircle, color: "text-slate-400", label: "Unknown" }
};

export default function TrendIndicator({ trend, showLabel = false }) {
  const config = trendConfig[trend] || trendConfig.unknown;
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1", config.color)}>
      <Icon className="w-4 h-4" />
      {showLabel && <span className="text-sm">{config.label}</span>}
    </span>
  );
}