import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, X, FlaskConical, CheckCircle2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function MethodologyAnalyser({ paper, onClose }) {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);

    const run = async () => {
        setLoading(true);
        try {
            const prompt = `You are an expert in Species Distribution Modelling (SDM) and ecological informatics.

Analyse the following research paper and assess how closely its methodology could be replicated using:
- MAXENT modelling
- WorldClim / CHELSA bioclimatic variables
- GBIF / iNaturalist occurrence data
- IUCN range data

Paper title: "${paper.title}"
Authors: ${paper.authors?.map(a => `${a.first_name} ${a.last_name}`).join(', ') || 'Unknown'}
Year: ${paper.year || 'Unknown'}
Journal: ${paper.source || 'Unknown'}
Abstract: ${paper.abstract || 'Not available'}
Keywords: ${paper.keywords?.join(', ') || 'None'}

Please provide:
1. **Methodology Summary** - What SDM approach did this paper use?
2. **Replicability Score** - Rate 1-10 how replicable this is with our toolset
3. **Data Requirements** - What occurrence data, climate layers, and spatial resolution are needed?
4. **MAXENT Compatibility** - Is MAXENT suitable for this approach? Why/why not?
5. **Gaps & Challenges** - What aspects can't be replicated and why?
6. **Recommended Next Steps** - Concrete steps to attempt replication in DataWinder

Be specific, scientific, and practical.`;

            const result = await base44.integrations.Core.InvokeLLM({ prompt });
            setAnalysis(result);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-bangor-red/10 rounded-lg flex items-center justify-center">
                            <FlaskConical className="w-5 h-5 text-bangor-red" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-800 text-sm">AI Replication Analyser</h2>
                            <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">{paper.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!analysis && !loading && (
                        <div className="flex flex-col items-center gap-4 py-8 text-center">
                            <FlaskConical className="w-12 h-12 text-slate-300" />
                            <div>
                                <p className="text-slate-700 font-medium">Analyse this paper's methodology</p>
                                <p className="text-slate-500 text-sm mt-1">The AI will assess replicability using MAXENT, WorldClim, GBIF, and IUCN data.</p>
                            </div>
                            <button
                                onClick={run}
                                className="bg-bangor-red text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                            >
                                Run Analysis
                            </button>
                        </div>
                    )}
                    {loading && (
                        <div className="flex flex-col items-center gap-3 py-12">
                            <Loader2 className="w-8 h-8 text-bangor-red animate-spin" />
                            <p className="text-slate-500 text-sm">Analysing methodology…</p>
                        </div>
                    )}
                    {analysis && (
                        <div className="prose prose-sm prose-slate max-w-none">
                            <ReactMarkdown>{analysis}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {analysis && (
                    <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
                        <button onClick={() => setAnalysis(null)} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                            Re-analyse
                        </button>
                        <button onClick={onClose} className="text-sm bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}