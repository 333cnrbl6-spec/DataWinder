import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const DATA_PARTNERS = [
  'ESRI ArcGIS', 'MAXENT', 'R Project', 'IUCN Red List',
  'GBIF', 'iNaturalist', 'WorldClim', 'AquaMaps', 'eBird'
];

export default function Landing() {
  const [showTnC, setShowTnC] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [tncChecked, setTncChecked] = useState(false);

  const handleLoginClick = () => {
    setShowTnC(true);
  };

  const handleAccept = () => {
    if (!tncChecked) return;
    setAccepted(true);
    setShowTnC(false);
    base44.auth.redirectToLogin(window.location.origin + '/ResearcherDashboard');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0A1E3F 0%, #0d2a57 40%, #0A1E3F 100%)',
        fontFamily: "'Poppins', 'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* Background subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #007BFF 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Accent glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{ background: '#007BFF' }} />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl"
        style={{ background: '#FF7A00' }} />

      {/* ── Main card ── */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-10 flex flex-col items-center gap-6">

        {/* Logo block */}
        <div className="flex flex-col items-center gap-1">
          <img
            src="https://media.base44.com/images/public/69821d606837970a4a3c0ef2/85dd837e5_Copilot_20260529_104018.png"
            alt="DataWinder BETA"
            className="w-72 sm:w-96 object-contain drop-shadow-2xl"
            style={{ filter: 'drop-shadow(0 0 24px rgba(0,123,255,0.35))' }}
          />
          {/* Tagline */}
          <p
            className="text-sm sm:text-base font-medium tracking-widest uppercase mt-1"
            style={{
              color: '#E8F4FF',
              textShadow: '0 0 16px rgba(0,123,255,0.6)',
              letterSpacing: '0.18em',
            }}
          >
            Accelerating Insights. Driving Innovation.
          </p>
          {/* Sub-mark */}
          <div className="flex items-center gap-2 mt-1">
            <img
              src="https://media.base44.com/images/public/69821d606837970a4a3c0ef2/4f99679cb_synergyflow.png"
              alt="SynergyFlow Group"
              className="h-5 object-contain opacity-80"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <span className="text-white/60 text-xs font-light tracking-wider">
              Powered by SynergyFlow Group
            </span>
          </div>
        </div>

        {/* Welcome card */}
        <div
          className="w-full rounded-2xl p-6 sm:p-8 border border-white/10 backdrop-blur-sm"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <h1 className="text-white text-xl sm:text-2xl font-bold mb-3 text-center" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
            Welcome to DataWinder BETA
          </h1>
          <div className="space-y-3 text-white/80 text-sm leading-relaxed">
            <p>
              A test platform hosted on BASE44, forming part of a closed trial for invited researchers and collaborators —
              including members of the <span className="text-[#FF7A00] font-semibold">Primate Society of Great Britain</span> and{' '}
              <span className="text-[#FF7A00] font-semibold">Bangor University</span>.
            </p>
            <p>
              You now have <span className="text-white font-semibold">full access to all professional features for 14 days</span>.
              After the trial, verified undergraduate and postgraduate researchers retain full access for the duration of their research projects.
            </p>
            <p>
              A <span className="text-[#007BFF] font-semibold">Feedback Bot</span> and{' '}
              <span className="text-[#007BFF] font-semibold">Helper Bot</span> are available to assist with setup and troubleshooting.
              Please share your insights — your feedback shapes the next generation of{' '}
              <span className="text-white font-semibold">SynergySoft</span> tools.
            </p>
          </div>

          {/* Ecosystem pills */}
          <div className="flex flex-wrap gap-2 mt-5 justify-center">
            {['Premiso', 'NightDesk', 'Green‑Win‑Path', 'DataWinder'].map(name => (
              <span
                key={name}
                className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  color: name === 'DataWinder' ? '#FF7A00' : '#E8F4FF',
                  borderColor: name === 'DataWinder' ? '#FF7A00' : 'rgba(255,255,255,0.2)',
                  background: name === 'DataWinder' ? 'rgba(255,122,0,0.12)' : 'rgba(255,255,255,0.06)',
                }}
              >
                {name}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={handleLoginClick}
              className="w-full sm:w-auto px-10 py-3.5 rounded-xl text-white font-bold text-base tracking-wide transition-all duration-200 hover:scale-105 hover:shadow-2xl active:scale-95"
              style={{
                background: 'linear-gradient(90deg, #007BFF 0%, #0056CC 100%)',
                boxShadow: '0 4px 24px rgba(0,123,255,0.45)',
              }}
            >
              VIEW Terms and Conditions →
            </button>
          </div>
        </div>

        {/* Data partners strip */}
        <div className="w-full rounded-xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-white/40 text-xs text-center mb-3 uppercase tracking-widest font-medium">Data & Research Partners</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {DATA_PARTNERS.map(p => (
              <span key={p} className="px-2.5 py-1 rounded-full text-xs text-white/60 border border-white/10 bg-white/5">
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Credits */}
        <p className="text-white/30 text-xs text-center leading-relaxed max-w-lg">
          DataWinder acknowledges the generous support and open-data access provided by ESRI ArcGIS, MAXENT, R Project for Statistical Computing,
          IUCN Red List, GBIF, iNaturalist, WorldClim, AquaMaps, and eBird.
          Their contributions enable the scientific and conservation research community to accelerate insight and innovation.
        </p>

        {/* Footer */}
        <p className="text-white/20 text-xs text-center">
          © {new Date().getFullYear()} SynergyFlow Group · DataWinder BETA · BASE44 Platform
        </p>
      </div>

      {/* ── T&C Modal ── */}
      {showTnC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(10,30,63,0.92)', backdropFilter: 'blur(8px)' }}>
          <div
            className="w-full max-w-xl rounded-2xl p-6 sm:p-8 border border-white/15 shadow-2xl overflow-y-auto max-h-[90vh]"
            style={{ background: '#0d2a57', fontFamily: "'Poppins','Inter','Segoe UI',sans-serif" }}
          >
            {/* Modal logo */}
            <div className="flex justify-center mb-4">
              <img
                src="https://media.base44.com/images/public/69821d606837970a4a3c0ef2/85dd837e5_Copilot_20260529_104018.png"
                alt="DataWinder BETA"
                className="h-14 object-contain"
                style={{ filter: 'drop-shadow(0 0 12px rgba(0,123,255,0.4))' }}
              />
            </div>

            <h2 className="text-white text-lg font-bold text-center mb-1">Terms & Conditions</h2>
            <p className="text-white/50 text-xs text-center mb-5">Please read and accept before continuing</p>

            <div className="space-y-4 text-white/75 text-sm leading-relaxed">
              <div className="rounded-lg p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <h3 className="text-[#007BFF] font-semibold text-xs uppercase tracking-wider mb-2">BETA Environment</h3>
                <p>
                  By using DataWinder, you acknowledge that this is a <strong className="text-white">BETA test environment</strong> hosted on the BASE44 platform.
                  Availability and support are not guaranteed, and <strong className="text-white">SynergyFlow Group accepts no liability</strong> for data loss or service interruption.
                </p>
              </div>

              <div className="rounded-lg p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <h3 className="text-[#007BFF] font-semibold text-xs uppercase tracking-wider mb-2">Integrated Platforms & Data Providers</h3>
                <p className="mb-2">
                  You also agree to the terms of use of the following integrated research platforms and data providers:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DATA_PARTNERS.map(p => (
                    <span key={p} className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: 'rgba(0,123,255,0.15)', color: '#90C4FF', border: '1px solid rgba(0,123,255,0.25)' }}>
                      {p}
                    </span>
                  ))}
                </div>
                <p className="mt-3">
                  These partners permit <strong className="text-white">academic and non-commercial use</strong> of their software and datasets.
                  By continuing, you accept their respective terms either jointly or individually.
                </p>
              </div>

              <div className="rounded-lg p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <h3 className="text-[#FF7A00] font-semibold text-xs uppercase tracking-wider mb-2">Acknowledgements</h3>
                <p>
                  DataWinder acknowledges the generous support and open-data access provided by all integrated data partners.
                  Their contributions enable the scientific and conservation research community to accelerate insight and innovation.
                </p>
              </div>
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-3 mt-6 cursor-pointer group">
              <div
                onClick={() => setTncChecked(!tncChecked)}
                className="mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                style={{
                  borderColor: tncChecked ? '#007BFF' : 'rgba(255,255,255,0.3)',
                  background: tncChecked ? '#007BFF' : 'transparent',
                }}
              >
                {tncChecked && (
                  <svg viewBox="0 0 12 10" className="w-3 h-3" fill="none">
                    <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-white/70 text-sm leading-snug">
                I have read and accept the Terms & Conditions, including the terms of all integrated data providers listed above.
              </span>
            </label>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTnC(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={!tncChecked}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-all duration-200"
                style={{
                  background: tncChecked
                    ? 'linear-gradient(90deg, #007BFF 0%, #0056CC 100%)'
                    : 'rgba(255,255,255,0.1)',
                  color: tncChecked ? 'white' : 'rgba(255,255,255,0.3)',
                  cursor: tncChecked ? 'pointer' : 'not-allowed',
                  boxShadow: tncChecked ? '0 4px 16px rgba(0,123,255,0.4)' : 'none',
                }}
              >
                I Accept — Enter DataWinder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}