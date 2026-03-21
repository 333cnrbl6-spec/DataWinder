import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Layers, Thermometer, Droplets, Leaf, Map, Wind, Download, CheckCircle2 } from 'lucide-react';
import BackendFetchButton from '@/components/climate/BackendFetchButton';

const categoryIcons = {
  'Bioclimatic': <Layers className="w-4 h-4" />,
  'Temperature': <Thermometer className="w-4 h-4" />,
  'Precipitation': <Droplets className="w-4 h-4" />,
  'Vegetation/NDVI': <Leaf className="w-4 h-4" />,
  'Land Cover': <Map className="w-4 h-4" />,
  'Aridity': <Wind className="w-4 h-4" />,
  'Compound': <Layers className="w-4 h-4" />,
};

const scenarioColors = {
  'Historical/Baseline': 'bg-slate-100 text-slate-700',
  'SSP1-2.6': 'bg-green-100 text-green-800',
  'SSP2-4.5': 'bg-yellow-100 text-yellow-800',
  'SSP3-7.0': 'bg-orange-100 text-orange-800',
  'SSP5-8.5': 'bg-red-100 text-red-800',
  'Multiple SSPs': 'bg-purple-100 text-purple-800',
  'All SSPs': 'bg-blue-100 text-blue-800',
};

export default function ClimateSourceCard({ source, onSelect, isSelected, datasetId }) {
  return (
    <Card
      onClick={() => onSelect(source)}
      className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
        isSelected ? 'border-bangor-red bg-bangor-red/5' : 'border-transparent hover:border-bangor-sun/50'
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isSelected && <CheckCircle2 className="w-4 h-4 text-bangor-red shrink-0" />}
            <CardTitle className="text-sm font-semibold text-slate-800 leading-snug">{source.name}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">{source.provider}</Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge className={`text-xs ${scenarioColors[source.scenario] || 'bg-slate-100 text-slate-700'}`}>
            {source.scenario}
          </Badge>
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            {categoryIcons[source.category]}
            {source.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <p className="text-xs text-slate-600 leading-relaxed">{source.description}</p>

        <div className="grid grid-cols-2 gap-1 text-xs">
          {source.resolution && (
            <div><span className="text-slate-500">Resolution: </span><span className="font-medium">{source.resolution}</span></div>
          )}
          {source.timePeriod && (
            <div><span className="text-slate-500">Period: </span><span className="font-medium">{source.timePeriod}</span></div>
          )}
          {source.gcm && (
            <div className="col-span-2"><span className="text-slate-500">GCM(s): </span><span className="font-medium">{source.gcm}</span></div>
          )}
        </div>

        {source.variables && (
          <div className="flex flex-wrap gap-1">
            {source.variables.slice(0, 4).map((v, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{v}</Badge>
            ))}
            {source.variables.length > 4 && (
              <Badge variant="secondary" className="text-xs">+{source.variables.length - 4} more</Badge>
            )}
          </div>
        )}

        {source.maxentReady && (
          <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            MAXENT Compatible
          </div>
        )}

        <div className="flex gap-2 mt-1" onClick={e => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={(e) => { e.stopPropagation(); window.open(source.url, '_blank'); }}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Visit Portal
          </Button>
          <BackendFetchButton source={source} datasetId={datasetId} />
        </div>
      </CardContent>
    </Card>
  );
}