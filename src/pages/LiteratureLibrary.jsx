import { BookOpen } from 'lucide-react';
import PaperUploader from '@/components/literature/PaperUploader';

export default function LiteratureLibrary() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-5">
                <div className="max-w-3xl mx-auto flex items-center gap-3">
                    <div className="w-9 h-9 bg-bangor-red rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">Literature Library</h1>
                        <p className="text-xs text-slate-400">Upload a research paper PDF — AI extracts methods, results, species & variables</p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-8">
                <PaperUploader />
            </div>
        </div>
    );
}