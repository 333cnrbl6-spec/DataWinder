import React from 'react';
import { cn } from "@/lib/utils";

const statusConfig = {
  LC: { label: "Least Concern", color: "bg-emerald-500", textColor: "text-emerald-50" },
  NT: { label: "Near Threatened", color: "bg-lime-500", textColor: "text-lime-50" },
  VU: { label: "Vulnerable", color: "bg-amber-500", textColor: "text-amber-50" },
  EN: { label: "Endangered", color: "bg-orange-500", textColor: "text-orange-50" },
  CR: { label: "Critically Endangered", color: "bg-red-600", textColor: "text-red-50" },
  EW: { label: "Extinct in Wild", color: "bg-purple-600", textColor: "text-purple-50" },
  EX: { label: "Extinct", color: "bg-slate-800", textColor: "text-slate-50" },
  DD: { label: "Data Deficient", color: "bg-slate-400", textColor: "text-slate-50" },
  NE: { label: "Not Evaluated", color: "bg-slate-300", textColor: "text-slate-700" }
};

export default function StatusBadge({ status, showLabel = false, size = "md" }) {
  const config = statusConfig[status] || statusConfig.NE;
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5"
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-semibold rounded-full",
      config.color,
      config.textColor,
      sizeClasses[size]
    )}>
      <span>{status}</span>
      {showLabel && <span className="font-normal">· {config.label}</span>}
    </span>
  );
}

export { statusConfig };