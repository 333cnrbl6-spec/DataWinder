import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle, Search, Info } from 'lucide-react';
import StatusBadge from '@/components/species/StatusBadge';

function OccurrenceQuality({ count }) {
  if (count >= 50) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
      <CheckCircle className="w-3 h-3" /> {count} records — Good
    </span>
  );
  if (count >= 10) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
      <AlertTriangle className="w-3 h-3" /> {count} records — Moderate
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
      <AlertTriangle className="w-3 h-3" /> {count} records — Low (≥10 recommended)
    </span>
  );
}

// selectedSpecies is now an array; onSelect toggles a species in/out
export default function SpeciesSelector({ selectedSpecies = [], onSelect }) {
  const [search, setSearch] = useState('');

  const { data: allSpecies = [], isLoading } = useQuery({
    queryKey: ['allSpecies'],
    queryFn: () => base44.entities.Species.list('-created_date', 10000),
  });

  const withOccurrences = allSpecies.filter(sp =>
    (sp.observations?.length || 0) + (sp.gbif_occurrences?.length || 0) > 0
  );

  const filtered = withOccurrences.filter(sp =>
    !search ||
    sp.scientific_name?.toLowerCase().includes(search.toLowerCase()) ||
    sp.common_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getCount = (sp) =>
    (sp.observations?.length || 0) + (sp.gbif_occurrences?.length || 0);

  const selectedIds = new Set(selectedSpecies.map(s => s.id));

  const toggleSpecies = (sp) => {
    if (selectedIds.has(sp.id)) {
      onSelect(selectedSpecies.filter(s => s.id !== sp.id));
    } else {
      onSelect([...selectedSpecies, sp]);
    }
  };

  const totalOccurrences = selectedSpecies.reduce((sum, sp) => sum + getCount(sp), 0);

  return (
    <Card className="shadow-lg border-slate-200">
      <CardHeader className="bg-gradient-to-r from-bangor-red/8 to-bangor-sun/8 border-b border-slate-200">
        <CardTitle className="text-bangor-red text-lg">Select Species</CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Choose one or more species to model. Only species with occurrence records are shown.
          MAXENT needs at least 10 records per species — 50+ is ideal.
        </p>
      </CardHeader>
      <CardContent className="p-6">

        {/* Tip */}
        <div className="mb-4 flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
          <span>
            <strong>No species shown?</strong> Go to the Species Search page to find and save species data first.
            Then come back here and they'll appear below.
          </span>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by scientific or common name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 border-slate-200"
          />
        </div>

        {isLoading && (
          <div className="text-center py-10 text-slate-400 text-sm">Loading species…</div>
        )}

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-14 text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="font-semibold">No matching species found.</p>
              <p className="text-xs mt-1">Try a different search term, or add species data from the Search page.</p>
            </div>
          )}

          {filtered.map(sp => {
            const count = getCount(sp);
            const isSelected = selectedIds.has(sp.id);
            return (
              <button
                key={sp.id}
                onClick={() => toggleSpecies(sp)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                  isSelected
                    ? 'border-bangor-red bg-bangor-red/5 shadow-md'
                    : 'border-slate-200 hover:border-bangor-red/40 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold italic text-slate-900 truncate text-sm">{sp.scientific_name}</div>
                    {sp.common_name && (
                      <div className="text-xs text-slate-500 mt-0.5">{sp.common_name}</div>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <StatusBadge status={sp.iucn_status} size="sm" />
                      <OccurrenceQuality count={count} />
                    </div>
                  </div>
                  {isSelected && <CheckCircle className="w-5 h-5 text-bangor-red shrink-0 mt-0.5" />}
                </div>
              </button>
            );
          })}
        </div>

        {selectedSpecies.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
            <p className="text-sm font-semibold text-green-800">
              ✓ {selectedSpecies.length} species selected — {totalOccurrences} total occurrence records
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedSpecies.map(sp => (
                <span key={sp.id} className="inline-flex items-center gap-1 bg-white border border-green-300 rounded-lg px-2 py-0.5 text-xs font-medium text-green-800">
                  <em>{sp.scientific_name}</em>
                  <button onClick={(e) => { e.stopPropagation(); toggleSpecies(sp); }} className="ml-0.5 text-green-600 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}