import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useQueryClient as _unused } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PackageOpen, Loader2, RefreshCw, X, ShieldAlert, GitMerge } from 'lucide-react';
import TaxonomicSelector from '@/components/dataprep/TaxonomicSelector';
import { detectOutliers } from '@/components/outlierDetection';
import DataTypeSelector from '@/components/dataprep/DataTypeSelector';
import ExportFileCard from '@/components/dataprep/ExportFileCard';
import SpatialThinningPanel from '@/components/dataprep/SpatialThinningPanel';

const STEP = ({ n, label }) => (
  <span className="flex items-center gap-2">
    <span className="w-6 h-6 rounded-full bg-bangor-red text-white text-xs flex items-center justify-center font-bold shrink-0">{n}</span>
    {label}
  </span>
);

export default function DataPreparation() {
  const queryClient = useQueryClient();
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState([]);
  const [selectedDataTypes, setSelectedDataTypes] = useState([]);
  const [exportName, setExportName] = useState('');
  const [exportDescription, setExportDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [outlierHandling, setOutlierHandling] = useState('include_all');
  const [generateError, setGenerateError] = useState('');
  const [spatialThinning, setSpatialThinning] = useState({ enabled: false, minDistanceKm: 10 });

  const { data: allSpecies = [] } = useQuery({
    queryKey: ['allSpecies'],
    queryFn: () => base44.entities.Species.list('-created_date'),
  });

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['savedSearches'],
    queryFn: () => base44.entities.SavedSearch.list('-created_date'),
  });

  const { data: exportedFiles = [], refetch: refetchFiles } = useQuery({
    queryKey: ['exportedFiles'],
    queryFn: () => base44.entities.ExportedFile.list('-created_date', 30),
  });

  const selectedSpecies = useMemo(() =>
    allSpecies.filter(sp => selectedSpeciesIds.includes(sp.id)),
    [allSpecies, selectedSpeciesIds]
  );

  const outlierExclusionCount = useMemo(() => {
    if (outlierHandling === 'include_all' || !selectedSpecies.length) return 0;
    return selectedSpecies.reduce((total, sp) => {
      const { flagged } = detectOutliers(sp);
      const excluded = outlierHandling === 'exclude_high'
        ? flagged.filter(f => f.confidence >= 75)
        : flagged;
      return total + excluded.length;
    }, 0);
  }, [selectedSpecies, outlierHandling]);

  const loadFromSearch = (search) => {
    const s = search.search_term.toLowerCase();
    const matching = allSpecies.filter(sp =>
      sp.scientific_name?.toLowerCase().includes(s) ||
      sp.family?.toLowerCase().includes(s) ||
      sp.order_name?.toLowerCase().includes(s) ||
      sp.class_name?.toLowerCase().includes(s) ||
      sp.genus?.toLowerCase().includes(s)
    );
    setSelectedSpeciesIds(prev => [...new Set([...prev, ...matching.map(sp => sp.id)])]);
  };

  const handleGenerate = async () => {
    setGenerateError('');
    if (!selectedSpeciesIds.length) { setGenerateError('Please select at least one species.'); return; }
    if (!selectedDataTypes.length) { setGenerateError('Please select at least one data type.'); return; }
    setIsGenerating(true);

    // Build per-species outlier exclusions if filtering is active
    let outlierExclusions = null;
    if (outlierHandling !== 'include_all') {
      outlierExclusions = {};
      for (const sp of selectedSpecies) {
        const { flagged } = detectOutliers(sp);
        const toExclude = outlierHandling === 'exclude_high'
          ? flagged.filter(f => f.confidence >= 75)
          : flagged;
        if (toExclude.length > 0) {
          outlierExclusions[sp.id] = {
            inatIdxs: toExclude.filter(f => f.source === 'iNaturalist').map(f => f.idx),
            gbifIdxs: toExclude.filter(f => f.source === 'GBIF').map(f => f.idx),
          };
        }
      }
    }

    await base44.functions.invoke('generateExportFile', {
      speciesIds: selectedSpeciesIds,
      dataTypes: selectedDataTypes,
      exportName: exportName.trim(),
      exportDescription: exportDescription.trim(),
      outlierExclusions,
      spatialThinning: spatialThinning.enabled ? spatialThinning : null,
    });
    setIsGenerating(false);
    setExportName('');
    setExportDescription('');
    queryClient.invalidateQueries({ queryKey: ['exportedFiles'] });
  };

  // Haversine for spatial thinning preview
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const spatialThinningStats = useMemo(() => {
    if (!spatialThinning.enabled || !selectedSpecies.length) return { total: 0, removed: 0 };
    let total = 0, kept = 0;
    for (const sp of selectedSpecies) {
      const points = [];
      (sp.observations || []).forEach(o => { if (o.latitude != null && o.longitude != null) points.push([o.latitude, o.longitude]); });
      (sp.gbif_occurrences || []).forEach(o => { if (o.decimalLatitude != null && o.decimalLongitude != null) points.push([o.decimalLatitude, o.decimalLongitude]); });
      total += points.length;
      const retained = [];
      for (const p of points) {
        if (!retained.some(r => haversineKm(p[0], p[1], r[0], r[1]) < spatialThinning.minDistanceKm)) retained.push(p);
      }
      kept += retained.length;
    }
    return { total, removed: total - kept };
  }, [selectedSpecies, spatialThinning]);

  const canGenerate = selectedSpeciesIds.length > 0 && selectedDataTypes.length > 0 && !isGenerating;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">

      {/* Header */}
      <header className="bg-gradient-to-r from-white via-bangor-sun/5 to-white/80 backdrop-blur-sm border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bangor-red/20 rounded-xl">
              <PackageOpen className="w-6 h-6 text-bangor-red" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-bangor-red">Data Preparation Hub</h1>
              <p className="text-sm text-slate-600">
                Select species by taxonomic hierarchy, configure your export, and generate files for ArcGIS, MAXENT, Excel and more
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Step 1: Select Species ── */}
        <Card className="shadow-lg border-bangor-sun/20">
          <CardHeader className="border-b border-bangor-sun/20 bg-gradient-to-r from-bangor-red/10 to-bangor-sun/10">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-bangor-red">
                <STEP n="1" label="Select Species" />
              </CardTitle>
              {selectedSpeciesIds.length > 0 && (
                <Badge className="bg-bangor-red text-white">{selectedSpeciesIds.length} selected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All Species ({allSpecies.length})</TabsTrigger>
                <TabsTrigger value="searches">Saved Searches ({savedSearches.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <TaxonomicSelector
                  species={allSpecies}
                  selectedIds={selectedSpeciesIds}
                  onSelectionChange={setSelectedSpeciesIds}
                />
              </TabsContent>

              <TabsContent value="searches" className="mt-4">
                {savedSearches.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    No saved searches yet. Save a search from the Species Search page first.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {savedSearches.map(search => (
                      <div key={search.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                        <div>
                          <p className="font-semibold text-sm text-slate-800">{search.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{search.search_term} · {search.taxonomy_level} · {search.species_count} species</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => loadFromSearch(search)}>
                          Load into Selection
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Selected species preview */}
            {selectedSpeciesIds.length > 0 && (
              <div className="p-3 bg-bangor-red/5 border border-bangor-red/20 rounded-xl flex flex-wrap gap-1.5 items-center">
                <span className="text-xs font-semibold text-bangor-red mr-1 shrink-0">Selected:</span>
                {selectedSpecies.slice(0, 8).map(sp => (
                  <span key={sp.id} className="text-xs px-2 py-0.5 bg-white border border-bangor-red/20 text-slate-700 rounded-full italic">
                    {sp.scientific_name}
                  </span>
                ))}
                {selectedSpeciesIds.length > 8 && (
                  <span className="text-xs text-slate-500 italic">+{selectedSpeciesIds.length - 8} more</span>
                )}
                <button
                  onClick={() => setSelectedSpeciesIds([])}
                  className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Outlier Handling ── */}
        <Card className="shadow-lg border-bangor-sun/20">
          <CardHeader className="border-b border-bangor-sun/20 bg-gradient-to-r from-bangor-red/10 to-bangor-sun/10">
            <CardTitle className="text-bangor-red flex items-center gap-2 text-base">
              <ShieldAlert className="w-4 h-4" />
              Outlier Handling
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Choose how statistically suspect occurrence points are treated in the export</p>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {[
              { value: 'include_all',         label: 'Include all points',                       desc: 'No filtering — export every occurrence record as-is' },
              { value: 'exclude_high',        label: 'Exclude high-confidence outliers (≥75%)',  desc: 'Removes invalid coords and strong IQR deviations; keeps low-confidence duplicates' },
              { value: 'exclude_all_flagged', label: 'Exclude all flagged points',               desc: 'Removes everything flagged by any check, including low-confidence duplicates' },
            ].map(opt => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${outlierHandling === opt.value ? 'border-bangor-red bg-bangor-red/5' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <input
                  type="radio"
                  name="outlierHandling"
                  value={opt.value}
                  checked={outlierHandling === opt.value}
                  onChange={e => setOutlierHandling(e.target.value)}
                  className="mt-0.5 accent-red-600"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
            {outlierHandling !== 'include_all' && selectedSpeciesIds.length > 0 && (
              <div className="mt-1 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  <strong>{outlierExclusionCount}</strong> occurrence point{outlierExclusionCount !== 1 ? 's' : ''} would be excluded across the {selectedSpeciesIds.length} selected species.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Spatial Thinning ── */}
        <Card className="shadow-lg border-bangor-sun/20">
          <CardHeader className="border-b border-bangor-sun/20 bg-gradient-to-r from-bangor-red/10 to-bangor-sun/10">
            <CardTitle className="text-bangor-red flex items-center gap-2 text-base">
              <GitMerge className="w-4 h-4" />
              Spatial Thinning
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Reduce spatial autocorrelation in MAXENT occurrence output (recommended for SDMs)</p>
          </CardHeader>
          <CardContent className="p-4">
            <SpatialThinningPanel
              value={spatialThinning}
              onChange={setSpatialThinning}
              stats={spatialThinningStats}
            />
          </CardContent>
        </Card>

        {/* ── Step 2: Data Types ── */}
        <Card className="shadow-lg border-bangor-sun/20">
          <CardHeader className="border-b border-bangor-sun/20 bg-gradient-to-r from-bangor-red/10 to-bangor-sun/10">
            <CardTitle className="text-bangor-red">
              <STEP n="2" label="Choose Data Types to Export" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <DataTypeSelector selected={selectedDataTypes} onChange={setSelectedDataTypes} />
          </CardContent>
        </Card>

        {/* ── Step 3: Name & Generate ── */}
        <Card className="shadow-lg border-bangor-sun/20">
          <CardHeader className="border-b border-bangor-sun/20 bg-gradient-to-r from-bangor-red/10 to-bangor-sun/10">
            <CardTitle className="text-bangor-red">
              <STEP n="3" label="Name & Generate" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Export Name</label>
                <Input
                  placeholder="e.g. Welsh Mammals — ArcGIS 2024"
                  value={exportName}
                  onChange={e => setExportName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  Description <span className="text-slate-400 font-normal text-xs">(shown on hover over the file)</span>
                </label>
                <Input
                  placeholder="e.g. Mammal species for habitat connectivity analysis"
                  value={exportDescription}
                  onChange={e => setExportDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 flex-wrap gap-3">
              <div className="text-sm text-slate-600">
                <span className="font-bold text-slate-800">{selectedSpeciesIds.length}</span> species selected ·{' '}
                <span className="font-bold text-slate-800">{selectedDataTypes.length}</span> data type{selectedDataTypes.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex flex-col items-end gap-1">
                {generateError && <p className="text-xs text-red-500">{generateError}</p>}
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="bg-bangor-red text-white px-8 font-bold disabled:opacity-100 disabled:bg-slate-200 disabled:text-slate-600 disabled:cursor-not-allowed"
                >
                  {isGenerating
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                    : 'Generate Export'
                  }
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Exports Panel ── */}
        <Card className="shadow-lg border-bangor-sun/20">
          <CardHeader className="border-b border-bangor-sun/20 bg-gradient-to-r from-bangor-red/10 to-bangor-sun/10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-bangor-red flex items-center gap-2">
                <PackageOpen className="w-5 h-5" />
                Your Exports ({exportedFiles.length})
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => refetchFiles()} title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Hover over any export file to see its full description</p>
          </CardHeader>
          <CardContent className="p-4">
            {exportedFiles.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <PackageOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No exports yet. Generate your first export above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {exportedFiles.map(file => (
                  <ExportFileCard key={file.id} file={file} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  );
}