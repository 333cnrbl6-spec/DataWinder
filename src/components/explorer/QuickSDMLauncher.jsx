import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function QuickSDMLauncher({
  speciesIds,
  allSpecies,
  onClose
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedBioVars, setSelectedBioVars] = useState([
    'bio1', 'bio12', 'bio4', 'bio15'
  ]);

  const bioVarOptions = [
    { code: 'bio1', label: 'Annual Mean Temperature' },
    { code: 'bio2', label: 'Mean Diurnal Range' },
    { code: 'bio4', label: 'Temperature Seasonality' },
    { code: 'bio12', label: 'Annual Precipitation' },
    { code: 'bio13', label: 'Precipitation of Wettest Month' },
    { code: 'bio14', label: 'Precipitation of Driest Month' },
    { code: 'bio15', label: 'Precipitation Seasonality' }
  ];

  const selectedSpecies = allSpecies.filter(s => speciesIds.includes(s.id));
  const speciesNames = selectedSpecies.map(s => s.scientific_name || s.common_name).join(', ');

  const handleToggleBioVar = (code) => {
    if (selectedBioVars.includes(code)) {
      setSelectedBioVars(selectedBioVars.filter(v => v !== code));
    } else {
      setSelectedBioVars([...selectedBioVars, code]);
    }
  };

  const handleLaunchSDM = async () => {
    if (selectedBioVars.length < 2) {
      setError('Please select at least 2 bioclimatic variables');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await base44.functions.invoke('runSDMPipeline', {
        species_ids: speciesIds,
        bioclim_vars: selectedBioVars,
        parameters: {
          outlier_handling: 'distance',
          thinning_km: 10,
          regularization: 1.0,
          test_fraction: 0.3
        }
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          // Navigate to SDMPipeline page
          window.location.href = '/SDMPipeline';
        }, 2000);
      } else {
        setError(response.data.error || 'Failed to launch SDM pipeline');
      }
    } catch (err) {
      setError(err.message || 'Error launching SDM pipeline');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Launch SDM Model</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {success ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
              <div>
                <h3 className="font-bold text-slate-900">Model Launched!</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Your SDM pipeline is running. Redirecting...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Species Summary */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm font-semibold text-blue-900">Species to Model</div>
                <div className="text-sm text-blue-700 mt-1">{speciesNames}</div>
              </div>

              {/* Bioclimatic Variables */}
              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-3">
                  Bioclimatic Variables (minimum 2)
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {bioVarOptions.map(option => (
                    <label key={option.code} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded">
                      <input
                        type="checkbox"
                        checked={selectedBioVars.includes(option.code)}
                        onChange={() => handleToggleBioVar(option.code)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">
                        <span className="font-semibold">{option.code}:</span> {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLaunchSDM}
                  disabled={loading || selectedBioVars.length < 2}
                  className="flex-1 gap-2 bg-bangor-red hover:bg-bangor-red/90"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Launching...' : 'Launch Model'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}