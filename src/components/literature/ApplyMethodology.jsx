import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, CheckCircle2, Loader2, ChevronDown, ChevronUp, Settings, Play } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function ApplyMethodology({ paper, onClose, onApplied }) {
    const [selectedSpecies, setSelectedSpecies] = useState(
        (paper.species_studied || []).map(s => s.scientific_name)
    );
    const [selectedVariables, setSelectedVariables] = useState(
        (paper.climate_variables || [])
    );
    const [selectedSources, setSelectedSources] = useState(
        (paper.occurrence_sources || [])
    );
    const [expandedSection, setExpandedSection] = useState('species');
    const [submitting, setSubmitting] = useState(false);
    const [runName, setRunName] = useState(`${paper.paper_type || 'Paper'} Replication - ${new Date().getFullYear()}`);

    const allVariables = [
        'Bio1', 'Bio2', 'Bio3', 'Bio4', 'Bio5', 'Bio6', 'Bio7', 'Bio8', 'Bio9', 'Bio10',
        'Bio11', 'Bio12', 'Bio13', 'Bio14', 'Bio15', 'Bio16', 'Bio17', 'Bio18', 'Bio19', 'Altitude'
    ];

    const allSources = ['GBIF', 'iNaturalist', 'Museum Collection', 'Published', 'Field Survey'];

    const toggleSpecies = (name) => {
        setSelectedSpecies(prev =>
            prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
        );
    };

    const toggleVariable = (name) => {
        setSelectedVariables(prev =>
            prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]
        );
    };

    const toggleSource = (name) => {
        setSelectedSources(prev =>
            prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
        );
    };

    const handleApply = async () => {
        if (selectedSpecies.length === 0) {
            alert('Please select at least one species');
            return;
        }

        setSubmitting(true);
        try {
            const projectData = {
                name: runName,
                description: `Replication of methodology from: ${paper.title}`,
                research_area: paper.title,
                tags: ['literature-driven', paper.paper_type || 'research'],
                notes: `Replicating: ${paper.title}\nReplicability Score: ${paper.replicability_score}/10\nVariables: ${selectedVariables.join(', ')}\nOccurrence Sources: ${selectedSources.join(', ')}`
            };

            const project = await base44.entities.Project.create(projectData);

            // Create MaxEnt runs for each species
            const runs = await Promise.all(
                selectedSpecies.map(species =>
                    base44.entities.MaxentRun.create({
                        name: `${species} - ${paper.paper_type || 'Replicate'}`,
                        species_name: species,
                        climate_dataset_names: selectedVariables,
                        parameters: {
                            occurrence_sources: selectedSources,
                            replicability_source: paper.title,
                            replicability_score: paper.replicability_score
                        },
                        notes: `Based on: ${paper.title}`
                    })
                )
            );

            onApplied?.({
                project,
                runs,
                methodology: {
                    paper_title: paper.title,
                    variables: selectedVariables,
                    sources: selectedSources,
                    species: selectedSpecies
                }
            });

            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    const Section = ({ id, label, count, children }) => (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setExpandedSection(expandedSection === id ? null : id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
                <span className="text-sm font-semibold text-slate-700">
                    {label}
                    {count !== undefined && <span className="ml-2 text-xs text-slate-500">({count} selected)</span>}
                </span>
                {expandedSection === id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {expandedSection === id && (
                <div className="p-4">
                    {children}
                </div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-bangor-red/10 rounded-lg flex items-center justify-center">
                            <Settings className="w-5 h-5 text-bangor-red" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-800 text-sm">Apply Paper Methodology</h2>
                            <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">{paper.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {/* Run name */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <label className="text-xs font-semibold text-slate-600 uppercase block mb-2">Project Name</label>
                        <input
                            type="text"
                            value={runName}
                            onChange={(e) => setRunName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bangor-red"
                        />
                    </div>

                    {/* Species */}
                    <Section
                        id="species"
                        label="🦎 Select Species to Model"
                        count={selectedSpecies.length}
                    >
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {(paper.species_studied || []).map((species, i) => (
                                <label key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                    <Checkbox
                                        checked={selectedSpecies.includes(species.scientific_name)}
                                        onChange={() => toggleSpecies(species.scientific_name)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-slate-700 italic">{species.scientific_name}</div>
                                        {species.common_name && <div className="text-xs text-slate-500">{species.common_name}</div>}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </Section>

                    {/* Climate Variables */}
                    <Section
                        id="variables"
                        label="🌡️ Climate Variables"
                        count={selectedVariables.length}
                    >
                        <div className="space-y-2">
                            <p className="text-xs text-slate-500 mb-3">
                                Paper extracted: {(paper.climate_variables || []).join(', ') || 'None specified'}
                            </p>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                {allVariables.map((v) => (
                                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                            checked={selectedVariables.includes(v)}
                                            onChange={() => toggleVariable(v)}
                                        />
                                        <span className="text-sm text-slate-700">{v}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </Section>

                    {/* Occurrence Sources */}
                    <Section
                        id="sources"
                        label="📍 Occurrence Data Sources"
                        count={selectedSources.length}
                    >
                        <div className="space-y-2">
                            <p className="text-xs text-slate-500 mb-3">
                                Paper extracted: {(paper.occurrence_sources || []).join(', ') || 'None specified'}
                            </p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                {allSources.map((s) => (
                                    <label key={s} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                        <Checkbox
                                            checked={selectedSources.includes(s)}
                                            onChange={() => toggleSource(s)}
                                        />
                                        <span className="text-sm text-slate-700">{s}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </Section>

                    {/* Replicability note */}
                    {paper.replicability_score && (
                        <div className={`p-3 rounded-lg border text-xs ${
                            paper.replicability_score >= 8 ? 'bg-green-50 border-green-200 text-green-700' :
                            paper.replicability_score >= 5 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                            'bg-red-50 border-red-200 text-red-700'
                        }`}>
                            <p className="font-medium">Replicability Score: {paper.replicability_score}/10</p>
                            <p className="mt-1">
                                {paper.replicability_score >= 8 && '✓ Highly replicable with this toolset.'}
                                {paper.replicability_score < 8 && paper.replicability_score >= 5 && '⚠ Moderately replicable; some adjustments may be needed.'}
                                {paper.replicability_score < 5 && '✗ Limited replicability with current tools; significant adaptations required.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="text-sm text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={submitting || selectedSpecies.length === 0}
                        className="text-sm bg-bangor-red text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Creating project…
                            </>
                        ) : (
                            <>
                                <Play className="w-3.5 h-3.5" />
                                Create Project & Runs
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}