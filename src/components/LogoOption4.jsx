import React from 'react';

// Minimalist "BO" Monogram in Square
export default function LogoOption4({ size = 'md' }) {
  const sizes = {
    sm: { container: 'h-12', text: 'text-lg', subtext: 'text-[8px]', badge: 48 },
    md: { container: 'h-16', text: 'text-2xl', subtext: 'text-[10px]', badge: 56 },
    lg: { container: 'h-20', text: 'text-3xl', subtext: 'text-xs', badge: 64 }
  };

  const s = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${s.container}`}>
      {/* Rounded square badge */}
      <div className="relative">
        <svg width={s.badge} height={s.badge} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer square */}
          <rect x="6" y="6" width="52" height="52" rx="8" fill="hsl(0, 100%, 47%)" />
          {/* Inner square */}
          <rect x="12" y="12" width="40" height="40" rx="6" fill="hsl(41, 97%, 53%)" />
          {/* "BO" text */}
          <text x="32" y="42" fontSize="24" fontWeight="800" fill="hsl(0, 100%, 47%)" textAnchor="middle" fontFamily="sans-serif">BO</text>
        </svg>
      </div>
      
      {/* Text */}
      <div className="flex flex-col">
        <div className={`font-bold tracking-tight leading-none ${s.text}`}>
          <span className="text-bangor-red">Bang</span>
          <span className="text-bangor-sun">On</span>
        </div>
        <div className={`font-semibold text-slate-700 tracking-wider uppercase ${s.subtext} -mt-0.5`}>
          The DataWinder
        </div>
      </div>
    </div>
  );
}