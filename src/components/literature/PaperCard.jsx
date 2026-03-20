import { ExternalLink, BookOpen, Calendar, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PaperCard({ paper, onAnalyse }) {
    const authors = paper.authors?.slice(0, 3).map(a => `${a.first_name || ''} ${a.last_name || ''}`.trim()).join(', ');
    const moreAuthors = paper.authors?.length > 3 ? ` +${paper.authors.length - 3} more` : '';
    const year = paper.year;
    const journal = paper.source || paper.publisher;
    const doi = paper.identifiers?.doi;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-3">{paper.title}</h3>
                {paper.type && (
                    <Badge variant="outline" className="shrink-0 text-xs capitalize">{paper.type}</Badge>
                )}
            </div>

            {(authors) && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span className="line-clamp-1">{authors}{moreAuthors}</span>
                </div>
            )}

            <div className="flex items-center gap-3 text-xs text-slate-500">
                {year && (
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{year}</span>
                    </div>
                )}
                {journal && (
                    <div className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="line-clamp-1">{journal}</span>
                    </div>
                )}
            </div>

            {paper.abstract && (
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{paper.abstract}</p>
            )}

            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-100">
                {doi && (
                    <a
                        href={`https://doi.org/${doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-bangor-red hover:underline"
                    >
                        <ExternalLink className="w-3 h-3" />
                        DOI
                    </a>
                )}
                <button
                    onClick={() => onAnalyse(paper)}
                    className="ml-auto text-xs bg-bangor-red text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                    Analyse Methodology
                </button>
            </div>
        </div>
    );
}