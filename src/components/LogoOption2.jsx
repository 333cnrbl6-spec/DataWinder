import React from 'react';

// Hexagon with Data Icon
export default function LogoOption2({ size = 'md' }) {
  const sizes = {
    sm: { container: 'h-12', text: 'text-lg', subtext: 'text-[8px]', badge: 48 },
    md: { container: 'h-16', text: 'text-2xl', subtext: 'text-[10px]', badge: 56 },
    lg: { container: 'h-20', text: 'text-3xl', subtext: 'text-xs', badge: 64 }
  };

  const s = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${s.container}`}>
      {/* Hexagon badge */}
      <div className="relative">
        <svg width={s.badge} height={s.badge} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Hexagon */}
          <path 
            d="M32 4 L54 16 L54 40 L32 52 L10 40 L10 16 Z" 
            fill="hsl(0, 100%, 47%)"
            stroke="hsl(41, 97%, 53%)"
            strokeWidth="3"
          />
          {/* Inner hexagon */}
          <path 
            d="M32 12 L46 20 L46 36 L32 44 L18 36 L18 20 Z" 
            fill="hsl(41, 97%, 53%)"
          />
          {/* Data bars icon */}
          <rect x="24" y="30" width="4" height="8" fill="hsl(0, 100%, 47%)" rx="1" />
          <rect x="30" y="24" width="4" height="14" fill="hsl(0, 100%, 47%)" rx="1" />
          <rect x="36" y="28" width="4" height="10" fill="hsl(0, 100%, 47%)" rx="1" />
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