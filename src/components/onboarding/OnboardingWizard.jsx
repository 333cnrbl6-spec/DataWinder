import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { ChevronRight, Check, Leaf, Plus, Users, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    surveyName: '',
    surveyLocation: '',
    speciesName: '',
    teamMemberEmail: ''
  });

  const createSurveyMutation = useMutation({
    mutationFn: async () => {
      // Create first survey
      return base44.entities.Survey?.create?.({
        name: formData.surveyName,
        location: formData.surveyLocation,
        status: 'active',
        start_date: new Date().toISOString()
      }) || { id: 'survey-' + Date.now() };
    }
  });

  const createObservationMutation = useMutation({
    mutationFn: async () => {
      // Create first observation
      return base44.entities.Occurrence?.create?.({
        species_name: formData.speciesName,
        survey_id: 'survey-' + Date.now(),
        latitude: 51.5074,
        longitude: -0.1278,
        date: new Date().toISOString()
      }) || { id: 'obs-' + Date.now() };
    }
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      // Mark onboarding complete
      return base44.auth.updateMe({ onboarding_complete: true });
    },
    onSuccess: () => {
      toast.success('Welcome to DataWinder! 🎉');
      onComplete?.();
    }
  });

  const handleNextStep = async () => {
    if (step === 1) {
      if (!formData.surveyName || !formData.surveyLocation) {
        toast.error('Please fill in survey details');
        return;
      }
      await createSurveyMutation.mutateAsync();
      setStep(2);
    } else if (step === 2) {
      if (!formData.speciesName) {
        toast.error('Please enter a species name');
        return;
      }
      await createObservationMutation.mutateAsync();
      setStep(3);
    } else if (step === 3) {
      await completeMutation.mutateAsync();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="bg-gradient-to-r from-bangor-red/10 to-blue-50">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="w-6 h-6 text-bangor-red" />
            <span className="text-xs font-semibold text-bangor-red">ONBOARDING</span>
          </div>
          <CardTitle>Welcome to DataWinder</CardTitle>
          <CardDescription>
            Set up your first survey in 3 steps
          </CardDescription>
          <div className="flex gap-1 mt-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`h-1 flex-1 rounded ${i <= step ? 'bg-bangor-red' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          {/* Step 1: Create Survey */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">
                  Survey Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Woodland Bird Survey"
                  value={formData.surveyName}
                  onChange={(e) => setFormData({ ...formData, surveyName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g., Sherwood Forest, Nottinghamshire"
                  value={formData.surveyLocation}
                  onChange={(e) => setFormData({ ...formData, surveyLocation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <p className="text-xs text-slate-500 flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                Create your first survey to get started
              </p>
            </div>
          )}

          {/* Step 2: Add Species */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">
                  Species Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Great Spotted Woodpecker"
                  value={formData.speciesName}
                  onChange={(e) => setFormData({ ...formData, speciesName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <p className="text-xs text-slate-500 flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                Record your first species observation
              </p>
            </div>
          )}

          {/* Step 3: Invite Team */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">
                  Team Member Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="colleague@email.com"
                  value={formData.teamMemberEmail}
                  onChange={(e) => setFormData({ ...formData, teamMemberEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <p className="text-xs text-slate-500 flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                Invite team members to collaborate (optional)
              </p>
            </div>
          )}

          {/* Step Indicator */}
          <div className="text-xs text-slate-500 text-center">
            Step {step} of 3
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <Button
                onClick={() => setStep(step - 1)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNextStep}
              disabled={createSurveyMutation.isPending || createObservationMutation.isPending || completeMutation.isPending}
              className="flex-1 gap-2 bg-bangor-red hover:bg-bangor-red/90"
            >
              {step === 3 ? 'Get Started' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Skip Link */}
          <button
            onClick={() => completeMutation.mutate()}
            className="w-full text-xs text-slate-500 hover:text-slate-700 py-2"
          >
            Skip onboarding
          </button>
        </CardContent>
      </Card>
    </div>
  );
}