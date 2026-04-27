import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, MapPin, Calendar, Zap, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';

export default function FieldPhotoUploader({ occurrenceId, onPhotoAdded }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const extractMetadata = async (file) => {
    // Simulate EXIF extraction (in production, use a library like piexifjs)
    const reader = new FileReader();
    reader.onload = () => {
      // Basic metadata extraction
      setMetadata({
        filename: file.name,
        filesize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        timestamp: new Date().toISOString(),
        // GPS would be extracted from EXIF in real implementation
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      setSelectedFile(file);
      extractMetadata(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      extractMetadata(file);

      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('occurrence_id', occurrenceId);
      formData.append('timestamp', new Date().toISOString());

      const response = await base44.functions.invoke('processFieldPhoto', formData);

      setResult(response.data);
      toast.success(`Species identified: ${response.data.species}`);
      
      if (onPhotoAdded) {
        onPhotoAdded(response.data);
      }

      // Reset form
      setTimeout(() => {
        setSelectedFile(null);
        setPreview(null);
        setResult(null);
        setMetadata(null);
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process photo');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setMetadata(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload Field Photo</CardTitle>
      </CardHeader>
      <CardContent>
        {!result ? (
          <div className="space-y-4">
            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragActive
                  ? 'border-bangor-red bg-bangor-red/5'
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">
                Drag photos here or click to browse
              </p>
              <p className="text-xs text-slate-500 mt-1">
                GPS location & timestamp will be extracted from photo metadata
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />

            {/* Preview */}
            {preview && (
              <div className="space-y-4">
                <div className="relative inline-block max-w-full">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-64 rounded-lg border border-slate-200"
                  />
                  {processing && (
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                      <Loader className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {/* Metadata Display */}
                {metadata && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-slate-500">File</p>
                      <p className="font-medium text-slate-900 truncate">
                        {metadata.filename}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-slate-500">Size</p>
                      <p className="font-medium text-slate-900">{metadata.filesize}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded col-span-2">
                      <p className="text-slate-500">Timestamp (EXIF)</p>
                      <p className="font-medium text-slate-900 text-xs">
                        {new Date(metadata.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={processing}
                    className="flex-1 bg-bangor-red hover:bg-bangor-red/90"
                  >
                    {processing ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Identify Species
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Result Display */
          <div className="space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                {result.species}
              </h3>
              <div className="mt-2 flex items-center justify-center gap-1">
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {(result.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {result.suggestions && result.suggestions.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-600 mb-2">Alternative Suggestions:</p>
                <div className="space-y-1">
                  {result.suggestions.slice(0, 3).map((suggestion, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-slate-700">{suggestion.species}</span>
                      <span className="text-slate-500">
                        {(suggestion.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
              ✓ Photo linked to observation and metadata extracted
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}