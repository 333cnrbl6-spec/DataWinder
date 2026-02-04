import React from 'react';

// Leaf & Data Combination (Nature meets Data)
export default function LogoOption3({ size = 'md' }) {
  const sizes = {
    sm: { container: 'h-12', text: 'text-lg', subtext: 'text-[8px]', badge: 48 },
    md: { container: 'h-16', text: 'text-2xl', subtext: 'text-[10px]', badge: 56 },
    lg: { container: 'h-20', text: 'text-3xl', subtext: 'text-xs', badge: 64 }
  };

  const s = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${s.container}`}>
      {/* Leaf with circuit pattern */}
      <div className="relative">
        <svg width={s.badge} height={s.badge} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Circular background */}
          <circle cx="32" cy="32" r="28" fill="hsl(41, 97%, 53%)" />
          {/* Leaf shape */}
          <path 
            d="M32 10 Q45 20 45 32 Q45 44 32 54 Q19 44 19 32 Q19 20 32 10 Z" 
            fill="hsl(0, 100%, 47%)"
          />
          {/* Circuit lines */}
          <path d="M28 25 L28 32 L32 32" stroke="hsl(41, 97%, 53%)" strokeWidth="2" strokeLinecap="round" />
          <path d="M36 25 L36 32 L32 32" stroke="hsl(41, 97%, 53%)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="28" cy="25" r="2" fill="hsl(41, 97%, 53%)" />
          <circle cx="36" cy="25" r="2" fill="hsl(41, 97%, 53%)" />
          <circle cx="32" cy="32" r="2.5" fill="hsl(41, 97%, 53%)" />
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