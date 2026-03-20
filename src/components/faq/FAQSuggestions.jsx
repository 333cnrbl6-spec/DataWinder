const SUGGESTIONS = [
  "How do I search for a species?",
  "What climate datasets are available?",
  "How does MAXENT modelling work?",
  "What is the IUCN Red List?",
  "How do I export species data?",
  "What is a species distribution model?",
  "How do I prepare data for MAXENT?",
  "What SSP scenarios are supported?",
];

export default function FAQSuggestions({ onSelect }) {
  return (
    <div className="px-4 pb-3">
      <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Suggested questions</p>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-xs px-2.5 py-1 rounded-full bg-bangor-red/10 border border-bangor-red/20 text-bangor-red hover:bg-bangor-red hover:text-white transition-all duration-200"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}