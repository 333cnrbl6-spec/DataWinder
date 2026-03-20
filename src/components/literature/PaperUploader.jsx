import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, FileText, Loader2, CheckCircle2, X, FlaskConical, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function PaperUploader({ onProcessed }) {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [expandedSection, setExpandedSection] = useState('results');
    const fileRef = useRef();

    const processFile = async (file) => {
        if (!file || file.type !== 'application/pdf') {
            setError('Please upload a PDF file.');
            return;
        }
        setError(null);
        setResult(null);

        try {
            setUploading(true);
            const { file_url } = await base44.integrations.Core.UploadFile({ file });

            setUploading(false);
            setProcessing(true);

            const response = await base44.functions.invoke('processPaperContent', {
                file_url,
                title: file.name.replace('.pdf', '').replace(/_/g, ' ')
            });

            setResult(response.data);
            if (onProcessed) onProcessed(response.data);
        } catch (err) {
            setError(err.message || 'Processing failed.');
        } finally {
            setUploading(false);
            setProcessing(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const scoreColor = (score) => {
        if (score >= 8) return 'text-green-600 bg-green-50 border-green-200';
        if (score >= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const Section = ({ id, label, children }) => (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setExpandedSection(expandedSection === id ? null : id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                {expandedSection === id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {expandedSection === id && (
                <div className="p-4 text-sm text-slate-600 leading-relaxed">
                    {children}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Drop zone */}
            {!result && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                        dragging ? 'border-bangor-red bg-bangor-red/5' : 'border-slate-300 hover:border-bangor-red hover:bg-slate-50'
                    }`}
                >
                    <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => processFile(e.target.files[0])} />
                    {uploading ? (
                        <>
                            <Loader2 className="w-10 h-10 text-bangor-red animate-spin mb-3" />
                            <p className="text-sm font-medium text-slate-700">Uploading PDF…</p>
                        </>
                    ) : processing ? (
                        <>
                            <FlaskConical className="w-10 h-10 text-bangor-red animate-pulse mb-3" />
                            <p className="text-sm font-medium text-slate-700">Extracting methods & results…</p>
                            <p className="text-xs text-slate-400 mt-1">This may take 15–30 seconds</p>
                        </>
                    ) : (
                        <>
                            <Upload className="w-10 h-10 text-slate-300 mb-3" />
                            <p className="text-sm font-semibold text-slate-700">Drop a PDF here or click to browse</p>
                            <p className="text-xs text-slate-400 mt-1">AI will extract methods, results, species, and variables</p>
                        </>
                    )}
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <X className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                <h3 className="text-sm font-bold text-slate-800 line-clamp-2">{result.title}</h3>
                                {result.paper_type && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-bangor-red/10 text-bangor-red rounded-full">{result.paper_type}</span>
                                )}
                            </div>
                            {(result.authors || result.year || result.journal) && (
                                <p className="text-xs text-slate-500 mt-1">{[result.authors, result.year, result.journal].filter(Boolean).join(' · ')}</p>
                            )}
                        </div>
                        {result.replicability_score && (
                            <div className={`shrink-0 px-3 py-2 rounded-xl border text-center ${scoreColor(result.replicability_score)}`}>
                                <div className="text-xl font-bold">{result.replicability_score}/10</div>
                                <div className="text-xs font-medium">Replicability</div>
                            </div>
                        )}
                    </div>

                    {/* Sections */}
                    <Section id="results" label="📊 Key Results">
                        <p className="whitespace-pre-wrap">{result.key_results}</p>
                    </Section>

                    <Section id="methods" label="🔬 Methods Summary">
                        <p className="whitespace-pre-wrap">{result.methods_summary}</p>
                    </Section>

                    <Section id="species" label={`🦎 Species Studied (${result.species_studied?.length || 0})`}>
                        {result.species_studied?.length > 0 ? (
                            <ul className="space-y-1">
                                {result.species_studied.map((s, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <span className="italic text-slate-800">{s.scientific_name}</span>
                                        {s.common_name && <span className="text-slate-500">— {s.common_name}</span>}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-slate-400 italic">None identified</p>}
                    </Section>

                    <Section id="variables" label="🌡️ Climate Variables & Data Sources">
                        {result.climate_variables?.length > 0 && (
                            <div className="mb-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Climate Variables</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {result.climate_variables.map((v, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs">{v}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {result.occurrence_sources?.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Occurrence Data</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {result.occurrence_sources.map((s, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded text-xs">{s}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Section>

                    <Section id="replication" label="🔁 Replication Steps in DataWinder">
                        {result.replication_steps?.length > 0 ? (
                            <ol className="space-y-2 list-none">
                                {result.replication_steps.map((step, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="shrink-0 w-5 h-5 bg-bangor-red text-white rounded-full text-xs flex items-center justify-center font-bold">{i + 1}</span>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ol>
                        ) : <p className="text-slate-400 italic">No steps extracted</p>}
                    </Section>

                    <Section id="limitations" label="⚠️ Limitations">
                        <p className="whitespace-pre-wrap">{result.key_limitations || 'None stated'}</p>
                    </Section>

                    <button
                        onClick={() => { setResult(null); setError(null); }}
                        className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Process another paper
                    </button>
                </div>
            )}
        </div>
    );
}