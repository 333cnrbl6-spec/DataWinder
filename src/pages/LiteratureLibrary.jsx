import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, BookOpen, Library, LogIn, Loader2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PaperCard from '@/components/literature/PaperCard';
import MethodologyAnalyser from '@/components/literature/MethodologyAnalyser';

function getMendeleyToken() {
    const token = localStorage.getItem('mendeley_access_token');
    const expiry = parseInt(localStorage.getItem('mendeley_token_expiry') || '0');
    if (token && Date.now() < expiry) return token;
    return null;
}

export default function LiteratureLibrary() {
    const [token, setToken] = useState(getMendeleyToken());
    const [tab, setTab] = useState('search'); // 'search' | 'library'
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [selectedPaper, setSelectedPaper] = useState(null);

    const isConnected = !!token;

    const connect = async () => {
        const res = await base44.functions.invoke('mendeleyAuth', { action: 'get_auth_url' });
        window.location.href = res.data.url;
    };

    const search = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const res = await base44.functions.invoke('mendeleyAuth', {
                action: 'search_papers', query, token, limit: 20, offset: 0
            });
            setResults(res.data.results || []);
            setTotal(res.data.total || 0);
        } finally {
            setLoading(false);
        }
    };

    const loadLibrary = async () => {
        setLoading(true);
        try {
            const res = await base44.functions.invoke('mendeleyAuth', {
                action: 'get_library', token, limit: 50, offset: 0
            });
            setResults(res.data.results || []);
            setTotal(res.data.total || 0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isConnected && tab === 'library') loadLibrary();
        if (isConnected && tab === 'search') setResults([]);
    }, [tab, isConnected]);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-5">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-bangor-red rounded-lg flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800">Literature Library</h1>
                            <p className="text-xs text-slate-500">Mendeley integration for SDM research</p>
                        </div>
                    </div>
                    {isConnected ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-full border border-green-200">● Connected to Mendeley</span>
                        </div>
                    ) : (
                        <Button onClick={connect} className="bg-bangor-red hover:opacity-90 text-white gap-2">
                            <LogIn className="w-4 h-4" />
                            Connect Mendeley
                        </Button>
                    )}
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <Library className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-700">Connect your Mendeley account</h2>
                            <p className="text-slate-500 mt-2 max-w-md">Search the Mendeley catalogue and access your personal library to find and analyse SDM papers.</p>
                        </div>
                        <Button onClick={connect} size="lg" className="bg-bangor-red hover:opacity-90 text-white gap-2">
                            <LogIn className="w-4 h-4" />
                            Connect Mendeley
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
                            {['search', 'library'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t === 'library' ? 'My Library' : 'Search Catalogue'}
                                </button>
                            ))}
                        </div>

                        {/* Search bar */}
                        {tab === 'search' && (
                            <div className="flex gap-3 mb-6">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        className="pl-10"
                                        placeholder="Search papers, e.g. MaxEnt species distribution modelling…"
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && search()}
                                    />
                                </div>
                                <Button onClick={search} className="bg-bangor-red hover:opacity-90 text-white">Search</Button>
                            </div>
                        )}

                        {tab === 'library' && (
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-sm text-slate-500">{total} documents in your library</p>
                                <Button variant="outline" size="sm" onClick={loadLibrary} className="gap-2">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Refresh
                                </Button>
                            </div>
                        )}

                        {/* Results */}
                        {loading ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="w-8 h-8 text-bangor-red animate-spin" />
                            </div>
                        ) : results.length > 0 ? (
                            <>
                                {tab === 'search' && <p className="text-xs text-slate-400 mb-4">{total} results found</p>}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {results.map(paper => (
                                        <PaperCard key={paper.id} paper={paper} onAnalyse={setSelectedPaper} />
                                    ))}
                                </div>
                            </>
                        ) : (
                            tab === 'search' && query === '' ? (
                                <div className="text-center py-16 text-slate-400">
                                    <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                    <p>Search the Mendeley catalogue above</p>
                                </div>
                            ) : (
                                <div className="text-center py-16 text-slate-400">
                                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                    <p>No results found</p>
                                </div>
                            )
                        )}
                    </>
                )}
            </div>

            {selectedPaper && (
                <MethodologyAnalyser paper={selectedPaper} onClose={() => setSelectedPaper(null)} />
            )}
        </div>
    );
}