import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, Trash2, Search, Download, FolderOpen, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '@/components/species/StatusBadge';
import TrendIndicator from '@/components/species/TrendIndicator';
import { motion } from 'framer-motion';

export default function SavedData() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSearch, setSelectedSearch] = useState(null);
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

  const filteredSpecies = allSpecies.filter(sp => 
    !searchTerm || 
    sp.scientific_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sp.common_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sp.family?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <div className="mt-4 relative">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, family..."
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[70vh] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 sticky top-0 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Species</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Population</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Distribution</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">Family</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-600">IUCN Files</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSpecies.map((species) => (
                        <motion.tr
                          key={species.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b hover:bg-slate-50 transition-colors"
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
                            <div className="space-y-1">
                              <StatusBadge status={species.iucn_status} size="sm" />
                              {species.status_history && species.status_history.length > 1 && (
                                <div className="text-[10px] text-slate-500">
                                  History: {species.status_history.length} changes
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <TrendIndicator trend={species.population_trend} />
                              {species.population_details && (
                                <div className="text-xs text-slate-500 max-w-[200px] truncate">
                                  {species.population_details}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {species.geographic_distribution?.countries?.length > 0 ? (
                              <div className="text-xs">
                                <div className="font-medium text-slate-700">{species.geographic_distribution.countries.length} countries</div>
                                <div className="text-slate-500 max-w-[150px] truncate">
                                  {species.geographic_distribution.countries.slice(0, 2).join(', ')}
                                  {species.geographic_distribution.countries.length > 2 && '...'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-600">{species.family || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {species.assessment_pdf_url && (
                                <a 
                                  href={species.assessment_pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
                                >
                                  PDF
                                </a>
                              )}
                              {species.range_map_jpg_url && (
                                <a 
                                  href={species.range_map_jpg_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                                >
                                  Map
                                </a>
                              )}
                              {species.range_data_shp_url && (
                                <a 
                                  href={species.range_data_shp_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
                                >
                                  SHP
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteSpeciesMutation.mutate(species.id)}
                              className="h-8 w-8 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
    </div>
  );
}