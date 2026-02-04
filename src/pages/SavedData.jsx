import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Trash2, Search, Download, FolderOpen, Calendar, ExternalLink, Eye, FileText, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '@/components/species/StatusBadge';
import TrendIndicator from '@/components/species/TrendIndicator';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SavedData() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSearch, setSelectedSearch] = useState(null);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [conservationFilter, setConservationFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['savedSearches'],
    queryFn: () => base44.entities.SavedSearch.list('-created_date')
  });

  const { data: allSpecies = [] } = useQuery({
    queryKey: ['allSpecies'],
    queryFn: () => base44.entities.Species.list('-created_date')
  });

  const deleteSearchMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedSearch.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
    }
  });

  const deleteSpeciesMutation = useMutation({
    mutationFn: (id) => base44.entities.Species.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allSpecies'] });
    }
  });

  // Get unique countries for filter
  const allCountries = [...new Set(
    allSpecies.flatMap(sp => sp.geographic_distribution?.countries || [])
  )].sort();

  const filteredSpecies = allSpecies.filter(sp => {
    // Search filter
    const searchMatch = !searchTerm || 
      sp.scientific_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sp.common_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sp.family?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // IUCN status filter
    const statusMatch = statusFilter === 'all' || sp.iucn_status === statusFilter;
    
    // Data source filter
    const sourceMatch = sourceFilter === 'all' || 
      (sourceFilter === 'IUCN' && (sp.iucn_id || sp.data_source === 'IUCN Red List')) ||
      (sourceFilter === 'iNaturalist' && (sp.inat_taxon_id || sp.data_source === 'iNaturalist')) ||
      (sourceFilter === 'Combined' && sp.data_source === 'IUCN + iNaturalist');
    
    // Country filter
    const countryMatch = countryFilter === 'all' || 
      sp.geographic_distribution?.countries?.includes(countryFilter);
    
    // Conservation action filter
    const conservationMatch = conservationFilter === 'all' ||
      (conservationFilter === 'yes' && sp.conservation_actions) ||
      (conservationFilter === 'no' && !sp.conservation_actions);
    
    return searchMatch && statusMatch && sourceMatch && countryMatch && conservationMatch;
  });

  const exportSpecies = (speciesToExport) => {
    const data = speciesToExport.map(sp => ({
      scientific_name: sp.scientific_name,
      common_name: sp.common_name,
      iucn_status: sp.iucn_status,
      population_trend: sp.population_trend,
      population_details: sp.population_details,
      status_history: sp.status_history ? JSON.stringify(sp.status_history) : '',
      countries: sp.geographic_distribution?.countries?.join('; ') || '',
      country_count: sp.geographic_distribution?.countries?.length || 0,
      family: sp.family,
      genus: sp.genus,
      habitat: sp.habitat,
      range_description: sp.range_description,
      threats: sp.threats,
      conservation_actions: sp.conservation_actions
    }));

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => {
        const value = String(val || '').replace(/"/g, '""');
        return value.includes(',') || value.includes('"') ? `"${value}"` : value;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `species_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Saved Species Data</h1>
              <p className="text-sm text-slate-500">Access and manage your downloaded datasets</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Saved Searches */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                  Saved Searches ({savedSearches.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
                {savedSearches.map((search) => (
                  <motion.div
                    key={search.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedSearch?.id === search.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                    onClick={() => setSelectedSearch(search)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 truncate">{search.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {search.species_count} species · {search.search_term}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(search.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSearchMutation.mutate(search.id);
                        }}
                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
                {savedSearches.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No saved searches yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Species List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>All Species ({filteredSpecies.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => exportSpecies(filteredSpecies)}
                      disabled={filteredSpecies.length === 0}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="relative">
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, family..."
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>

                  {/* Advanced Filters */}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-500" />
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue placeholder="IUCN Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="CR">Critically Endangered</SelectItem>
                          <SelectItem value="EN">Endangered</SelectItem>
                          <SelectItem value="VU">Vulnerable</SelectItem>
                          <SelectItem value="NT">Near Threatened</SelectItem>
                          <SelectItem value="LC">Least Concern</SelectItem>
                          <SelectItem value="DD">Data Deficient</SelectItem>
                          <SelectItem value="NE">Not Evaluated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Data Source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="IUCN">IUCN Only</SelectItem>
                        <SelectItem value="iNaturalist">iNaturalist Only</SelectItem>
                        <SelectItem value="Combined">Combined Data</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={countryFilter} onValueChange={setCountryFilter}>
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue placeholder="Country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="all">All Countries</SelectItem>
                        {allCountries.map(country => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={conservationFilter} onValueChange={setConservationFilter}>
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue placeholder="Conservation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Species</SelectItem>
                        <SelectItem value="yes">Has Actions</SelectItem>
                        <SelectItem value="no">No Actions</SelectItem>
                      </SelectContent>
                    </Select>

                    {(statusFilter !== 'all' || sourceFilter !== 'all' || countryFilter !== 'all' || conservationFilter !== 'all') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setStatusFilter('all');
                          setSourceFilter('all');
                          setCountryFilter('all');
                          setConservationFilter('all');
                        }}
                        className="h-8 text-xs text-slate-500 hover:text-slate-700"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[70vh] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 sticky top-0 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Species</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Trend</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Family</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Order</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Class</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Countries</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Habitat</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Assessment</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSpecies.map((species) => (
                        <motion.tr
                          key={species.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b hover:bg-blue-50/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedSpecies(species);
                            setShowDetails(true);
                          }}
                        >
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-slate-900 text-sm">
                                {species.common_name || 'No common name'}
                              </p>
                              <p className="text-xs italic text-slate-500">{species.scientific_name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={species.iucn_status} size="sm" />
                          </td>
                          <td className="px-4 py-3">
                            <TrendIndicator trend={species.population_trend} showLabel />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-700">{species.family || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-600">{species.order_name || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-600">{species.class_name || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs">
                              {species.geographic_distribution?.countries?.length > 0 ? (
                                <>
                                  <div className="font-medium text-slate-700">{species.geographic_distribution.countries.length}</div>
                                  <div className="text-slate-500 max-w-[120px] truncate">
                                    {species.geographic_distribution.countries.slice(0, 2).join(', ')}
                                  </div>
                                </>
                              ) : '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-600 max-w-[150px] truncate">
                              {species.habitat || '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-500">
                              {species.assessment_date ? new Date(species.assessment_date).getFullYear() : '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedSpecies(species);
                                  setShowDetails(true);
                                }}
                                className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {(species.range_data_geojson || species.search_summary_json || species.observations) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const dataPackage = {};
                                    if (species.search_summary_json) dataPackage.search_summary = species.search_summary_json;
                                    if (species.range_data_geojson) dataPackage.range_geojson = species.range_data_geojson;
                                    if (species.observations) dataPackage.observations = species.observations;
                                    if (species.habitats_detailed) dataPackage.habitats = species.habitats_detailed;
                                    if (species.threats_detailed) dataPackage.threats = species.threats_detailed;

                                    const blob = new Blob([JSON.stringify(dataPackage, null, 2)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${species.scientific_name.replace(/ /g, '_')}_complete_data.json`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="h-8 w-8 text-slate-400 hover:text-green-600"
                                  title="Download All Data (JSON)"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteSpeciesMutation.mutate(species.id)}
                                className="h-8 w-8 text-slate-400 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredSpecies.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No species found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Species Details Modal */}
      <AnimatePresence>
        {showDetails && selectedSpecies && (
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {selectedSpecies.common_name || 'Species Details'}
                </DialogTitle>
                <p className="text-sm italic text-slate-500">{selectedSpecies.scientific_name}</p>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Image */}
                {selectedSpecies.image_url && (
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src={selectedSpecies.image_url} 
                      alt={selectedSpecies.scientific_name}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}

                {/* Conservation Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Conservation Status</h3>
                    <StatusBadge status={selectedSpecies.iucn_status} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Population Trend</h3>
                    <TrendIndicator trend={selectedSpecies.population_trend} showLabel />
                  </div>
                </div>

                {/* Taxonomy */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Taxonomy</h3>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><span className="font-medium">Kingdom:</span> {selectedSpecies.kingdom || '—'}</div>
                    <div><span className="font-medium">Phylum:</span> {selectedSpecies.phylum || '—'}</div>
                    <div><span className="font-medium">Class:</span> {selectedSpecies.class_name || '—'}</div>
                    <div><span className="font-medium">Order:</span> {selectedSpecies.order_name || '—'}</div>
                    <div><span className="font-medium">Family:</span> {selectedSpecies.family || '—'}</div>
                    <div><span className="font-medium">Genus:</span> {selectedSpecies.genus || '—'}</div>
                  </div>
                </div>

                {/* Population */}
                {selectedSpecies.population_details && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Population Details</h3>
                    <p className="text-sm text-slate-600">{selectedSpecies.population_details}</p>
                  </div>
                )}

                {/* Distribution */}
                {selectedSpecies.geographic_distribution?.countries?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">
                      Geographic Distribution ({selectedSpecies.geographic_distribution.countries.length} countries)
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedSpecies.geographic_distribution.countries.map((country, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                          {country}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Habitat */}
                {selectedSpecies.habitat && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Habitat</h3>
                    <p className="text-sm text-slate-600">{selectedSpecies.habitat}</p>
                  </div>
                )}

                {/* Range Description */}
                {selectedSpecies.range_description && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Range Description</h3>
                    <p className="text-sm text-slate-600">{selectedSpecies.range_description}</p>
                  </div>
                )}

                {/* Threats */}
                {selectedSpecies.threats && (
                  <div>
                    <h3 className="text-sm font-semibold text-red-700 mb-2">Threats</h3>
                    <p className="text-sm text-slate-600">{selectedSpecies.threats}</p>
                  </div>
                )}

                {/* Conservation Actions */}
                {selectedSpecies.conservation_actions && (
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-700 mb-2">Conservation Actions</h3>
                    <p className="text-sm text-slate-600">{selectedSpecies.conservation_actions}</p>
                  </div>
                )}

                {/* Status History */}
                {selectedSpecies.status_history && selectedSpecies.status_history.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Conservation Status History</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedSpecies.status_history.map((h, i) => (
                        <div key={i} className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 rounded">
                          <span className="font-medium">{h.year}:</span> {h.status}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Downloadable Data Files */}
                {(selectedSpecies.search_summary_json || selectedSpecies.range_data_geojson || selectedSpecies.observations) && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Download Data Files</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedSpecies.search_summary_json && (
                        <button 
                          className="text-xs px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1"
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(selectedSpecies.search_summary_json, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${selectedSpecies.scientific_name.replace(/ /g, '_')}_search_summary.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <FileText className="w-3 h-3" />
                          Search Summary (JSON)
                        </button>
                      )}
                      {selectedSpecies.range_data_geojson && (
                        <button 
                          className="text-xs px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1"
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(selectedSpecies.range_data_geojson, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${selectedSpecies.scientific_name.replace(/ /g, '_')}_range_data.geojson`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <FileText className="w-3 h-3" />
                          Range Data (GeoJSON)
                        </button>
                      )}
                      {selectedSpecies.observations && selectedSpecies.observations.length > 0 && (
                        <button 
                          className="text-xs px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                          onClick={() => {
                            const csv = [
                              'latitude,longitude,location,date,observer,photo_url',
                              ...selectedSpecies.observations.map(obs => 
                                `${obs.latitude},${obs.longitude},"${obs.location}",${obs.observed_on},${obs.user},"${obs.photo_url}"`
                              )
                            ].join('\n');
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${selectedSpecies.scientific_name.replace(/ /g, '_')}_observations.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <FileText className="w-3 h-3" />
                          Observations (CSV)
                        </button>
                      )}
                      {(selectedSpecies.habitats_detailed || selectedSpecies.threats_detailed) && (
                        <button 
                          className="text-xs px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1"
                          onClick={() => {
                            const detailedData = {
                              scientific_name: selectedSpecies.scientific_name,
                              habitats: selectedSpecies.habitats_detailed || [],
                              threats: selectedSpecies.threats_detailed || []
                            };
                            const blob = new Blob([JSON.stringify(detailedData, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${selectedSpecies.scientific_name.replace(/ /g, '_')}_habitats_threats.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <FileText className="w-3 h-3" />
                          Habitats & Threats (JSON)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* External Links */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">External Resources</h3>
                  <div className="space-y-3">
                    {selectedSpecies.iucn_id && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <a 
                            href={`https://www.iucnredlist.org/species/${selectedSpecies.iucn_id}/${selectedSpecies.scientific_name.replace(/ /g, '-').toLowerCase()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View on IUCN Red List
                          </a>
                          {selectedSpecies.assessment_pdf_url && (
                            <a 
                              href={selectedSpecies.assessment_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                              Assessment PDF
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 italic">
                          IUCN 2025. IUCN Red List of Threatened Species. Version 2025-2 www.iucnredlist.org
                        </p>
                      </div>
                    )}
                    {selectedSpecies.inat_taxon_id && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <a 
                            href={`https://www.inaturalist.org/taxa/${selectedSpecies.inat_taxon_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View on iNaturalist
                          </a>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs text-slate-600 font-medium">Download Observations:</span>
                          <a 
                            href={`https://www.inaturalist.org/observations/export?taxon_id=${selectedSpecies.inat_taxon_id}&quality_grade=research`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                          >
                            📥 CSV
                          </a>
                          <a 
                            href={`https://www.inaturalist.org/observations?taxon_id=${selectedSpecies.inat_taxon_id}&quality_grade=research&verifiable=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                          >
                            📊 JSON
                          </a>
                          <a 
                            href={`https://www.inaturalist.org/observations.kml?taxon_id=${selectedSpecies.inat_taxon_id}&quality_grade=research`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                          >
                            🗺️ KML
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Observation Data (iNaturalist) */}
                {selectedSpecies.observation_count > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Observation Data</h3>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="font-medium">Total Observations:</span> {selectedSpecies.observation_count.toLocaleString()}
                      </div>
                      {selectedSpecies.last_observed && (
                        <div>
                          <span className="font-medium">Last Observed:</span> {selectedSpecies.last_observed}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}