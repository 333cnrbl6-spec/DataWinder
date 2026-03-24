/**
 * SecureView — One-time paper viewer
 * Accessible via /SecureView?token=xxxx
 * Burns the token on first load. No copy, no print, no download.
 */

import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, ShieldCheck, ShieldX, Volume2, VolumeX, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SECTIONS = [
  ['abstract', 'Abstract'],
  ['introduction', '1. Introduction'],
  ['methods', '2. Materials & Methods'],
  ['results', '3. Results'],
  ['discussion', '4. Discussion'],
  ['conclusion', '5. Conclusion'],
  ['references', 'References'],
];

export default function SecureView() {
  const [status, setStatus] = useState('loading'); // loading | ok | burned | expired | error
  const [paper, setPaper] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) { setStatus('error'); setErrorMsg('No token in URL.'); return; }

    base44.functions.invoke('viewSecureShare', { token })
      .then(res => {
        setPaper(res.data);
        setStatus('ok');
      })
      .catch(err => {
        const msg = err?.response?.data?.error || err.message || 'Unknown error';
        if (msg.includes('already been viewed')) setStatus('burned');
        else if (msg.includes('expired')) setStatus('expired');
        else { setStatus('error'); setErrorMsg(msg); }
      });
  }, []);

  // Disable right-click and selection
  useEffect(() => {
    if (status !== 'ok') return;
    const noContext = e => e.preventDefault();
    document.addEventListener('contextmenu', noContext);
    return () => document.removeEventListener('contextmenu', noContext);
  }, [status]);

  const readAloud = () => {
    if (!paper) return;
    window.speechSynthesis.cancel();
    const fullText = SECTIONS
      .map(([key, label]) => `${label}. ${paper.paper_content?.[key] || ''}`)
      .join('. ');
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = 0.92;
    utterance.lang = 'en-GB';
    utterance.onend = () => setSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">Retrieving secure document…</p>
      </div>
    );
  }

  if (status === 'burned') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-red-50 p-8 text-center">
        <ShieldX className="w-14 h-14 text-red-400" />
        <h1 className="text-xl font-bold text-red-700">Link Expired</h1>
        <p className="text-sm text-red-600 max-w-md">
          This document has already been viewed once and the link is permanently destroyed.
          If you are the author, please generate a new share link from the Academic Paper Lab.
        </p>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-amber-50 p-8 text-center">
        <ShieldX className="w-14 h-14 text-amber-400" />
        <h1 className="text-xl font-bold text-amber-700">Link Has Expired</h1>
        <p className="text-sm text-amber-600 max-w-md">This share link exceeded its time limit and is no longer valid.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center">
        <ShieldX className="w-14 h-14 text-slate-400" />
        <h1 className="text-xl font-bold text-slate-700">Access Denied</h1>
        <p className="text-sm text-slate-500">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onCopy={e => e.preventDefault()}
      onCut={e => e.preventDefault()}
    >
      {/* Banner */}
      <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-800 font-semibold">
            ONE-TIME VIEW ONLY — This link is now permanently expired. Do not share the URL.
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          {!speaking ? (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={readAloud}>
              <Volume2 className="w-3.5 h-3.5" /> Read Aloud
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={stopReading}>
              <Square className="w-3.5 h-3.5" /> Stop
            </Button>
          )}
        </div>
      </div>

      {/* Paper */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-xs text-slate-400 mb-1 font-mono">PRIVATE DRAFT — AI-GENERATED — FOR EVALUATION ONLY</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1 leading-tight">{paper.paper_title}</h1>
        <div className="text-xs text-slate-400 mb-8">
          Shared by {paper.created_by} · Viewed {new Date(paper.viewed_at).toLocaleString('en-GB')} · IP: {paper.viewer_ip}
        </div>

        {SECTIONS.map(([key, label]) => (
          paper.paper_content?.[key] ? (
            <section key={key} className="mb-8">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">
                {label}
              </h2>
              {paper.paper_content[key].split('\n').map((para, i) =>
                para.trim() ? (
                  <p key={i} className="text-sm text-slate-700 leading-relaxed mb-3 text-justify">
                    {para}
                  </p>
                ) : null
              )}
            </section>
          ) : null
        ))}
      </div>
    </div>
  );
}