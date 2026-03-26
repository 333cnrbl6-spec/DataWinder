import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, MapPin, Download, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from './StatusBadge';
import ObservationExportPanel from './ObservationExportPanel';
import 'leaflet/dist/leaflet.css';



function MapUpdater({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) {
      map.setView(center, 4);
    }
  }, [center, map]);
  return null;
}

export default function MapView({ species, selectedIds, onSelect }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [taxonomicFilter, setTaxonomicFilter] = useState('all');
  const [taxonomicRank, setTaxonomicRank] = useState('family');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showExport, setShowExport] = useState(false);
  const [speciesData, setSpeciesData] = useState(species);
  const [loading, setLoading] = useState(false);

  // Get unique values for current taxonomic rank
  const taxonomicOptions = useMemo(() => {
    const rankField = taxonomicRank === 'genus' ? 'genus' 
                    : taxonomicRank === 'family' ? 'family'
                    : taxonomicRank === 'order' ? 'order_name'
                    : 'class_name';
    const unique = [...new Set(species.map(s => s[rankField]).filter(Boolean))];
    return unique.sort();
  }, [species, taxonomicRank]);

  // Auto-fetch family data when taxonomic filter changes
  useEffect(() => {
    if (taxonomicRank === 'family' && taxonomicFilter !== 'all' && !loading) {
      setLoading(true);
      base44.functions.invoke('fetchFamilySpeciesData', { family: taxonomicFilter })
        .then(res => {
          setSpeciesData(res.data.species);
          setTaxonomicFilter('all'); // Reset to show all species from fetched family
        })
        .catch(err => console.error('Family fetch error:', err))
        .finally(() => setLoading(false));
    }
  }, [taxonomicRank, taxonomicFilter]);

  // Filter species and get observations with coordinates
  const observations = useMemo(() => {
    let filtered = speciesData;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.iucn_status === statusFilter);
    }
    if (taxonomicFilter !== 'all') {
      const rankField = taxonomicRank === 'genus' ? 'genus' 
                      : taxonomicRank === 'family' ? 'family'
                      : taxonomicRank === 'order' ? 'order_name'
                      : 'class_name';
      filtered = filtered.filter(s => s[rankField] === taxonomicFilter);
    }
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(s => s.data_source === sourceFilter);
    }

    // Extract observations with coordinates
    const obs = [];
    filtered.forEach(sp => {
      if (sp.observations && sp.observations.length > 0) {
        sp.observations.forEach(observation => {
          if (observation.latitude && observation.longitude) {
            obs.push({
              ...observation,
              species: sp
            });
          }
        });
      }
    });

    return obs;
  }, [speciesData, statusFilter, taxonomicFilter, taxonomicRank, sourceFilter]);

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (observations.length === 0) return [20, 0];
    const avgLat = observations.reduce((sum, obs) => sum + obs.latitude, 0) / observations.length;
    const avgLng = observations.reduce((sum, obs) => sum + obs.longitude, 0) / observations.length;
    return [avgLat, avgLng];
  }, [observations]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Map Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
           <div>
             <label className="text-xs text-slate-500 mb-1 block">Data Source</label>
             <Select value={sourceFilter} onValueChange={setSourceFilter}>
               <SelectTrigger className="h-9">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Sources</SelectItem>
                 <SelectItem value="IUCN Red List">IUCN Only</SelectItem>
                 <SelectItem value="iNaturalist">iNaturalist Only</SelectItem>
               </SelectContent>
             </Select>
           </div>

           <div>
             <label className="text-xs text-slate-500 mb-1 block">Conservation Status</label>
             <Select value={statusFilter} onValueChange={setStatusFilter}>
               <SelectTrigger className="h-9">
                 <SelectValue />
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

           <div>
             <label className="text-xs text-slate-500 mb-1 block">Taxonomic Rank</label>
             <Select value={taxonomicRank} onValueChange={(v) => {
               setTaxonomicRank(v);
               setTaxonomicFilter('all');
             }}>
               <SelectTrigger className="h-9">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="class">Class</SelectItem>
                 <SelectItem value="order">Order</SelectItem>
                 <SelectItem value="family">Family</SelectItem>
                 <SelectItem value="genus">Genus</SelectItem>
               </SelectContent>
             </Select>
           </div>

           <div>
             <label className="text-xs text-slate-500 mb-1 block capitalize">{taxonomicRank}</label>
             <Select value={taxonomicFilter} onValueChange={setTaxonomicFilter}>
               <SelectTrigger className="h-9">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All {taxonomicRank}s</SelectItem>
                 {taxonomicOptions.map(option => (
                   <SelectItem key={option} value={option}>
                     {option}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
         </div>
        
        <div className="mt-3 flex items-center justify-between gap-4">
           <div className="flex items-center gap-4 text-xs text-slate-500">
             <div className="flex items-center gap-1">
               <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
               <span>IUCN</span>
             </div>
             <div className="flex items-center gap-1">
               <div className="w-3 h-3 rounded-full bg-blue-500"></div>
               <span>iNaturalist</span>
             </div>
             <span>{observations.length} observations</span>
             {loading && (
               <div className="flex items-center gap-1 text-amber-600">
                 <Loader2 className="w-3 h-3 animate-spin" />
                 <span>Loading family data...</span>
               </div>
             )}
           </div>
           {observations.length > 0 && (
             <Button
               size="sm"
               onClick={() => setShowExport(true)}
               className="bg-blue-600 hover:bg-blue-700 text-xs h-7"
             >
               <Download className="w-3 h-3 mr-1" />
               Export Map Data
             </Button>
           )}
         </div>
      </Card>

      {/* Map */}
      <Card className="overflow-hidden">
        <div className="h-[600px] relative">
          {observations.length > 0 ? (
            <MapContainer
              center={mapCenter}
              zoom={3}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                attribution="&copy; Esri"
              />
              <MapUpdater center={mapCenter} />
              
              {observations.map((obs, idx) => (
                <Marker
                  key={`${obs.species.id}-${idx}`}
                  position={[obs.latitude, obs.longitude]}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-sm">{obs.species.common_name || obs.species.scientific_name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          obs.species.data_source === 'IUCN Red List' 
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {obs.species.data_source === 'IUCN Red List' ? 'IUCN' : 'iNat'}
                        </span>
                      </div>
                      <p className="text-xs italic text-slate-500 mb-2">{obs.species.scientific_name}</p>
                      {obs.species.data_source === 'IUCN Red List' && (
                        <StatusBadge status={obs.species.iucn_status} size="sm" />
                      )}
                      {obs.location && (
                        <p className="text-xs text-slate-600 mt-2 flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {obs.location}
                        </p>
                      )}
                      {obs.observed_on && (
                        <p className="text-xs text-slate-500 mt-1">
                          Observed: {obs.observed_on}
                        </p>
                      )}
                      {obs.user && (
                        <p className="text-xs text-slate-500">
                          Observer: {obs.user}
                        </p>
                      )}
                      <button
                        onClick={() => onSelect(obs.species)}
                        className="mt-2 text-xs text-blue-600 hover:underline"
                      >
                        {selectedIds.includes(obs.species.id || obs.species.scientific_name) ? 'Deselect' : 'Select'} species
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No observation coordinates available</p>
                <p className="text-sm text-slate-400 mt-1">Try different filters or search for species with location data</p>
              </div>
            </div>
          )}
        </div>
      </Card>


    </div>
  );
}