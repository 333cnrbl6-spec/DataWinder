import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Upload, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function SpeciesIdentificationLab() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [locationInput, setLocationInput] = useState('');
  const [habitatInput, setHabitatInput] = useState('');
  const [identification, setIdentification] = useState(null);

  const fileInputRef = React.useRef(null);

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const response = await base44.integrations.Core.UploadFile({ file });
      return response.data.file_url;
    }
  });

  const identifyMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedImage) {
        toast.error('Please upload an image first');
        return;
      }
      
      const response = await base44.functions.invoke('identifySpeciesFromImage', {
        image_url: uploadedImage,
        location: locationInput,
        habitat_type: habitatInput
      });
      
      return response.data;
    },
    onSuccess: (data) => {
      setIdentification(data.identification);
      toast.success('Species identified!');
    },
    onError: (error) => {
      toast.error('Identification failed: ' + error.message);
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadMutation.mutateAsync(file);
      setUploadedImage(url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    }
  };

  const saveIdentification = async () => {
    if (!identification) return;

    try {
      await base44.entities.Occurrence?.create?.({
        species_name: identification.scientific_name,
        latitude: 0,
        longitude: 0,
        observation_date: new Date().toISOString(),
        observer_name: 'AI Lab',
        image_urls: [uploadedImage],
        ai_identified: true,
        ai_confidence: identification.confidence,
        conservation_status: identification.uk_conservation_status,
        threat_level: identification.threat_level,
        notes: `AI identified: ${identification.scientific_name} (${identification.common_name})`
      });

      toast.success('Observation saved!');
      setUploadedImage(null);
      setIdentification(null);
    } catch (error) {
      toast.error('Save failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-bangor-red" />
            AI Species Identification
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Upload Field Photo
            </label>
            
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-bangor-red hover:bg-red-50 transition"
            >
              {uploadedImage ? (
                <div className="space-y-3">
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded" 
                    className="h-32 w-32 mx-auto rounded-lg object-cover"
                  />
                  <p className="text-sm text-slate-600">Image ready for analysis</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-medium text-slate-900">
                    Drop image here or click to upload
                  </p>
                  <p className="text-xs text-slate-500">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadMutation.isPending}
              />
            </div>

            {uploadMutation.isPending && (
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </div>
            )}
          </div>

          {/* Context Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Location (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Sherwood Forest, Nottinghamshire"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Habitat Type (Optional)
              </label>
              <select
                value={habitatInput}
                onChange={(e) => setHabitatInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">Select habitat</option>
                <option value="woodland">Woodland</option>
                <option value="wetland">Wetland</option>
                <option value="coastal">Coastal</option>
                <option value="grassland">Grassland</option>
                <option value="urban">Urban</option>
              </select>
            </div>
          </div>

          {/* Identify Button */}
          <Button
            onClick={() => identifyMutation.mutate()}
            disabled={!uploadedImage || identifyMutation.isPending}
            className="w-full gap-2 bg-bangor-red hover:bg-bangor-red/90 h-10"
          >
            {identifyMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Identify Species
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {identification && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Species Identified
              </span>
              <Badge className="bg-green-100 text-green-700">
                {Math.round(identification.confidence * 100)}% Confidence
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600 mb-1">Scientific Name</p>
                <p className="text-lg font-semibold text-slate-900">
                  {identification.scientific_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Common Name</p>
                <p className="text-lg font-semibold text-slate-900">
                  {identification.common_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Conservation Status</p>
                <Badge className="bg-amber-100 text-amber-700">
                  {identification.uk_conservation_status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Threat Level</p>
                <Badge className={`text-white ${
                  identification.threat_level === 'critical' ? 'bg-red-600' :
                  identification.threat_level === 'high' ? 'bg-orange-500' :
                  identification.threat_level === 'medium' ? 'bg-yellow-500' :
                  'bg-green-600'
                }`}>
                  {identification.threat_level}
                </Badge>
              </div>
            </div>

            {/* Identifying Features */}
            <div>
              <p className="font-semibold text-slate-900 mb-2">Identifying Features</p>
              <ul className="space-y-1">
                {identification.identifying_features?.map((feature, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-bangor-red mt-1">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Similar Species */}
            {identification.similar_species && (
              <div>
                <p className="font-semibold text-slate-900 mb-2">Similar Species to Distinguish From</p>
                <div className="flex flex-wrap gap-2">
                  {identification.similar_species.map((species, idx) => (
                    <Badge key={idx} variant="outline">{species}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Notes */}
            {identification.additional_notes && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-900 font-semibold mb-1">Additional Notes</p>
                <p className="text-sm text-blue-800">{identification.additional_notes}</p>
              </div>
            )}

            {/* Save Button */}
            <Button
              onClick={saveIdentification}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              Save Observation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}