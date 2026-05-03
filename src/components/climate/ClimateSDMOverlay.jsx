import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Layers2, Eye, EyeOff } from 'lucide-react';

export default function ClimateSDMOverlay({ 
  sdmRun, 
  selectedBioclim, 
  climateData = null 
}) {
  const [sdmOpacity, setSdmOpacity] = useState(0.7);
  const [climateOpacity, setClimateOpacity] = useState(0.8);
  const [viewMode, setViewMode] = useState('overlay'); // 'overlay', 'split', 'toggle'
  const [activeLayer, setActiveLayer] = useState('sdm'); // for toggle mode

  if (!sdmRun) {
    return (
      <Card className="border-dashed border-2 border-slate-200">
        <CardContent className="py-12 text-center">
          <p className="text-slate-400 text-sm">Select an SDM run to compare with climate data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers2 className="w-4 h-4 text-bangor-red" />
            Climate-SDM Comparison
          </div>
          <Badge className="bg-slate-100 text-slate-800 text-xs">{selectedBioclim.toUpperCase()}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-lg h-9">
            <TabsTrigger value="overlay" className="text-xs">Overlay</TabsTrigger>
            <TabsTrigger value="split" className="text-xs">Split View</TabsTrigger>
            <TabsTrigger value="toggle" className="text-xs">Toggle</TabsTrigger>
          </TabsList>

          {/* Overlay View */}
          <TabsContent value="overlay" className="space-y-3">
            <div className="relative bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg overflow-hidden border border-slate-200 aspect-video flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600 mb-2">Climate Layer</p>
                <div className="w-32 h-24 mx-auto bg-gradient-to-b from-blue-300 via-green-300 to-red-300 rounded-lg opacity-60 border border-slate-300" />
                <p className="text-xs text-slate-400 mt-2">with SDM overlay</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-600">Climate Layer Opacity</p>
                  <Badge variant="outline" className="text-xs">{Math.round(climateOpacity * 100)}%</Badge>
                </div>
                <Slider
                  value={[climateOpacity]}
                  onValueChange={(v) => setClimateOpacity(v[0])}
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-600">SDM Prediction Opacity</p>
                  <Badge variant="outline" className="text-xs">{Math.round(sdmOpacity * 100)}%</Badge>
                </div>
                <Slider
                  value={[sdmOpacity]}
                  onValueChange={(v) => setSdmOpacity(v[0])}
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Tip:</strong> Adjust opacity to identify climate-suitability correlations. High overlap suggests climate-driven distribution.
              </p>
            </div>
          </TabsContent>

          {/* Split View */}
          <TabsContent value="split" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg overflow-hidden border border-slate-200 aspect-video flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Climate Layer</p>
                  <div className="w-16 h-12 mx-auto bg-gradient-to-b from-blue-300 via-green-300 to-red-300 rounded opacity-70 border border-slate-300" />
                </div>
              </div>

              <div className="relative bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg overflow-hidden border border-slate-200 aspect-video flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-600 mb-2">SDM Prediction</p>
                  <div className="w-16 h-12 mx-auto bg-gradient-to-b from-yellow-300 via-orange-300 to-red-400 rounded opacity-70 border border-slate-300" />
                </div>
              </div>
            </div>

            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700">
                <strong>Side-by-side:</strong> Compare climate gradients directly with species suitability zones. Identify mismatches indicating other limiting factors.
              </p>
            </div>
          </TabsContent>

          {/* Toggle View */}
          <TabsContent value="toggle" className="space-y-3">
            <div className="relative bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg overflow-hidden border border-slate-200 aspect-video flex items-center justify-center">
              {activeLayer === 'climate' ? (
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-600 mb-2">{selectedBioclim.toUpperCase()} Climate Layer</p>
                  <div className="w-32 h-24 mx-auto bg-gradient-to-b from-blue-300 via-green-300 to-red-300 rounded-lg opacity-80 border border-slate-300" />
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-600 mb-2">SDM Prediction</p>
                  <div className="w-32 h-24 mx-auto bg-gradient-to-b from-yellow-300 via-orange-300 to-red-400 rounded-lg opacity-80 border border-slate-300" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveLayer('climate')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeLayer === 'climate'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Eye className="w-3 h-3 inline mr-1" />
                Climate
              </button>
              <button
                onClick={() => setActiveLayer('sdm')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeLayer === 'sdm'
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Eye className="w-3 h-3 inline mr-1" />
                SDM
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                <strong>Quick compare:</strong> Click between layers to identify which climate variables best align with species suitable habitat.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500">Climate Range</p>
            <p className="text-sm font-bold text-slate-800">-20 to 45°C</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500">Overlap</p>
            <p className="text-sm font-bold text-slate-800">68%</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500">Correlation</p>
            <p className="text-sm font-bold text-slate-800">0.74</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}