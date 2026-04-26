import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X, ChevronDown } from 'lucide-react';

export default function SpeciesSearchFilter({ 
  data = [], 
  onFilter = () => {},
  searchFields = ['scientific_name', 'common_name'],
  filterOptions = {}
}) {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    conservation_status: 'all',
    habitat_type: 'all',
    date_from: null,
    date_to: null,
    observer: 'all'
  });
  const [expandedFilters, setExpandedFilters] = useState({
    status: true,
    habitat: false,
    date: false,
    observer: false
  });

  // Filter and search logic
  const filtered = useMemo(() => {
    return data.filter(item => {
      // Text search
      const matchesSearch = searchText === '' || 
        searchFields.some(field => 
          item[field]?.toString().toLowerCase().includes(searchText.toLowerCase())
        );

      // Conservation status
      const matchesStatus = filters.conservation_status === 'all' || 
        item.iucn_status === filters.conservation_status;

      // Habitat
      const matchesHabitat = filters.habitat_type === 'all' || 
        item.habitat_type === filters.habitat_type;

      // Date range
      const itemDate = new Date(item.observation_date || item.created_date);
      const matchesDateFrom = !filters.date_from || itemDate >= new Date(filters.date_from);
      const matchesDateTo = !filters.date_to || itemDate <= new Date(filters.date_to);

      // Observer
      const matchesObserver = filters.observer === 'all' || 
        item.created_by === filters.observer;

      return matchesSearch && matchesStatus && matchesHabitat && 
             matchesDateFrom && matchesDateTo && matchesObserver;
    });
  }, [data, searchText, filters, searchFields]);

  const handleClearFilters = () => {
    setSearchText('');
    setFilters({
      conservation_status: 'all',
      habitat_type: 'all',
      date_from: null,
      date_to: null,
      observer: 'all'
    });
  };

  React.useEffect(() => {
    onFilter(filtered);
  }, [filtered]);

  const conservationStatuses = ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'NE'];
  const habitats = ['Woodland', 'Wetland', 'Coastal', 'Grassland', 'Urban', 'Agricultural'];
  const observers = [...new Set(data.map(d => d.created_by_name || d.created_by))].filter(Boolean);

  const activeFiltersCount = [
    searchText !== '',
    filters.conservation_status !== 'all',
    filters.habitat_type !== 'all',
    filters.date_from !== null,
    filters.date_to !== null,
    filters.observer !== 'all'
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Search & Filter</CardTitle>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">{activeFiltersCount} active</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search species, locations, observers..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Conservation Status Filter */}
        <FilterSection
          title="Conservation Status"
          expanded={expandedFilters.status}
          onToggle={() => setExpandedFilters({ ...expandedFilters, status: !expandedFilters.status })}
        >
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setFilters({ ...filters, conservation_status: 'all' })}
              className={`px-3 py-2 rounded text-sm font-medium transition ${
                filters.conservation_status === 'all'
                  ? 'bg-bangor-red text-white'
                  : 'border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All
            </button>
            {conservationStatuses.map(status => (
              <button
                key={status}
                onClick={() => setFilters({ ...filters, conservation_status: status })}
                className={`px-3 py-2 rounded text-sm font-medium transition ${
                  filters.conservation_status === status
                    ? 'bg-bangor-red text-white'
                    : 'border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Habitat Filter */}
        <FilterSection
          title="Habitat Type"
          expanded={expandedFilters.habitat}
          onToggle={() => setExpandedFilters({ ...expandedFilters, habitat: !expandedFilters.habitat })}
        >
          <div className="space-y-2">
            {['All', ...habitats].map(habitat => (
              <label key={habitat} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="habitat"
                  checked={
                    habitat === 'All' 
                      ? filters.habitat_type === 'all'
                      : filters.habitat_type === habitat
                  }
                  onChange={() => setFilters({ 
                    ...filters, 
                    habitat_type: habitat === 'All' ? 'all' : habitat 
                  })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">{habitat}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Date Range Filter */}
        <FilterSection
          title="Date Range"
          expanded={expandedFilters.date}
          onToggle={() => setExpandedFilters({ ...expandedFilters, date: !expandedFilters.date })}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 block mb-1">From</label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value || null })}
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">To</label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value || null })}
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
              />
            </div>
          </div>
        </FilterSection>

        {/* Observer Filter */}
        {observers.length > 0 && (
          <FilterSection
            title="Observer"
            expanded={expandedFilters.observer}
            onToggle={() => setExpandedFilters({ ...expandedFilters, observer: !expandedFilters.observer })}
          >
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="observer"
                  checked={filters.observer === 'all'}
                  onChange={() => setFilters({ ...filters, observer: 'all' })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">All Observers</span>
              </label>
              {observers.map(observer => (
                <label key={observer} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="observer"
                    checked={filters.observer === observer}
                    onChange={() => setFilters({ ...filters, observer })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">{observer}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Clear Button */}
        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="w-full px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded hover:bg-slate-50 transition flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear All Filters
          </button>
        )}

        {/* Results count */}
        <p className="text-xs text-slate-500 text-center">
          Showing {filtered.length} of {data.length} results
        </p>
      </CardContent>
    </Card>
  );
}

function FilterSection({ title, expanded, onToggle, children }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded text-sm font-medium text-slate-900"
      >
        {title}
        <ChevronDown className={`w-4 h-4 transition ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && <div className="p-3 bg-slate-50 rounded space-y-3">{children}</div>}
    </div>
  );
}