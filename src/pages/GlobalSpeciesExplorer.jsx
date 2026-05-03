import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import GlobalOccurrenceMap from '@/components/maps/GlobalOccurrenceMap';
import SpeciesFilterPanel from '@/components/explorer/SpeciesFilterPanel';
import QuickSDMLauncher from '@/components/explorer/QuickSDMLauncher';
import { Search, Filter, Zap, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalSpeciesExplorer() {
  const [allOccurrences, setAllOccurrences] = useState([]);
  const [filteredOccurrences, setFilteredOccurrences] = useState([]);
  const [allSpecies, setAllSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOccurrence, setSelectedOccurrence] = useState(null);
  const [showSDMLauncher, setShowSDMLauncher] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const [filters, setFilters] = useState({
    threatLevel: [],
    climateZone: [],
    dateFrom: null,
    dateTo: null,
    speciesIds: [],
    verified: null
  });

  // Load occurrences and species
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [occurrences, species] = await Promise.all([
          base44.entities.Occurrence.list(),
          base44.entities.Species.list()
        ]);

        setAllOccurrences(occurrences);
        setFilteredOccurrences(occurrences);
        setAllSpecies(species);
      } catch (error) {
        console.error('Error loading explorer data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Apply filters
  useEffect(() => {
    let results = [...allOccurrences];

    // Threat level filter
    if (filters.threatLevel.length > 0) {
      results = results.filter(occ => 
        filters.threatLevel.includes(occ.threat_level)
      );
    }

    // Species filter
    if (filters.speciesIds.length > 0) {
      results = results.filter(occ => 
        filters.speciesIds.includes(occ.species_id)
      );
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      results = results.filter(occ => {
        const occDate = new Date(occ.observation_date);
        if (filters.dateFrom && occDate < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && occDate > new Date(filters.dateTo)) return false;
        return true;
      });
    }

    // Verified filter
    if (filters.verified !== null) {
      results = results.filter(occ => occ.verified === filters.verified);
    }

    setFilteredOccurrences(results);
  }, [filters, allOccurrences]);

  const handleResetFilters = () => {
    setFilters({
      threatLevel: [],
      climateZone: [],
      dateFrom: null,
      dateTo: null,
      speciesIds: [],
      verified: null
    });
  };

  const handleLaunchSDM = (speciesIds) => {
    setSelectedOccurrence(null);
    setShowSDMLauncher(speciesIds);
  };

  const threatCounts = {
    critical: filteredOccurrences.filter(o => o.threat_level === 'critical').length,
    high: filteredOccurrences.filter(o => o.threat_level === 'high').length,
    medium: filteredOccurrences.filter(o => o.threat_level === 'medium').length,
    low: filteredOccurrences.filter(o => o.threat_level === 'low').length
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-bangor-red">Global Species Explorer</h1>
            <p className="text-sm text-slate-500 mt-1">
              Explore {filteredOccurrences.length.toLocaleString()} occurrence records across all species
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-xs font-semibold text-red-900">CRITICAL</div>
            <div className="text-lg font-bold text-red-700">{threatCounts.critical}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-xs font-semibold text-orange-900">HIGH THREAT</div>
            <div className="text-lg font-bold text-orange-700">{threatCounts.high}</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-xs font-semibold text-yellow-900">MEDIUM</div>
            <div className="text-lg font-bold text-yellow-700">{threatCounts.medium}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-xs font-semibold text-green-900">LOW THREAT</div>
            <div className="text-lg font-bold text-green-700">{threatCounts.low}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left Sidebar */}
        {showFilterPanel && (
          <div className="w-80 bg-white rounded-lg border border-slate-200 shadow-sm overflow-y-auto">
            <SpeciesFilterPanel
              filters={filters}
              setFilters={setFilters}
              allSpecies={allSpecies}
              onClose={() => setShowFilterPanel(false)}
            />
          </div>
        )}

        {/* Map */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-bangor-red rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 text-slate-600">Loading global occurrence data...</p>
              </div>
            </div>
          ) : (
            <GlobalOccurrenceMap
              occurrences={filteredOccurrences}
              selectedOccurrence={selectedOccurrence}
              onSelectOccurrence={setSelectedOccurrence}
              onLaunchSDM={handleLaunchSDM}
            />
          )}
        </div>

        {/* Right Sidebar - Selected Occurrence Details */}
        {selectedOccurrence && (
          <div className="w-80 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-start justify-between sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-slate-900">{selectedOccurrence.species_name}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedOccurrence.observer_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedOccurrence(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Location</div>
                <div className="text-slate-900 mt-1">
                  {selectedOccurrence.latitude.toFixed(4)}, {selectedOccurrence.longitude.toFixed(4)}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Date Observed</div>
                <div className="text-slate-900 mt-1">
                  {new Date(selectedOccurrence.observation_date).toLocaleDateString()}
                </div>
              </div>

              {selectedOccurrence.threat_level && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">Threat Level</div>
                  <div className={`inline-block mt-1 px-2 py-1 rounded text-xs font-semibold ${
                    selectedOccurrence.threat_level === 'critical' ? 'bg-red-100 text-red-800' :
                    selectedOccurrence.threat_level === 'high' ? 'bg-orange-100 text-orange-800' :
                    selectedOccurrence.threat_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedOccurrence.threat_level.toUpperCase()}
                  </div>
                </div>
              )}

              {selectedOccurrence.conservation_status && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">IUCN Status</div>
                  <div className="text-slate-900 mt-1 font-semibold">
                    {selectedOccurrence.conservation_status}
                  </div>
                </div>
              )}

              {selectedOccurrence.notes && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">Notes</div>
                  <div className="text-slate-700 mt-1 text-xs leading-relaxed">
                    {selectedOccurrence.notes}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Verification</div>
                <div className="mt-1">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    selectedOccurrence.verified 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {selectedOccurrence.verified ? '✓ Verified' : 'Unverified'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <Button
                className="w-full gap-2 bg-bangor-red hover:bg-bangor-red/90"
                onClick={() => handleLaunchSDM([selectedOccurrence.species_id])}
              >
                <Zap className="w-4 h-4" />
                Model this Species
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* SDM Launcher Modal */}
      {showSDMLauncher && (
        <QuickSDMLauncher
          speciesIds={showSDMLauncher}
          allSpecies={allSpecies}
          onClose={() => setShowSDMLauncher(false)}
        />
      )}
    </div>
  );
}