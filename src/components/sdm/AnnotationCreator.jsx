import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { X, Send } from 'lucide-react';

export default function AnnotationCreator({ sdmRun, species, isOpen, onClose, coords }) {
  const [annotationType, setAnnotationType] = useState('comment');
  const [severity, setSeverity] = useState('info');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [inconsistencyType, setInconsistencyType] = useState('');
  const [radiusKm, setRadiusKm] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createSDMAnnotation', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdm-annotations', sdmRun.id] });
      resetForm();
      onClose();
    }
  });

  const resetForm = () => {
    setAnnotationType('comment');
    setSeverity('info');
    setTitle('');
    setContent('');
    setInconsistencyType('');
    setRadiusKm('');
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      alert('Title and content are required');
      return;
    }

    const payload = {
      sdm_run_id: sdmRun.id,
      species_id: species.id,
      species_name: species.scientific_name,
      annotation_type: annotationType,
      severity,
      latitude: coords.lat,
      longitude: coords.lon,
      title,
      content,
      inconsistency_type: annotationType === 'flag' ? inconsistencyType : null,
      radius_km: radiusKm ? parseFloat(radiusKm) : null
    };

    createMutation.mutate(payload);
  };

  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Add Annotation</AlertDialogTitle>
          <AlertDialogDescription>
            Location: {coords.lat.toFixed(3)}, {coords.lon.toFixed(3)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Type Selection */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'comment', label: '💬 Comment', desc: 'General feedback' },
              { id: 'flag', label: '🚩 Flag', desc: 'Mark inconsistency' },
              { id: 'rerun_request', label: '⚡ Rerun Request', desc: 'Request model change' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setAnnotationType(type.id)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  annotationType === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-medium text-sm">{type.label}</div>
                <div className="text-xs text-slate-600">{type.desc}</div>
              </button>
            ))}
          </div>

          {/* Severity (for flags) */}
          {annotationType === 'flag' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <div className="grid grid-cols-3 gap-2">
                {['info', 'warning', 'critical'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverity(sev)}
                    className={`py-2 px-3 rounded border capitalize text-sm ${
                      severity === sev
                        ? 'border-blue-500 bg-blue-50 font-medium'
                        : 'border-slate-200'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inconsistency Type (for flags) */}
          {annotationType === 'flag' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Inconsistency Type</label>
              <select
                value={inconsistencyType}
                onChange={(e) => setInconsistencyType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">Select type...</option>
                <option value="false_positive">False Positive (shouldn't be here)</option>
                <option value="false_negative">False Negative (should be here)</option>
                <option value="boundary_issue">Boundary Issue</option>
                <option value="data_quality">Data Quality Problem</option>
                <option value="climate_mismatch">Climate Data Mismatch</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          {/* Annotation Area Radius */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Area Radius (km, optional)</label>
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder="Leave blank for point annotation"
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Short subject or title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Details</label>
            <Textarea
              placeholder="Provide detailed feedback, observations, or suggested changes..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {createMutation.isPending ? 'Creating...' : 'Create Annotation'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}