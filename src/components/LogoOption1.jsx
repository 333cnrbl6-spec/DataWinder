import React from 'react';

// Modern Circular Badge with "B" monogram
export default function LogoOption1({ size = 'md' }) {
  const sizes = {
    sm: { container: 'h-12', text: 'text-lg', subtext: 'text-[8px]', badge: 48 },
    md: { container: 'h-16', text: 'text-2xl', subtext: 'text-[10px]', badge: 56 },
    lg: { container: 'h-20', text: 'text-3xl', subtext: 'text-xs', badge: 64 }
  };

  const s = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${s.container}`}>
      {/* Modern circular badge */}
      <div className="relative">
        <svg width={s.badge} height={s.badge} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer circle */}
          <circle cx="32" cy="32" r="30" fill="hsl(0, 100%, 47%)" />
          {/* Inner circle */}
          <circle cx="32" cy="32" r="24" fill="hsl(41, 97%, 53%)" />
          {/* "B" monogram */}
          <text x="32" y="40" fontSize="28" fontWeight="bold" fill="hsl(0, 100%, 47%)" textAnchor="middle" fontFamily="sans-serif">B</text>
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