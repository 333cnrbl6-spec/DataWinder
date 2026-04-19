/**
 * DATAWINDER ONBOARDING WIZARD
 * ==============================
 * SynergyFlow Board-Approved — SEALED
 * Status: Isolated component, not rendered anywhere until board directive received.
 *
 * Activation: Import and render <OnboardingWizard /> in App.jsx or Home.jsx
 * guarded by: isFeatureEnabled('onboarding')
 *
 * Steps:
 *   1. Welcome & profile setup
 *   2. First species of interest (links to existing species search)
 *   3. Invite a team member
 *
 * On complete: base44.auth.updateMe({ onboarding_complete: true })
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Leaf, Users, Search, ChevronRight, X } from 'lucide-react';

const STEPS = [
  {
    id: 1,
    icon: Leaf,
    title: 'Welcome to DataWinder',
    subtitle: 'Professional biodiversity intelligence for UK conservation',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    id: 2,
    icon: Search,
    title: 'Your Research Focus',
    subtitle: 'Tell us which taxa you work with most',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    id: 3,
    icon: Users,
    title: 'Invite Your Team',
    subtitle: 'Collaborate with colleagues on the same workspace',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
];

export default function OnboardingWizard({ onComplete, onDismiss }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ institution: '', role: '' });
  const [focus, setFocus] = useState({ taxa: '', region: '' });
  const [invite, setInvite] = useState({ email: '' });
  const [saving, setSaving] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [error, setError] = useState('');

  const currentStep = STEPS[step];
  const StepIcon = currentStep.icon;
  const isLast = step === STEPS.length - 1;

  const handleSendInvite = async () => {
    if (!invite.email || !invite.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    try {
      await base44.users.inviteUser(invite.email, 'user');
      setInviteSent(true);
    } catch (e) {
      setError('Failed to send invite. They may already have access.');
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        onboarding_complete: true,
        onboarding_institution: profile.institution,
        onboarding_role: profile.role,
        onboarding_taxa_focus: focus.taxa,
        onboarding_region: focus.region,
        onboarding_completed_at: new Date().toISOString(),
      });
      onComplete?.();
    } catch (e) {
      console.error('Failed to save onboarding completion:', e);
      onComplete?.(); // Still proceed
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Dismiss */}
        <div className="flex justify-between items-center px-6 pt-4">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= step ? 'w-8 bg-emerald-500' : 'w-4 bg-slate-200'
                }`}
              />
            ))}
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Skip onboarding"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="px-6 pb-8 pt-4"
          >
            {/* Step icon & header */}
            <div className={`inline-flex p-3 rounded-xl ${currentStep.bg} ${currentStep.border} border mb-4`}>
              <StepIcon className={`w-6 h-6 ${currentStep.color}`} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">{currentStep.title}</h2>
            <p className="text-sm text-slate-500 mb-6">{currentStep.subtitle}</p>

            {/* Step 1: Profile */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Institution / Organisation</label>
                  <Input
                    placeholder="e.g. Natural England, Bangor University, WWT..."
                    value={profile.institution}
                    onChange={e => setProfile({ ...profile, institution: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Your Role</label>
                  <Input
                    placeholder="e.g. Conservation Scientist, GIS Analyst..."
                    value={profile.role}
                    onChange={e => setProfile({ ...profile, role: e.target.value })}
                  />
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
                  <strong>DataWinder</strong> connects iNaturalist, GBIF, IUCN Red List and SpeciesLink into one professional biodiversity intelligence platform.
                </div>
              </div>
            )}

            {/* Step 2: Research Focus */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Primary Taxa Focus</label>
                  <Input
                    placeholder="e.g. Mammals, Lepidoptera, Freshwater Fish..."
                    value={focus.taxa}
                    onChange={e => setFocus({ ...focus, taxa: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Primary Region of Interest</label>
                  <Input
                    placeholder="e.g. Wales, Scottish Highlands, UK-wide..."
                    value={focus.region}
                    onChange={e => setFocus({ ...focus, region: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {['Species Search', 'SDM Pipeline', 'Data Validation'].map(tool => (
                    <div key={tool} className="text-center p-2 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-xs font-semibold text-blue-700">{tool}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Invite */}
            {step === 2 && (
              <div className="space-y-4">
                {inviteSent ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">Invite sent to {invite.email}</p>
                    <p className="text-xs text-slate-500 text-center">They'll receive an email with access instructions.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Team Member Email</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="colleague@institution.ac.uk"
                          value={invite.email}
                          onChange={e => { setInvite({ email: e.target.value }); setError(''); }}
                          type="email"
                        />
                        <Button
                          variant="outline"
                          onClick={handleSendInvite}
                          className="shrink-0"
                        >
                          Send
                        </Button>
                      </div>
                      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                    </div>
                    <p className="text-xs text-slate-400">
                      You can also skip this — invite team members later from the User Management page.
                    </p>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-between items-center border-t border-slate-100 pt-4">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onDismiss?.()}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            {step === 0 ? 'Skip for now' : '← Back'}
          </button>

          {isLast ? (
            <Button
              onClick={handleFinish}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
            >
              {saving ? 'Saving...' : 'Get Started →'}
            </Button>
          ) : (
            <Button
              onClick={() => setStep(s => s + 1)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6"
            >
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}