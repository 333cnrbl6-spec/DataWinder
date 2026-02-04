import React from 'react';

export default function BangOnLogo({ size = 'md' }) {
  const sizes = {
    sm: { container: 'h-12', text: 'text-lg', subtext: 'text-[8px]' },
    md: { container: 'h-16', text: 'text-2xl', subtext: 'text-[10px]' },
    lg: { container: 'h-20', text: 'text-3xl', subtext: 'text-xs' }
  };

  const s = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${s.container}`}>
      {/* Crest-style badge */}
      <div className="relative">
        <svg width="60" height="70" viewBox="0 0 60 70" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shield shape */}
          <path 
            d="M30 2 L55 12 L55 35 Q55 50 30 65 Q5 50 5 35 L5 12 Z" 
            fill="hsl(0, 100%, 47%)"
            stroke="hsl(41, 97%, 53%)"
            strokeWidth="2"
          />
          {/* Inner decoration */}
          <path 
            d="M30 10 L48 18 L48 35 Q48 46 30 58 Q12 46 12 35 L12 18 Z" 
            fill="hsl(41, 97%, 53%)"
          />
          {/* Center emblem */}
          <circle cx="30" cy="32" r="12" fill="hsl(0, 100%, 47%)" />
          <path 
            d="M30 22 L34 30 L30 38 L26 30 Z" 
            fill="white"
          />
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