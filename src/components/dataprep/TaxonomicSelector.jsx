import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const groupKeyFor = (sp, groupBy) => {
  const map = { class: sp.class_name, order: sp.order_name, family: sp.family, genus: sp.genus };
  return map[groupBy] || 'Unknown';
};

export default function TaxonomicSelector({ species, selectedIds, onSelectionChange }) {
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [groupBy, setGroupBy] = useState('family');

  const filtered = useMemo(() => {
    if (!search) return species;
    const s = search.toLowerCase();
    return species.filter(sp =>
      sp.scientific_name?.toLowerCase().includes(s) ||
      sp.common_name?.toLowerCase().includes(s) ||
      sp.family?.toLowerCase().includes(s) ||
      sp.order_name?.toLowerCase().includes(s) ||
      sp.class_name?.toLowerCase().includes(s) ||
      sp.genus?.toLowerCase().includes(s)
    );
  }, [species, search]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(sp => {
      const key = groupKeyFor(sp, groupBy);
      if (!groups[key]) groups[key] = [];
      groups[key].push(sp);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupBy]);

  const toggleGroup = (e, groupSpecies) => {
    e.stopPropagation();
    const ids = groupSpecies.map(sp => sp.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    onSelectionChange(allSelected
      ? selectedIds.filter(id => !ids.includes(id))
      : [...new Set([...selectedIds, ...ids])]
    );
  };

  const toggleSpecies = (id) => {
    onSelectionChange(selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id]
    );
  };

  const toggleExpand = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !(prev[group] !== false) }));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search species, family, class..." className="pl-9 h-9" />
        </div>
        <select
          value={groupBy}
          onChange={e => setGroupBy(e.target.value)}
          className="h-9 px-3 rounded-md border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none"
        >
          <option value="class">By Class</option>
          <option value="order">By Order</option>
          <option value="family">By Family</option>
          <option value="genus">By Genus</option>
        </select>
      </div>

      <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white space-y-0.5">
        {grouped.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">No species found</div>
        )}
        {grouped.map(([group, groupSpecies]) => {
          const ids = groupSpecies.map(sp => sp.id);
          const allSel = ids.every(id => selectedIds.includes(id));
          const someSel = ids.some(id => selectedIds.includes(id));
          const isExpanded = expandedGroups[group] !== false;

          return (
            <div key={group}>
              <div
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none"
                onClick={() => toggleExpand(group)}
              >
                {isExpanded
                  ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                }
                <button
                  onClick={(e) => toggleGroup(e, groupSpecies)}
                  className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    borderColor: allSel || someSel ? 'hsl(0 100% 47%)' : '#cbd5e1',
                    backgroundColor: allSel ? 'hsl(0 100% 47%)' : someSel ? 'hsl(0 100% 47% / 0.2)' : 'white'
                  }}
                >
                  {allSel && <span className="text-white text-xs font-bold leading-none">✓</span>}
                </button>
                <span className="text-sm font-semibold text-slate-800 flex-1">{group}</span>
                <Badge variant="secondary" className="text-xs">{groupSpecies.length}</Badge>
              </div>

              {isExpanded && (
                <div className="ml-7 space-y-0.5">
                  {groupSpecies.map(sp => {
                    const isSel = selectedIds.includes(sp.id);
                    return (
                      <div
                        key={sp.id}
                        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer select-none"
                        onClick={() => toggleSpecies(sp.id)}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                          style={{
                            borderColor: isSel ? 'hsl(0 100% 47%)' : '#cbd5e1',
                            backgroundColor: isSel ? 'hsl(0 100% 47%)' : 'white'
                          }}
                        >
                          {isSel && <span className="text-white text-xs font-bold leading-none" style={{ fontSize: '9px' }}>✓</span>}
                        </div>
                        <span className="text-xs italic text-slate-800">{sp.scientific_name}</span>
                        {sp.common_name && <span className="text-xs text-slate-500">({sp.common_name})</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}