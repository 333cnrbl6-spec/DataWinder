import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, AlertTriangle, Zap, Globe } from 'lucide-react';

export default function ComparisonResults({ gbifData, iucnData, internalObservations = [] }) {
  if (!gbifData?.success && !iucnData?.success) {
    return null;
  }

  const statusColors = {
    EX: 'bg-gray-600',
    EW: 'bg-red-700',
    CR: 'bg-red-600',
    EN: 'bg-red-500',
    VU: 'bg-orange-500',
    NT: 'bg-yellow-500',
    LC: 'bg-green-500',
    DD: 'bg-slate-500',
    NE: 'bg-slate-400',
  };

  return (
    <div className="space-y-4">
      
      {/* GBIF Results */}
      {gbifData?.success && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              GBIF Global Occurrences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Species Info */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="font-semibold text-slate-900 text-sm">
                {gbifData.species.scientific_name}
              </p>
              {gbifData.species.family && (
                <p className="text-xs text-slate-600 mt-1">
                  Family: {gbifData.species.family}
                </p>
              )}
            </div>

            {/* Occurrence Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-600">Global Records</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {gbifData.occurrences.total_count.toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-600">Your Records</p>
                <p className="text-2xl font-bold text-bangor-red mt-1">
                  {internalObservations.length}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-600">Coverage %</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {gbifData.occurrences.total_count > 0 
                    ? ((internalObservations.length / gbifData.occurrences.total_count) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>

            {/* Map Distribution */}
            {gbifData.occurrences.records.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Geographic Distribution (Top Countries)
                </p>
                <div className="space-y-1 text-xs">
                  {[...new Set(gbifData.occurrences.records.map(r => r.country))]
                    .slice(0, 5)
                    .map(country => (
                      <div key={country} className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-600">{country || 'Unknown'}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Data Source Breakdown */}
            {gbifData.occurrences.records.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Data Sources
                </p>
                <div className="space-y-1 text-xs">
                  {[...new Set(gbifData.occurrences.records.map(r => r.basis))]
                    .slice(0, 5)
                    .map(basis => (
                      <div key={basis} className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {basis || 'Unknown'}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* IUCN Results */}
      {iucnData?.success && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              IUCN Conservation Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <div className={`${statusColors[iucnData.conservation_status.iucn_status]} text-white px-4 py-2 rounded-lg`}>
                <p className="text-sm font-bold">
                  {iucnData.conservation_status.iucn_status}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {iucnData.species.scientific_name}
                </p>
                <p className="text-xs text-slate-600">
                  Assessed: {iucnData.conservation_status.assessment_year}
                </p>
              </div>
            </div>

            {/* Population & Trend */}
            {iucnData.conservation_status.population_trend && (
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-1">Population Trend</p>
                <Badge className={
                  iucnData.conservation_status.population_trend === 'Increasing' ? 'bg-green-100 text-green-800' :
                  iucnData.conservation_status.population_trend === 'Decreasing' ? 'bg-red-100 text-red-800' :
                  iucnData.conservation_status.population_trend === 'Stable' ? 'bg-blue-100 text-blue-800' :
                  'bg-slate-100 text-slate-800'
                }>
                  {iucnData.conservation_status.population_trend}
                </Badge>
              </div>
            )}

            {/* Threats */}
            {iucnData.conservation_status.threats.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Primary Threats
                </p>
                <div className="space-y-1 text-xs">
                  {iucnData.conservation_status.threats.slice(0, 5).map((threat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Zap className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
                      <span className="text-slate-600">{threat.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conservation Actions */}
            {iucnData.conservation_status.conservation_actions.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Conservation Actions
                </p>
                <div className="space-y-1 text-xs">
                  {iucnData.conservation_status.conservation_actions.slice(0, 5).map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs">
                        {action.title}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Geographic Range */}
            {iucnData.geographic_range.countries.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Native Range ({iucnData.geographic_range.countries.length} countries)
                </p>
                <div className="flex flex-wrap gap-1">
                  {iucnData.geographic_range.countries.slice(0, 10).map((country, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {country}
                    </Badge>
                  ))}
                  {iucnData.geographic_range.countries.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{iucnData.geographic_range.countries.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}