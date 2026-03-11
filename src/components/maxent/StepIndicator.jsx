import React from 'react';
import { Check } from 'lucide-react';

export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="mb-8 px-2">
      <div className="relative flex items-start justify-between">

        {/* Background line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-200" />

        {/* Progress line */}
        <div
          className="absolute top-5 left-5 h-0.5 bg-bangor-red transition-all duration-500 ease-out"
          style={{ width: `calc(${((currentStep - 1) / (steps.length - 1)) * 100}% - 0px)` }}
        />

        {steps.map((step) => {
          const isDone = step.id < currentStep;
          const isActive = step.id === currentStep;
          return (
            <div key={step.id} className="relative flex flex-col items-center gap-2 z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all duration-300 ${
                isDone
                  ? 'bg-bangor-red border-bangor-red text-white shadow-md'
                  : isActive
                  ? 'bg-white border-bangor-red text-bangor-red shadow-lg ring-4 ring-bangor-red/10'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                {isDone ? <Check className="w-5 h-5" /> : step.id}
              </div>
              <div className="text-center max-w-[80px]">
                <div className={`text-xs font-semibold leading-tight ${
                  isActive ? 'text-bangor-red' : isDone ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {step.label}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 hidden sm:block leading-tight">
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}