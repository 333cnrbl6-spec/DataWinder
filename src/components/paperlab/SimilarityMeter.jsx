import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

const PAPERS = [
  { key: 'hill_winder_2019', label: 'Hill & Winder (2019)', journal: 'J. Biogeography' },
  { key: 'rylands_2009', label: 'Rylands & Mittermeier (2009)', journal: 'New World Primates' },
  { key: 'zinner_2013', label: 'Zinner et al. (2013)', journal: 'Am. J. Phys. Anthro.' },
  { key: 'freitas_2019', label: 'Freitas et al. (2019)', journal: 'Am. J. Primatology' },
  { key: 'macarthur_wilson_1967', label: 'MacArthur & Wilson (1967)', journal: 'Island Biogeography (theory)' },
  { key: 'mallet_2007', label: 'Mallet (2007)', journal: 'Nature — Hybrid Speciation' },
  { key: 'arnold_reticulate', label: 'Arnold (1997) / Fontaine et al. (2015)', journal: 'Reticulate Evolution' },
];

function Band({ pct }) {
  if (pct <= 15) return { color: 'bg-green-500', label: 'Low', icon: CheckCircle2, textColor: 'text-green-700' };
  if (pct <= 25) return { color: 'bg-amber-400', label: 'Moderate', icon: AlertTriangle, textColor: 'text-amber-700' };
  return { color: 'bg-red-500', label: 'High', icon: ShieldAlert, textColor: 'text-red-700' };
}

export default function SimilarityMeter({ scores }) {
  if (!scores) return null;
  const overall = scores.overall ?? 0;
  const band = Band(overall);
  const Icon = band.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 text-sm">Plagiarism / Similarity Check</h3>
        <div className={`flex items-center gap-1.5 text-xs font-bold ${band.textColor}`}>
          <Icon className="w-4 h-4" />
          Overall: {overall}% — {band.label}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Similarity is calculated using n-gram lexical overlap against 7 benchmark papers/theories including Island Biogeography, Hybrid Speciation, and Reticulate Evolution frameworks.
        Academic papers typically share 5–25% vocabulary with related works. &gt;30% warrants review.
      </p>
      <div className="space-y-3">
        {PAPERS.map(p => {
          const pct = scores[p.key] ?? 0;
          const b = Band(pct);
          return (
            <div key={p.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">{p.label}</span>
                <span className={`font-bold ${b.textColor}`}>{pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${b.color}`}
                  style={{ width: `${Math.min(pct * 4, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 italic">{p.journal}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}