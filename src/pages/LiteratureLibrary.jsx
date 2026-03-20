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
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-5">
                <div className="max-w-6xl mx-auto flex items-center gap-3">
                    <div className="w-9 h-9 bg-bangor-red rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">Literature Library</h1>
                        <p className="text-xs text-slate-400">Coming soon — Research paper integration</p>
                    </div>
                </div>
            </div>

            {/* Coming Soon */}
            <div className="max-w-6xl mx-auto px-6 py-24 flex flex-col items-center justify-center text-center gap-6">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-slate-300" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-700">Literature Library Coming Soon</h2>
                    <p className="text-slate-500 mt-3 max-w-md">Mendeley integration for searching and analyzing scientific papers related to species distribution modelling is in development.</p>
                </div>
                <div className="mt-4 px-6 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    Check back soon for full literature search and analysis capabilities.
                </div>
            </div>
        </div>
    );
}