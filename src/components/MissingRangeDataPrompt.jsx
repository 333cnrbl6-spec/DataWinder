import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileJson, Upload, Map, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import SmartDropZone from '@/components/SmartDropZone';

export default function MissingRangeDataPrompt({ speciesCount, onDataReady }) {
  const [showDropZone, setShowDropZone] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="shadow-lg border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/30">
        <CardHeader className="border-b border-amber-100">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-amber-900">Range Data Not Available</CardTitle>
                <CardDescription className="mt-1">
                  {speciesCount} species are missing range polygon/shapefile data from IUCN
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Alert className="border-amber-300 bg-white">
            <HelpCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900">What range data is needed?</AlertTitle>
            <AlertDescription className="text-slate-700 mt-2">
              <p className="text-sm mb-2">IUCN provides range data in these formats:</p>
              <ul className="text-xs space-y-1 ml-4 list-disc">
                <li><strong>Shapefile (.shp/.shx/.dbf)</strong> — Polygon boundaries of species range</li>
                <li><strong>GeoJSON</strong> — Vector polygon data in JSON format</li>
                <li><strong>Range CSV</strong> — Point-based range data with coordinates</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-3">
            <div className="flex items-start gap-3">
              <Map className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900">How to get IUCN range data:</p>
                <ol className="text-xs text-slate-600 space-y-1 mt-1 ml-4 list-decimal">
                  <li>Visit <a href="https://www.iucnredlist.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">IUCN Red List</a></li>
                  <li>Search for your species</li>
                  <li>Find "Download range map" or "Range data (SHP)" link</li>
                  <li>Download the ZIP file containing shapefiles</li>
                </ol>
              </div>
            </div>
          </div>

          {!showDropZone ? (
            <Button
              onClick={() => setShowDropZone(true)}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Range Data Files
            </Button>
          ) : (
            <div className="space-y-3">
              <SmartDropZone 
                onUploadComplete={() => {
                  setShowDropZone(false);
                  onDataReady?.();
                }}
              />
              <Button
                variant="outline"
                onClick={() => setShowDropZone(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 border border-slate-200">
            <p className="font-medium text-slate-900 mb-1">Supported formats:</p>
            <p>ZIP archives, Shapefiles (.shp, .shx, .dbf), GeoJSON, and CSV files will be automatically processed and linked to species.</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}