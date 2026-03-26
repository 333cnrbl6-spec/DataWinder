import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map, Layers, Globe, ZoomIn, Download, ExternalLink, Code, FileJson, Database, Share2, Info, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ArcGISMap from '@/components/ArcGISMap';
import ArcGISTermsModal from '@/components/ArcGISTermsModal';
import BufferAnalysis from '@/components/arcgis/BufferAnalysis';
import RangeOverlayAnalysis from '@/components/arcgis/RangeOverlayAnalysis';
import SpatialJoinAnalysis from '@/components/arcgis/SpatialJoinAnalysis';
import AnalysisResultsViewer from '@/components/arcgis/AnalysisResultsViewer';
import HybridizationMapper from '@/components/arcgis/HybridizationMapper';
import MissingRangeDataPrompt from '@/components/MissingRangeDataPrompt';
import IUCNRangeFetcher from '@/components/IUCNRangeFetcher';
import IUCNManualDownloadChecklist from '@/components/IUCNManualDownloadChecklist';
import IUCNSplitView from '@/components/IUCNSplitView';
import IUCNVersionBanner from '@/components/IUCNVersionBanner';
import IUCNBulkExtractPanel from '@/components/IUCNBulkExtractPanel';
import { useSpecies } from '@/lib/SpeciesContext';
import { useAnalysisState } from '@/hooks/useAnalysisState';

export default function ArcGISTools() {
  const [showArcGISTerms, setShowArcGISTerms] = useState(false);
  const [arcgisAgreed, setArcgisAgreed] = useState(false);
  const [showSplitView, setShowSplitView] = useState(false);
  const { selectedSpecies, setSelectedSpecies } = useSpecies();
  const { analysisResults, addResult, clearResults } = useAnalysisState();

  const { data: allSpecies = [] } = useQuery({
    queryKey: ['allSpecies'],
    queryFn: () => base44.entities.Species.list('-created_date', 10000)
  });

  const { data: allRangeData = [], refetch: refetchRangeData } = useQuery({
    queryKey: ['allRangeData'],
    queryFn: () => base44.entities.IUCNRangeData.list('-created_date', 10000)
  });

  const { data: allAssessments = [], refetch: refetchAssessments } = useQuery({
    queryKey: ['allAssessments'],
    queryFn: () => base44.entities.IUCNAssessment.list('-created_date', 10000)
  });

  // Build a lookup: species_id → range GeoJSON
  const rangeBySpeciesId = React.useMemo(() => {
    const map = {};
    for (const rd of allRangeData) {
      if (rd.species_id && rd.range_data_geojson) {
        map[rd.species_id] = rd.range_data_geojson;
      }
    }
    return map;
  }, [allRangeData]);

  // Enrich species with their range GeoJSON from IUCNRangeData
  const enrichedSpecies = React.useMemo(() =>
    allSpecies.map(sp => ({
      ...sp,
      range_data_geojson: sp.range_data_geojson || rangeBySpeciesId[sp.id] || null
    })), [allSpecies, rangeBySpeciesId]);

  const speciesWithRangeData = enrichedSpecies.filter(sp => sp.range_data_geojson);

  const exportForArcGIS = () => {
    const features = speciesWithRangeData.map(sp => ({
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
    })).filter(f => f.geometry);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <header className="bg-gradient-to-r from-white via-bangor-sun/5 to-white/80 backdrop-blur-sm border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-blue-700">ArcGIS Tools & API Functions</h1>
              <p className="text-sm text-slate-600">Interactive mapping and spatial analysis tools</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* IUCN Version Check Banner */}
        <div className="mb-4">
          <IUCNVersionBanner />
        </div>

        {/* IUCN File Fetcher + Missing Range Data Prompt */}
        {enrichedSpecies.length > 0 && speciesWithRangeData.length < enrichedSpecies.length && (
          <div className="space-y-4 mb-6">
            <IUCNRangeFetcher
              species={enrichedSpecies}
              onComplete={() => {
                refetchRangeData();
              }}
            />
            <MissingRangeDataPrompt 
              speciesCount={enrichedSpecies.length - speciesWithRangeData.length}
              onDataReady={() => window.location.reload()}
            />
          </div>
        )}

        {/* IUCN Bulk Data Source Selector */}
        <div className="mb-6">
          <Card className="shadow-lg border-indigo-200">
            <CardHeader className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="text-indigo-700 flex items-center gap-2">
                <Database className="w-5 h-5" />
                IUCN Spatial Data — Extract Range Polygons
              </CardTitle>
              <CardDescription>
                Choose your data source: use existing app data, pick a shared bulk file, or upload your own. 
                All bulk uploads are stored securely and shared with other users.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <IUCNBulkExtractPanel
                targetSpecies={enrichedSpecies.map(sp => sp.scientific_name)}
                onDone={() => { refetchRangeData(); refetchAssessments(); }}
              />
            </CardContent>
          </Card>
        </div>

        {/* ArcGIS Map Viewer */}
        <div className="mb-6">
          <Card className="shadow-lg border-blue-200">
            <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-blue-700 flex items-center gap-2">
                <Map className="w-5 h-5" />
                Interactive Species Map
              </CardTitle>
              <CardDescription>
                Visualize species range data on an interactive ArcGIS map
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {arcgisAgreed ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <select
                      className="px-3 py-2 border rounded-lg text-sm"
                      onChange={(e) => {
                        const species = speciesWithRangeData.find(sp => sp.id === e.target.value);
                        setSelectedSpecies(species);
                      }}
                      value={selectedSpecies?.id || ''}
                    >
                      <option value="">Select a species to view...</option>
                      {speciesWithRangeData.map(sp => (
                        <option key={sp.id} value={sp.id}>
                          {sp.common_name || sp.scientific_name} ({sp.iucn_status})
                        </option>
                      ))}
                    </select>
                    {selectedSpecies && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedSpecies(null)}
                      >
                        Clear Selection
                      </Button>
                    )}
                  </div>
                  
                  <ArcGISMap 
                    species={selectedSpecies} 
                    height="600px"
                    hasAgreedToTerms={arcgisAgreed}
                    onRequestTermsAgreement={() => setShowArcGISTerms(true)}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <Globe className="w-16 h-16 mx-auto mb-4 text-blue-300" />
                  <p className="text-slate-600 mb-4">Please accept ArcGIS terms of use to view the interactive map</p>
                  <Button onClick={() => setShowArcGISTerms(true)}>
                    Accept Terms & View Map
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* GIS Analysis Tools */}
        <div className="mb-6">
          <Card className="shadow-lg border-orange-200">
            <CardHeader className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50">
              <CardTitle className="text-orange-700 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                GIS Analysis Tools
              </CardTitle>
              <CardDescription>
                Perform spatial analysis on species data
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="hybridization" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="hybridization">🧬 Hybridization Zones</TabsTrigger>
                <TabsTrigger value="buffer">Buffer Analysis</TabsTrigger>
                <TabsTrigger value="overlay">Range Overlay</TabsTrigger>
                <TabsTrigger value="spatial-join">Spatial Join</TabsTrigger>
              </TabsList>

              <TabsContent value="hybridization" className="mt-4">
                <HybridizationMapper species={enrichedSpecies} />
              </TabsContent>
                
                <TabsContent value="buffer" className="mt-4">
                   <BufferAnalysis 
                     species={enrichedSpecies}
                     onResultReady={(result) => {
                       addResult({
                         name: `Buffer Analysis (${result.features.length} zones)`,
                         type: 'buffer',
                         data: result,
                         features: result.features
                       });
                     }}
                   />
                 </TabsContent>

                 <TabsContent value="overlay" className="mt-4">
                   <RangeOverlayAnalysis 
                     species={enrichedSpecies}
                     onResultReady={(result) => {
                       addResult({
                         name: `Range Overlay (${result.features.length} overlaps)`,
                         type: 'overlay',
                         data: result,
                         features: result.features
                       });
                     }}
                   />
                 </TabsContent>

                 <TabsContent value="spatial-join" className="mt-4">
                   <SpatialJoinAnalysis 
                     species={enrichedSpecies}
                     onResultReady={(result) => {
                       addResult({
                         name: `Spatial Join (${result.features.length} associations)`,
                         type: 'spatial_join',
                         data: result,
                         features: result.features
                       });
                     }}
                   />
                 </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Results */}
        {analysisResults.length > 0 && (
           <div className="mb-6">
             <AnalysisResultsViewer 
               results={analysisResults}
               onVisualize={(result) => {
                 toast.success(`Visualizing ${result.name}`);
                 // Could integrate with map viewer here
               }}
               onClear={clearResults}
             />
           </div>
         )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ArcGIS Export Tools */}
          <Card className="shadow-lg border-blue-200">
            <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-blue-700 flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export for ArcGIS
              </CardTitle>
              <CardDescription>
                Download species data in ArcGIS-compatible formats
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Button
                onClick={exportForArcGIS}
                disabled={speciesWithRangeData.length === 0}
                className="w-full justify-start bg-blue-600 hover:bg-blue-700"
              >
                <FileJson className="w-4 h-4 mr-2" />
                Export All Species Ranges (GeoJSON)
              </Button>

              <Button
                onClick={() => {
                  const occurrences = allSpecies
                    .filter(sp => sp.observations?.length > 0 || sp.gbif_occurrences?.length > 0)
                    .flatMap(sp => {
                      const points = [
                        ...(sp.observations || []).map(obs => ({
                          type: 'Feature',
                          properties: {
                            species: sp.scientific_name,
                            common_name: sp.common_name,
                            source: 'iNaturalist',
                            date: obs.observed_on
                          },
                          geometry: {
                            type: 'Point',
                            coordinates: [obs.longitude, obs.latitude]
                          }
                        })),
                        ...(sp.gbif_occurrences || []).map(occ => ({
                          type: 'Feature',
                          properties: {
                            species: sp.scientific_name,
                            common_name: sp.common_name,
                            source: 'GBIF',
                            date: occ.date
                          },
                          geometry: {
                            type: 'Point',
                            coordinates: [occ.longitude, occ.latitude]
                          }
                        }))
                      ];
                      return points;
                    });

                  const geojson = {
                    type: 'FeatureCollection',
                    features: occurrences
                  };

                  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `arcgis_occurrences_${Date.now()}.geojson`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="w-full justify-start bg-emerald-600 hover:bg-emerald-700"
                disabled={!allSpecies.some(sp => sp.observations?.length > 0 || sp.gbif_occurrences?.length > 0)}
              >
                <Layers className="w-4 h-4 mr-2" />
                Export All Occurrences (Point Data)
              </Button>

              <div className="pt-3 border-t">
                <p className="text-xs text-slate-500 mb-2">
                  <Info className="w-3 h-3 inline mr-1" />
                  Available species with range data: <strong>{speciesWithRangeData.length}</strong>
                </p>
                <p className="text-xs text-slate-500">
                  <Info className="w-3 h-3 inline mr-1" />
                  Total occurrence points: <strong>
                    {allSpecies.reduce((sum, sp) => 
                      sum + (sp.observations?.length || 0) + (sp.gbif_occurrences?.length || 0), 0
                    ).toLocaleString()}
                  </strong>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ArcGIS API Functions */}
          <Card className="shadow-lg border-blue-200">
            <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-blue-700 flex items-center gap-2">
                <Code className="w-5 h-5" />
                ArcGIS API Resources
              </CardTitle>
              <CardDescription>
                Direct access to ArcGIS platform capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <a
                href="https://developers.arcgis.com/rest/"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  ArcGIS REST API Documentation
                </Button>
              </a>

              <a
                href="https://developers.arcgis.com/javascript/latest/"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full justify-start">
                  <Code className="w-4 h-4 mr-2" />
                  ArcGIS JavaScript API
                </Button>
              </a>

              <a
                href="https://developers.arcgis.com/documentation/mapping-apis-and-services/geocoding/"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full justify-start">
                  <Map className="w-4 h-4 mr-2" />
                  Geocoding Services
                </Button>
              </a>

              <a
                href="https://developers.arcgis.com/documentation/mapping-apis-and-services/spatial-analysis/"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full justify-start">
                  <Layers className="w-4 h-4 mr-2" />
                  Spatial Analysis Tools
                </Button>
              </a>

              <a
                href="https://www.arcgis.com/home/gallery.html"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full justify-start">
                  <Share2 className="w-4 h-4 mr-2" />
                  ArcGIS Living Atlas
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-lg border-blue-200">
            <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-blue-700 flex items-center gap-2">
                <ZoomIn className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Button
                onClick={() => {
                  if (!arcgisAgreed) {
                    setShowArcGISTerms(true);
                    return;
                  }
                  if (speciesWithRangeData.length > 0) {
                    setSelectedSpecies(speciesWithRangeData[0]);
                    // Scroll to map
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="w-full justify-start bg-indigo-600 hover:bg-indigo-700"
                disabled={speciesWithRangeData.length === 0}
              >
                <Map className="w-4 h-4 mr-2" />
                View First Species on Map
              </Button>

              <Button
                onClick={() => {
                  if (!arcgisAgreed) {
                    setShowArcGISTerms(true);
                    return;
                  }
                  const randomSpecies = speciesWithRangeData[
                    Math.floor(Math.random() * speciesWithRangeData.length)
                  ];
                  setSelectedSpecies(randomSpecies);
                  // Scroll to map
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                disabled={speciesWithRangeData.length === 0}
              >
                <Globe className="w-4 h-4 mr-2" />
                Random Species Explorer
              </Button>

              <Button
                onClick={() => {
                  if (!arcgisAgreed) {
                    setShowArcGISTerms(true);
                    return;
                  }
                  const endangered = speciesWithRangeData.filter(sp => 
                    ['CR', 'EN', 'VU'].includes(sp.iucn_status)
                  );
                  if (endangered.length > 0) {
                    setSelectedSpecies(endangered[0]);
                    // Scroll to map
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="w-full justify-start bg-red-600 hover:bg-red-700"
                disabled={!speciesWithRangeData.some(sp => ['CR', 'EN', 'VU'].includes(sp.iucn_status))}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Threatened Species
              </Button>

              <Button
                onClick={() => {
                  // Export all threatened species for ArcGIS
                  const threatened = speciesWithRangeData.filter(sp => 
                    ['CR', 'EN', 'VU'].includes(sp.iucn_status)
                  );
                  
                  if (threatened.length === 0) return;

                  const features = threatened.map(sp => ({
                    type: 'Feature',
                    properties: {
                      scientific_name: sp.scientific_name,
                      common_name: sp.common_name,
                      iucn_status: sp.iucn_status,
                      population_trend: sp.population_trend,
                      family: sp.family,
                      threats: sp.threats
                    },
                    geometry: sp.range_data_geojson.type === 'FeatureCollection' 
                      ? sp.range_data_geojson.features[0]?.geometry 
                      : sp.range_data_geojson.geometry
                  })).filter(f => f.geometry);

                  const geojson = {
                    type: 'FeatureCollection',
                    features
                  };

                  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `threatened_species_${Date.now()}.geojson`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="w-full justify-start bg-orange-600 hover:bg-orange-700"
                disabled={!speciesWithRangeData.some(sp => ['CR', 'EN', 'VU'].includes(sp.iucn_status))}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Threatened Species Only
              </Button>
            </CardContent>
          </Card>

          {/* Database Stats */}
          <Card className="shadow-lg border-blue-200">
            <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-blue-700 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Spatial Data Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-sm text-slate-600">Total Species in Database</span>
                  <span className="text-2xl font-bold text-slate-900">{allSpecies.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-sm text-slate-600">Species with Range Data</span>
                  <span className="text-2xl font-bold text-blue-600">{speciesWithRangeData.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-sm text-slate-600">With iNaturalist Observations</span>
                  <span className="text-2xl font-bold text-green-600">
                    {allSpecies.filter(sp => sp.observations?.length > 0).length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-slate-600">With GBIF Occurrences</span>
                  <span className="text-2xl font-bold text-amber-600">
                    {allSpecies.filter(sp => sp.gbif_occurrences?.length > 0).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Information Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-700">About ArcGIS Integration</AlertTitle>
          <AlertDescription className="text-slate-700">
            This page provides direct access to ArcGIS mapping capabilities for your species data. 
            Export GeoJSON files for use in ArcGIS Online, ArcGIS Pro, or other GIS software. 
            Use the interactive map viewer to explore species ranges and occurrence points. 
            Access ArcGIS REST APIs, JavaScript SDK, and spatial analysis tools through the links above.
          </AlertDescription>
        </Alert>
      </main>

      {/* Split view — full screen IUCN + checklist side by side */}
      {showSplitView && (
        <IUCNSplitView
          species={enrichedSpecies}
          rangeData={allRangeData}
          assessmentData={allAssessments}
          onClose={() => setShowSplitView(false)}
          onUploaded={() => {
            refetchRangeData();
            refetchAssessments();
          }}
        />
      )}

      {/* Sticky IUCN Manual Download Checklist */}
      {allSpecies.length > 0 && !showSplitView && (
        <IUCNManualDownloadChecklist
          species={enrichedSpecies}
          rangeData={allRangeData}
          assessmentData={allAssessments}
          onOpenSplitView={() => setShowSplitView(true)}
          onUploaded={() => {
            refetchRangeData();
            refetchAssessments();
          }}
        />
      )}

      {/* ArcGIS Terms Modal */}
      <ArcGISTermsModal 
        open={showArcGISTerms}
        onClose={() => setShowArcGISTerms(false)}
        onAgree={() => {
          setArcgisAgreed(true);
          setShowArcGISTerms(false);
        }}
      />
    </div>
  );
}