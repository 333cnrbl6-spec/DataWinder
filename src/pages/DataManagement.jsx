import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, Map, FileSpreadsheet, Layers, Search as SearchIcon } from 'lucide-react';
import TaxonomicSearch from '@/components/species/TaxonomicSearch';
import { motion } from 'framer-motion';

export default function DataManagement() {
  const [selectedSpecies, setSelectedSpecies] = useState([]);
  const queryClient = useQueryClient();

  const { data: allSpecies = [], refetch: refetchSpecies } = useQuery({
    queryKey: ['allSpecies', 'dev'],
    queryFn: () => base44.entities.Species.list('-created_date', 10000, { data_env: 'dev' })
  });

  // Subscribe to real-time updates
  React.useEffect(() => {
    const unsubscribe = base44.entities.Species.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['allSpecies', 'dev'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const handleExportMAXENT = () => {
    const maxentData = allSpecies
      .filter(sp => sp.observations?.length > 0 || sp.gbif_occurrences?.length > 0)
      .flatMap(sp => {
        const occurrences = [
          ...(sp.observations || []).map(obs => ({
            species: sp.scientific_name,
            longitude: obs.longitude,
            latitude: obs.latitude,
            date: obs.observed_on || '',
            source: 'iNaturalist'
          })),
          ...(sp.gbif_occurrences || []).map(occ => ({
            species: sp.scientific_name,
            longitude: occ.longitude,
            latitude: occ.latitude,
            date: occ.eventDate || '',
            source: 'GBIF'
          }))
        ];
        return occurrences;
      });

    const csv = [
      'species,longitude,latitude,date,source',
      ...maxentData.map(row => 
        `"${row.species}",${row.longitude},${row.latitude},${row.date},${row.source}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maxent_occurrences_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportArcGIS = () => {
    const features = allSpecies
      .filter(sp => sp.range_data_geojson)
      .map(sp => ({
        type: 'Feature',
        properties: {
          scientific_name: sp.scientific_name,
          common_name: sp.common_name,
          iucn_status: sp.iucn_status,
          population_trend: sp.population_trend,
          family: sp.family,
          order: sp.order_name,
          class: sp.class_name
        },
        geometry: sp.range_data_geojson.type === 'FeatureCollection' 
          ? sp.range_data_geojson.features[0]?.geometry 
          : sp.range_data_geojson.geometry
      }))
      .filter(f => f.geometry);

    const geojson = {
      type: 'FeatureCollection',
      features
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arcgis_species_ranges_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const data = allSpecies.map(sp => ({
      scientific_name: sp.scientific_name,
      common_name: sp.common_name,
      iucn_status: sp.iucn_status,
      population_trend: sp.population_trend,
      kingdom: sp.kingdom,
      phylum: sp.phylum,
      class: sp.class_name,
      order: sp.order_name,
      family: sp.family,
      genus: sp.genus,
      countries: sp.geographic_distribution?.countries?.join('; ') || '',
      country_count: sp.geographic_distribution?.countries?.length || 0,
      habitat: sp.habitat,
      threats: sp.threats,
      conservation_actions: sp.conservation_actions,
      observation_count: (sp.observation_count || 0) + (sp.gbif_occurrence_count || 0),
      assessment_date: sp.assessment_date
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
    a.download = `species_database_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <header className="bg-gradient-to-r from-white via-bangor-sun/5 to-white/80 backdrop-blur-sm border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bangor-red/20 rounded-xl">
              <Database className="w-6 h-6 text-bangor-red" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-bangor-red">Data Management & Analysis</h1>
              <p className="text-sm text-slate-600">Search species and manage your database</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Search Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card className="shadow-lg border-bangor-sun/20">
              <CardHeader className="border-b border-bangor-sun/20 bg-gradient-to-r from-bangor-red/10 to-bangor-sun/10">
                <CardTitle className="flex items-center gap-2 text-bangor-red">
                  <SearchIcon className="w-5 h-5" />
                  Species Search
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <TaxonomicSearch 
                  onSearch={(searchParams) => {
                    // Search is handled in the Home page, this just triggers a refresh
                    refetchSpecies();
                  }} 
                  isLoading={false} 
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Right: Data Handling Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card className="shadow-lg border-bangor-sun/20">
              <CardHeader className="border-b border-bangor-sun/20 bg-gradient-to-r from-bangor-red/10 to-bangor-sun/10">
                <CardTitle className="flex items-center gap-2 text-bangor-red">
                  <Database className="w-5 h-5" />
                  Database Management
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Database Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-bangor-red/10 to-bangor-sun/10 rounded-lg p-4">
                    <div className="text-3xl font-bold text-bangor-red">{allSpecies.length}</div>
                    <div className="text-sm text-slate-600 mt-1">Total Species</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-600">
                      {allSpecies.filter(sp => sp.range_data_geojson).length}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">With Range Data</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-600">
                      {allSpecies.filter(sp => sp.observations?.length > 0 || sp.gbif_occurrences?.length > 0).length}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">With Occurrences</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-purple-600">
                      {[...new Set(allSpecies.map(sp => sp.family))].filter(Boolean).length}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">Families</div>
                  </div>
                </div>

                {/* Export Tools */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Export Data</h3>
                  <div className="space-y-2">
                    <Button
                      onClick={handleExportMAXENT}
                      className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={!allSpecies.some(sp => sp.observations?.length > 0 || sp.gbif_occurrences?.length > 0)}
                    >
                      <Layers className="w-4 h-4 mr-2" />
                      Export for MAXENT (Occurrence Data)
                    </Button>
                    
                    <Button
                      onClick={handleExportArcGIS}
                      className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={!allSpecies.some(sp => sp.range_data_geojson)}
                    >
                      <Map className="w-4 h-4 mr-2" />
                      Export for ArcGIS (GeoJSON Ranges)
                    </Button>
                    
                    <Button
                      onClick={handleExportExcel}
                      className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                      disabled={allSpecies.length === 0}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Export Complete Dataset (Excel/CSV)
                    </Button>
                  </div>
                </div>

                {/* Data Quality */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Data Quality</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Species with IUCN Data:</span>
                      <span className="font-semibold text-slate-900">
                        {allSpecies.filter(sp => sp.iucn_id).length} ({Math.round(allSpecies.filter(sp => sp.iucn_id).length / allSpecies.length * 100)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Species with iNaturalist Data:</span>
                      <span className="font-semibold text-slate-900">
                        {allSpecies.filter(sp => sp.inat_taxon_id).length} ({Math.round(allSpecies.filter(sp => sp.inat_taxon_id).length / allSpecies.length * 100)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Species with GBIF Data:</span>
                      <span className="font-semibold text-slate-900">
                        {allSpecies.filter(sp => sp.gbif_id).length} ({Math.round(allSpecies.filter(sp => sp.gbif_id).length / allSpecies.length * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button
                      onClick={() => window.location.href = '/SavedData'}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Database className="w-4 h-4 mr-2" />
                      View Full Database Table
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}