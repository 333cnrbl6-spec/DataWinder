import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ArrowLeftRight, AlertTriangle, MapPin, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from './StatusBadge';

const ComparisonRow = ({ label, values, highlight = false }) => {
  const allSame = values.every(v => v === values[0]);
  
  const colClass = values.length === 1 ? 'grid-cols-2' : values.length === 2 ? 'grid-cols-3' : values.length === 3 ? 'grid-cols-4' : 'grid-cols-5';
  return (
    <div className={`grid ${colClass} gap-4 py-3 border-b border-slate-100`}>
      <div className="font-medium text-slate-700">{label}</div>
      {values.map((value, idx) => (
        <div 
          key={idx}
          className={`${highlight && !allSame ? 'bg-amber-50 rounded px-2 py-1' : ''}`}
        >
          {value}
        </div>
      ))}
    </div>
  );
};

const TrendIcon = ({ trend }) => {
  if (trend === 'increasing') return <TrendingUp className="w-4 h-4 text-green-600" />;
  if (trend === 'decreasing') return <TrendingDown className="w-4 h-4 text-red-600" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
};

export default function CompareSpecies({ species, onClose, onRemove }) {
  if (species.length < 2) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-slate-600">Select at least 2 species to compare</p>
              <Button onClick={onClose} className="mt-4">Close</Button>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-6xl max-h-[90vh] overflow-hidden"
        >
          <Card>
            <CardHeader className="border-b bg-slate-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
                  Compare Species
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                Side-by-side comparison of {species.length} species
              </p>
            </CardHeader>

            <CardContent className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Species Headers */}
              <div className={`grid ${species.length === 1 ? 'grid-cols-2' : species.length === 2 ? 'grid-cols-3' : species.length === 3 ? 'grid-cols-4' : 'grid-cols-5'} gap-4 mb-6`}>
                <div></div>
                {species.map((sp, idx) => (
                  <Card key={idx} className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(sp)}
                      className="absolute top-2 right-2 h-6 w-6 z-10"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    {sp.image_url && (
                      <img 
                        src={sp.image_url} 
                        alt={sp.scientific_name}
                        className="w-full h-32 object-cover rounded-t-lg"
                      />
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-900 mb-1">{sp.scientific_name}</h3>
                      {sp.common_name && (
                        <p className="text-sm text-slate-500 mb-2">{sp.common_name}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <StatusBadge status={sp.iucn_status} size="sm" />
                        <span className="text-xs text-slate-400">{sp.data_source}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Taxonomy Comparison */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Taxonomy</h3>
                <div className="space-y-0">
                  <ComparisonRow 
                    label="Kingdom" 
                    values={species.map(sp => sp.kingdom || 'N/A')}
                  />
                  <ComparisonRow 
                    label="Phylum" 
                    values={species.map(sp => sp.phylum || 'N/A')}
                  />
                  <ComparisonRow 
                    label="Class" 
                    values={species.map(sp => sp.class_name || 'N/A')}
                    highlight
                  />
                  <ComparisonRow 
                    label="Order" 
                    values={species.map(sp => sp.order_name || 'N/A')}
                    highlight
                  />
                  <ComparisonRow 
                    label="Family" 
                    values={species.map(sp => sp.family || 'N/A')}
                    highlight
                  />
                  <ComparisonRow 
                    label="Genus" 
                    values={species.map(sp => sp.genus || 'N/A')}
                    highlight
                  />
                </div>
              </div>

              {/* Conservation Status */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Conservation Status</h3>
                <div className="space-y-0">
                  <ComparisonRow 
                    label="IUCN Status" 
                    values={species.map(sp => (
                      <StatusBadge key={sp.scientific_name} status={sp.iucn_status} showLabel size="sm" />
                    ))}
                    highlight
                  />
                  <ComparisonRow 
                    label="Population Trend" 
                    values={species.map(sp => (
                      <div key={sp.scientific_name} className="flex items-center gap-2">
                        <TrendIcon trend={sp.population_trend} />
                        <span className="capitalize">{sp.population_trend || 'unknown'}</span>
                      </div>
                    ))}
                    highlight
                  />
                  {species.some(sp => sp.assessment_date) && (
                    <ComparisonRow 
                      label="Assessment Date" 
                      values={species.map(sp => sp.assessment_date || 'N/A')}
                    />
                  )}
                </div>
              </div>

              {/* Habitat & Range */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Habitat & Distribution</h3>
                <div className="space-y-0">
                  <ComparisonRow 
                    label="Habitat" 
                    values={species.map(sp => (
                      <div key={sp.scientific_name} className="text-sm text-slate-600 max-h-20 overflow-y-auto">
                        {sp.habitat || 'No data'}
                      </div>
                    ))}
                    highlight
                  />
                  <ComparisonRow 
                    label="Range" 
                    values={species.map(sp => (
                      <div key={sp.scientific_name} className="text-sm text-slate-600 max-h-20 overflow-y-auto">
                        {sp.range_description || 'No data'}
                      </div>
                    ))}
                    highlight
                  />
                </div>
              </div>

              {/* Threats */}
              {species.some(sp => sp.threats) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Threats
                  </h3>
                  <div className="space-y-0">
                    <ComparisonRow 
                      label="Known Threats" 
                      values={species.map(sp => (
                        <div key={sp.scientific_name} className="text-sm text-slate-600 max-h-32 overflow-y-auto">
                          {sp.threats || 'No data'}
                        </div>
                      ))}
                      highlight
                    />
                  </div>
                </div>
              )}

              {/* Conservation Actions */}
              {species.some(sp => sp.conservation_actions) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Conservation Actions</h3>
                  <div className="space-y-0">
                    <ComparisonRow 
                      label="Actions Taken" 
                      values={species.map(sp => (
                        <div key={sp.scientific_name} className="text-sm text-slate-600 max-h-32 overflow-y-auto">
                          {sp.conservation_actions || 'No data'}
                        </div>
                      ))}
                    />
                  </div>
                </div>
              )}

              {/* Data Source Info */}
              {species.some(sp => sp.observation_count) && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Observation Data</h3>
                  <div className="space-y-0">
                    <ComparisonRow 
                      label="Total Observations" 
                      values={species.map(sp => sp.observation_count || 'N/A')}
                    />
                    <ComparisonRow 
                      label="Last Observed" 
                      values={species.map(sp => sp.last_observed || 'N/A')}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}