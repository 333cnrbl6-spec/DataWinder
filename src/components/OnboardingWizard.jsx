import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronRight, ChevronLeft, ExternalLink, AlertCircle, CheckCircle, Key,
  Download, Cpu, Wifi, HardDrive, ThumbsUp, ThumbsDown, Users, Star, Rocket, Gift
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import BangOnLogo from './BangOnLogo';

const steps = [
  { id: 1, title: 'Welcome',       subtitle: 'Get started' },
  { id: 2, title: 'Your Profile',  subtitle: 'About you' },
  { id: 3, title: 'MAXENT Setup',  subtitle: 'Modelling power' },
  { id: 4, title: 'Community',     subtitle: 'Join the network' },
  { id: 5, title: 'Terms of Use',  subtitle: 'Data usage' },
];

const FIELDS_OF_INTEREST = [
  'Mammalogy', 'Ornithology', 'Herpetology', 'Ichthyology', 'Entomology',
  'Botany / Plant Ecology', 'Marine Biology', 'Freshwater Ecology',
  'Conservation Biology', 'Climate Change & Biodiversity', 'Biogeography',
  'Landscape Ecology', 'Genetics & Phylogenetics', 'Education / Outreach', 'Other',
];

export default function OnboardingWizard({ open, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Profile
    institution: '',
    research_purpose: '',
    research_area: '',
    field_of_interest: '',
    app_goals: '',
    country: '',
    phone: '',
    // IUCN
    iucn_api_token: '',
    // MAXENT
    maxent_choice: null,
    maxent_terms_accepted: false,
    // Community
    community_member: false,
    beta_tester_opted_in: false,
    share_profile: false,
    newsletter_opted_in: false,
    community_terms_accepted: false,
    // Terms
    terms_accepted: false,
  });

  const set = (field, value) => setFormData(f => ({ ...f, [field]: value }));

  const canProceed = () => {
    switch (currentStep) {
      case 1: return true;
      case 2: return formData.institution && formData.research_purpose && formData.field_of_interest && formData.app_goals;
      case 3: return !!formData.maxent_choice && (formData.maxent_choice !== 'local' || formData.maxent_terms_accepted);
      case 4: return !formData.community_member || formData.community_terms_accepted;
      case 5: return formData.terms_accepted;
      default: return false;
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const now = new Date().toISOString();

      await base44.auth.updateMe({
        institution: formData.institution,
        research_purpose: formData.research_purpose,
        research_area: formData.research_area,
        field_of_interest: formData.field_of_interest,
        app_goals: formData.app_goals,
        country: formData.country,
        phone: formData.phone,
        iucn_api_token: formData.iucn_api_token || user.iucn_api_token,
        maxent_setup_choice: formData.maxent_choice,
        community_member: formData.community_member,
        beta_tester_opted_in: formData.beta_tester_opted_in,
        share_profile: formData.share_profile,
        newsletter_opted_in: formData.newsletter_opted_in,
        community_terms_accepted: formData.community_terms_accepted,
        community_joined_date: formData.community_member ? now : null,
        terms_accepted_date: now,
        onboarding_completed: true,
      });

      // If they joined the community, create a public CommunityMember record
      if (formData.community_member && formData.share_profile) {
        await base44.entities.CommunityMember.create({
          user_email: user.email,
          full_name: user.full_name,
          institution: formData.institution,
          country: formData.country,
          research_area: formData.research_area,
          field_of_interest: formData.field_of_interest,
          app_goals: formData.app_goals,
          beta_tester: formData.beta_tester_opted_in,
          newsletter: formData.newsletter_opted_in,
          share_profile: true,
          membership_tier: formData.beta_tester_opted_in ? 'Beta Tester' : 'Founding Member',
        });
      }

      onComplete();
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[95vh]" hideClose>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  currentStep >= step.id ? 'bg-bangor-red text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  {currentStep > step.id ? <CheckCircle className="w-4 h-4" /> : step.id}
                </div>
                <div className="text-xs text-center mt-1 font-medium leading-tight hidden sm:block">{step.title}</div>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-1.5 rounded ${currentStep > step.id ? 'bg-bangor-red' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="max-h-[65vh] pr-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="pb-2"
            >

              {/* ── Step 1: Welcome ── */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex justify-center mb-4"><BangOnLogo size="lg" /></div>
                  <DialogHeader>
                    <DialogTitle className="text-3xl text-bangor-red text-center">The DataWinder</DialogTitle>
                    <p className="text-center text-lg text-slate-600 mt-2">b-Izzy on Data</p>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-slate-700 text-lg">Access comprehensive species conservation data from two leading biodiversity platforms:</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-bangor-red/10 rounded-lg border-2 border-bangor-red/30">
                        <h4 className="font-semibold text-bangor-red mb-2">IUCN Red List</h4>
                        <p className="text-sm text-slate-700">Authoritative conservation status assessments for thousands of species worldwide</p>
                      </div>
                      <div className="p-4 bg-bangor-sun/10 rounded-lg border-2 border-bangor-sun/30">
                        <h4 className="font-semibold text-bangor-sun mb-2">iNaturalist</h4>
                        <p className="text-sm text-slate-700">Community observations with geolocation and images from nature enthusiasts globally</p>
                      </div>
                    </div>
                    <Alert className="bg-bangor-sun/10 border-bangor-sun">
                      <AlertCircle className="h-4 w-4 text-bangor-red" />
                      <AlertDescription className="text-slate-700">
                        This setup takes about 3 minutes. We'll get you connected to data sources, set up modelling, and invite you to join our growing research community.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              )}

              {/* ── Step 2: Profile ── */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <DialogHeader>
                    <DialogTitle className="text-2xl text-bangor-red">Your Profile</DialogTitle>
                    <p className="text-slate-600 text-sm">Help us understand who you are and what you need</p>
                  </DialogHeader>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="institution">Institution / Organisation *</Label>
                      <Input id="institution" value={formData.institution} onChange={e => set('institution', e.target.value)}
                        placeholder="e.g. Bangor University" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Input id="country" value={formData.country} onChange={e => set('country', e.target.value)}
                        placeholder="e.g. United Kingdom" className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="field_of_interest">Field of Interest *</Label>
                    <p className="text-xs text-slate-500 mb-1">Select the area that best describes your work or interest</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                      {FIELDS_OF_INTEREST.map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => set('field_of_interest', f)}
                          className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                            formData.field_of_interest === f
                              ? 'border-bangor-red bg-bangor-red/10 text-bangor-red'
                              : 'border-slate-200 text-slate-600 hover:border-bangor-red/40'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="research_purpose">Purpose of Data Use *</Label>
                    <Textarea id="research_purpose" value={formData.research_purpose}
                      onChange={e => set('research_purpose', e.target.value)}
                      placeholder="e.g. Academic research on biodiversity conservation, educational materials…"
                      rows={2} className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="app_goals">What do you want to get from DataWinder? *</Label>
                    <Textarea id="app_goals" value={formData.app_goals}
                      onChange={e => set('app_goals', e.target.value)}
                      placeholder="e.g. Build species distribution models for my region, explore IUCN data for threatened mammals…"
                      rows={2} className="mt-1" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="research_area">Research / Interest Area (optional)</Label>
                      <Input id="research_area" value={formData.research_area}
                        onChange={e => set('research_area', e.target.value)}
                        placeholder="e.g. Primatology, Marine Mammals" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone / WhatsApp (optional)</Label>
                      <Input id="phone" value={formData.phone}
                        onChange={e => set('phone', e.target.value)}
                        placeholder="e.g. +44 7700 000000" className="mt-1" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: MAXENT Setup ── */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <DialogHeader>
                    <DialogTitle className="text-2xl text-bangor-red">MAXENT Species Distribution Modelling</DialogTitle>
                    <p className="text-slate-600 text-sm">Choose how you want to run MAXENT models — you can always change this later</p>
                  </DialogHeader>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 space-y-1">
                    <p className="font-semibold text-slate-800">What is MAXENT?</p>
                    <p>MAXENT (Maximum Entropy) is the world's leading software for predicting species habitat suitability from occurrence records and environmental layers. Free, open-source, published by the American Museum of Natural History.</p>
                    <p className="text-xs text-slate-500 mt-1">Download size: ~2 MB (JAR). Requires Java 8+.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Local — recommended */}
                    <button onClick={() => setFormData(f => ({ ...f, maxent_choice: 'local', maxent_terms_accepted: false }))}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${formData.maxent_choice === 'local' ? 'border-bangor-red bg-bangor-red/5' : 'border-slate-200 hover:border-bangor-red/40'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <HardDrive className="w-5 h-5 text-bangor-red" />
                        <span className="font-semibold text-slate-800">Install Locally</span>
                        <span className="ml-auto text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Recommended</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-start gap-1.5"><ThumbsUp className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" /><span>Fastest — runs on your hardware</span></div>
                        <div className="flex items-start gap-1.5"><ThumbsUp className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" /><span>Full control, data stays local</span></div>
                        <div className="flex items-start gap-1.5"><ThumbsDown className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" /><span>Requires Java + ~5 min setup</span></div>
                      </div>
                    </button>
                    {/* Cloud — coming soon */}
                    <div className="text-left p-4 rounded-xl border-2 border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed select-none">
                      <div className="flex items-center gap-2 mb-2">
                        <Wifi className="w-5 h-5 text-slate-400" />
                        <span className="font-semibold text-slate-400">Cloud Service</span>
                        <span className="ml-auto text-xs bg-slate-200 text-slate-500 font-semibold px-2 py-0.5 rounded-full">Coming Soon</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-400">
                        <div className="flex items-start gap-1.5"><ThumbsUp className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>No installation required</span></div>
                        <div className="flex items-start gap-1.5"><ThumbsDown className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Data sent to server</span></div>
                      </div>
                    </div>
                    {/* Skip */}
                    <button onClick={() => setFormData(f => ({ ...f, maxent_choice: 'skip', maxent_terms_accepted: false }))}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${formData.maxent_choice === 'skip' ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Cpu className="w-5 h-5 text-slate-400" />
                        <span className="font-semibold text-slate-600">Skip for Now</span>
                      </div>
                      <p className="text-xs text-slate-500">Set up MAXENT later from the MAXENT Modeller page.</p>
                    </button>
                  </div>
                  {formData.maxent_choice === 'local' && (
                    <div className="space-y-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-3">
                        <p className="font-semibold text-green-800">Installation Steps (~5 minutes)</p>
                        <ol className="list-decimal list-inside space-y-2 text-slate-700 text-xs">
                          <li>Ensure <strong>Java 8+</strong> is installed — <a href="https://www.java.com/en/download/" target="_blank" rel="noopener noreferrer" className="text-bangor-red underline">java.com <ExternalLink className="w-3 h-3 inline" /></a></li>
                          <li>Download <strong>maxent.jar</strong> from the AMNH link below</li>
                          <li>Save it somewhere accessible (e.g. <code className="bg-slate-100 px-1 rounded">C:\maxent\</code>)</li>
                          <li>Double-click <code className="bg-slate-100 px-1 rounded">maxent.jar</code> to launch</li>
                          <li>Return to DataWinder and set the path in MAXENT Modeller settings</li>
                        </ol>
                        <a href="https://biodiversityinformatics.amnh.org/open_source/maxent/" target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-bangor-red text-white rounded-lg text-sm font-semibold">
                          <Download className="w-4 h-4" /> Download MAXENT from AMNH <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                        <p className="text-sm font-semibold text-amber-800">MAXENT Software Terms & Responsibility</p>
                        <p className="text-xs text-slate-700">MAXENT is developed by the <strong>American Museum of Natural History</strong>. DataWinder is not affiliated with AMNH and takes no responsibility for the software, its installation, or any outcomes from its use.</p>
                        <a href="https://biodiversityinformatics.amnh.org/open_source/maxent/" target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-bangor-red underline text-xs font-medium">
                          Read MAXENT Terms <ExternalLink className="w-3 h-3" />
                        </a>
                        <label className="flex items-start gap-3 cursor-pointer mt-2">
                          <Checkbox checked={formData.maxent_terms_accepted}
                            onCheckedChange={checked => set('maxent_terms_accepted', checked)} className="mt-0.5" />
                          <span className="text-xs text-slate-800">I understand I am downloading MAXENT directly from AMNH, I accept their terms, and take personal responsibility for its installation and use.</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 5: Community ── */}
              {currentStep === 5 && (
                <div className="space-y-5">
                  <DialogHeader>
                    <DialogTitle className="text-2xl text-bangor-red flex items-center gap-2">
                      <Users className="w-6 h-6" /> Join the DataWinder Community
                    </DialogTitle>
                    <p className="text-slate-600 text-sm">A growing network of researchers, conservationists and biodiversity enthusiasts</p>
                  </DialogHeader>

                  {/* Value proposition */}
                  <div className="bg-gradient-to-br from-bangor-red/8 to-bangor-sun/8 border border-bangor-red/20 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift className="w-5 h-5 text-bangor-red" />
                      <p className="font-bold text-slate-800 text-base">Free Membership — Founding Member Status</p>
                    </div>
                    <p className="text-sm text-slate-700">
                      DataWinder is being actively developed as a free research platform. Early members get <strong>free lifetime access</strong> and help shape its future. Join now and become a Founding Member.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {[
                        { icon: Star, text: 'Free, unlimited access to all current tools' },
                        { icon: Rocket, text: 'First access to new features before general release' },
                        { icon: Users, text: 'Connect with like-minded researchers worldwide' },
                        { icon: Gift, text: 'Your feedback directly shapes development roadmap' },
                      ].map(({ icon: Icon, text }) => (
                        <div key={text} className="flex items-start gap-2 text-xs text-slate-700">
                          <Icon className="w-3.5 h-3.5 text-bangor-red mt-0.5 shrink-0" />
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Join toggle */}
                  <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${
                    formData.community_member ? 'border-bangor-red bg-bangor-red/5' : 'border-slate-200 hover:border-bangor-red/40'
                  }`}>
                    <Checkbox checked={formData.community_member}
                      onCheckedChange={checked => set('community_member', checked)} className="mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">Yes — I'd like to join the DataWinder Community as a Founding Member</p>
                      <p className="text-xs text-slate-500 mt-0.5">Free, no spam, leave at any time</p>
                    </div>
                  </label>

                  {formData.community_member && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">

                      {/* Optional preferences */}
                      <div className="space-y-2.5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-sm font-semibold text-slate-700 mb-1">Your membership preferences</p>

                        <label className="flex items-start gap-3 cursor-pointer">
                          <Checkbox checked={formData.beta_tester_opted_in}
                            onCheckedChange={checked => set('beta_tester_opted_in', checked)} className="mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-slate-800">Become a Beta Tester</p>
                            <p className="text-xs text-slate-500">Try new features early and share your experience — occasional emails only</p>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                          <Checkbox checked={formData.newsletter_opted_in}
                            onCheckedChange={checked => set('newsletter_opted_in', checked)} className="mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-slate-800">Development Updates Newsletter</p>
                            <p className="text-xs text-slate-500">Monthly updates on new features, research, and community highlights</p>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                          <Checkbox checked={formData.share_profile}
                            onCheckedChange={checked => set('share_profile', checked)} className="mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-slate-800">Appear in the Member Directory</p>
                            <p className="text-xs text-slate-500">Let other members see your name, institution, field of interest and country. Contact details are never shared.</p>
                          </div>
                        </label>
                      </div>

                      {/* Community T&Cs */}
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-amber-800">Community Membership Terms</p>
                        <ul className="text-xs text-slate-700 space-y-1 list-disc ml-4">
                           <li>Membership is free and you may leave at any time by contacting us</li>
                           <li>We will never sell or share your personal data with third parties</li>
                           <li>Your email address will only be used for DataWinder communications you opt into</li>
                           <li>Profile directory listings show only name, institution, field and country — never contact details</li>
                           <li>We may contact you about beta testing opportunities, but only if you opt in above</li>
                           <li>Standard data protection and privacy policies apply to all member data</li>
                        </ul>
                        <label className="flex items-start gap-3 cursor-pointer mt-1">
                          <Checkbox checked={formData.community_terms_accepted}
                            onCheckedChange={checked => set('community_terms_accepted', checked)} className="mt-0.5" />
                          <span className="text-xs text-slate-800 font-medium">
                            I accept the Community Membership Terms above and consent to DataWinder storing my profile information for community purposes.
                          </span>
                        </label>
                      </div>
                    </motion.div>
                  )}

                  {!formData.community_member && (
                    <p className="text-xs text-slate-400 text-center">You can join the community at any time from the Members page after setup.</p>
                  )}
                </div>
              )}

              {/* ── Step 6: Terms ── */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <DialogHeader>
                    <DialogTitle className="text-2xl text-bangor-red">Terms of Use</DialogTitle>
                    <p className="text-slate-600 text-sm">Review and accept the data usage terms</p>
                  </DialogHeader>
                  <ScrollArea className="h-[35vh] pr-4">
                    <div className="space-y-6">
                      <div className="bg-bangor-red/10 p-4 rounded-lg border border-bangor-red/30 space-y-3">
                        <h4 className="font-semibold text-bangor-red">IUCN Red List Terms</h4>
                        <ul className="space-y-2 ml-4 list-disc text-sm text-slate-700">
                          <li>Non-commercial, educational, and research use only</li>
                          <li>Must cite: "IUCN 2026. IUCN Red List of Threatened Species. www.iucnredlist.org"</li>
                          <li>No redistribution as a separate dataset</li>
                          <li>Respect API rate limits</li>
                        </ul>
                        <a href="https://www.iucnredlist.org/terms/terms-of-use" target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-bangor-red underline text-sm font-medium">
                          Full Terms <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="bg-bangor-sun/10 p-4 rounded-lg border border-bangor-sun/30 space-y-3">
                        <h4 className="font-semibold text-bangor-sun">iNaturalist Terms</h4>
                        <ul className="space-y-2 ml-4 list-disc text-sm text-slate-700">
                          <li>Respect Creative Commons licences on observations</li>
                          <li>Acknowledge iNaturalist as the data source</li>
                          <li>Do not use location data inappropriately</li>
                          <li>Appropriate and responsible use only</li>
                        </ul>
                        <a href="https://www.inaturalist.org/pages/terms" target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-bangor-sun underline text-sm font-medium">
                          Full Terms <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </ScrollArea>
                  <label className="flex items-start gap-3 cursor-pointer p-4 bg-bangor-sun/10 rounded-lg border-2 border-bangor-sun/50">
                    <Checkbox checked={formData.terms_accepted}
                      onCheckedChange={checked => set('terms_accepted', checked)} className="mt-1" />
                    <span className="text-sm text-slate-800">
                      I have read and agree to the IUCN Red List and iNaturalist Terms of Service. I will use this data responsibly for non-commercial purposes and provide proper attribution.
                    </span>
                  </label>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </ScrollArea>

        {/* Navigation */}
        <div className="flex justify-between pt-5 border-t mt-4">
          <Button variant="outline" onClick={() => setCurrentStep(s => s - 1)} disabled={currentStep === 1 || loading}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {currentStep < steps.length ? (
            <Button onClick={() => setCurrentStep(s => s + 1)} disabled={!canProceed() || loading}
              className="bg-bangor-red text-white font-semibold px-8 py-5 text-base shadow-lg">
              Next <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={!canProceed() || loading}
              className="bg-bangor-red text-white font-semibold px-8 py-5 text-base shadow-lg">
              {loading ? 'Saving…' : 'Complete Setup'}
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}