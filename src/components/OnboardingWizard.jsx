import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronRight, ChevronLeft, ExternalLink, AlertCircle, CheckCircle, Key, Download, Cpu, Wifi, HardDrive, ThumbsUp, ThumbsDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import BangOnLogo from './BangOnLogo';

const steps = [
  { id: 1, title: 'Welcome', subtitle: 'Get started with species data' },
  { id: 2, title: 'Your Profile', subtitle: 'Tell us about yourself' },
  { id: 3, title: 'IUCN API Token', subtitle: 'Set up data access' },
  { id: 4, title: 'MAXENT Setup', subtitle: 'Enhance modelling power' },
  { id: 5, title: 'Terms of Use', subtitle: 'Accept data usage terms' }
];

export default function OnboardingWizard({ open, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    institution: '',
    research_purpose: '',
    research_area: '',
    iucn_api_token: '',
    terms_accepted: false
  });

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const pastedToken = formData.iucn_api_token || user.iucn_api_token;
      
      await base44.auth.updateMe({
        ...formData,
        iucn_api_token: pastedToken,
        terms_accepted_date: new Date().toISOString(),
        onboarding_completed: true
      });
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return true;
      case 2: return formData.institution && formData.research_purpose;
      case 3: return formData.iucn_api_token;
      case 4: return formData.terms_accepted;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[95vh]" hideClose>
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep >= step.id 
                    ? 'bg-bangor-red text-white' 
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  {currentStep > step.id ? <CheckCircle className="w-5 h-5" /> : step.id}
                </div>
                <div className="text-xs text-center mt-2 font-medium">{step.title}</div>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${
                  currentStep > step.id ? 'bg-bangor-red' : 'bg-slate-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex justify-center mb-4">
                  <BangOnLogo size="lg" />
                </div>
                <DialogHeader>
                  <DialogTitle className="text-3xl text-bangor-red text-center">
                    The DataWinder
                  </DialogTitle>
                  <p className="text-center text-lg text-slate-600 mt-2">b-Izzy on Data</p>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-slate-700 text-lg">
                    Access comprehensive species conservation data from two leading biodiversity platforms:
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-bangor-red/10 rounded-lg border-2 border-bangor-red/30 hover:border-bangor-red/50">
                      <h4 className="font-semibold text-bangor-red mb-2">IUCN Red List</h4>
                      <p className="text-sm text-slate-700">
                        Authoritative Conservation Status Assessments For Thousands Of Species Worldwide
                      </p>
                    </div>
                    <div className="p-4 bg-bangor-sun/10 rounded-lg border-2 border-bangor-sun/30 hover:border-bangor-sun/50">
                      <h4 className="font-semibold text-bangor-sun mb-2">iNaturalist</h4>
                      <p className="text-sm text-slate-700">
                        Community Observations With Geolocation And Images From Nature Enthusiasts Globally
                      </p>
                    </div>
                  </div>
                  <Alert className="bg-bangor-sun/10 border-bangor-sun">
                    <AlertCircle className="h-4 w-4 text-bangor-red" />
                    <AlertDescription className="text-slate-700">
                      This setup will take about 2 minutes. We'll help you get your free IUCN API token and set up your account.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}

            {/* Step 2: Profile */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-bangor-red">Your Profile</DialogTitle>
                  <p className="text-slate-600 text-sm">This helps us understand our users and improve the service</p>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="institution">Institution or Organization *</Label>
                    <Input
                      id="institution"
                      value={formData.institution}
                      onChange={(e) => setFormData({...formData, institution: e.target.value})}
                      placeholder="e.g., Bangor University, Independent Researcher"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="research_purpose">Purpose of Data Use *</Label>
                    <Textarea
                      id="research_purpose"
                      value={formData.research_purpose}
                      onChange={(e) => setFormData({...formData, research_purpose: e.target.value})}
                      placeholder="e.g., Academic research on biodiversity conservation, Educational materials for students"
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="research_area">Research or Interest Area (Optional)</Label>
                    <Input
                      id="research_area"
                      value={formData.research_area}
                      onChange={(e) => setFormData({...formData, research_area: e.target.value})}
                      placeholder="e.g., Primatology, Marine Biology, Ecology"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: IUCN Token */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-bangor-red">IUCN Red List API Access</DialogTitle>
                  <p className="text-slate-600 text-sm">Get your free API token to access conservation data</p>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert className="bg-bangor-sun/10 border-bangor-sun/30">
                    <Key className="h-4 w-4 text-bangor-sun" />
                    <AlertDescription className="text-slate-700 font-medium">
                      <strong className="text-bangor-sun">Free Registration Required:</strong> The IUCN API Token Is Free And Takes 2 Minutes To Obtain.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                    <h4 className="font-semibold text-slate-900">How to get your token:</h4>
                    <ol className="space-y-3 ml-4 list-decimal text-sm text-slate-700">
                      <li>
                        Click the button below to visit the IUCN Red List website
                        <div className="mt-2">
                          <a
                            href="https://www.iucnredlist.org/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-bangor-red text-white rounded-lg text-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Go to IUCN Red List
                          </a>
                        </div>
                      </li>
                      <li>Sign up for a free account or log in if you already have one</li>
                      <li>Navigate to your account/profile page</li>
                      <li>Find and copy your API token</li>
                      <li>Paste it in the field below</li>
                    </ol>
                  </div>

                  <div>
                    <Label htmlFor="token">IUCN API Token *</Label>
                    <Input
                      id="token"
                      type="password"
                      value={formData.iucn_api_token}
                      onChange={(e) => setFormData({...formData, iucn_api_token: e.target.value})}
                      placeholder="Paste your token here"
                      className="mt-1 font-mono"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Your token is stored securely and used only for API requests
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Terms */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-bangor-red">Terms of Use</DialogTitle>
                  <p className="text-slate-600 text-sm">Review and accept the data usage terms</p>
                </DialogHeader>
                
                <ScrollArea className="h-[40vh] pr-4">
                  <div className="space-y-6">
                    {/* IUCN Terms */}
                    <div className="bg-bangor-red/10 p-4 rounded-lg border border-bangor-red/30 space-y-3">
                      <h4 className="font-semibold text-bangor-red">IUCN Red List Terms</h4>
                      <ul className="space-y-2 ml-4 list-disc text-sm text-slate-700">
                        <li>Non-commercial, Educational, And Research Use Only</li>
                        <li>Must Cite: "IUCN 2026. IUCN Red List Of Threatened Species. www.iucnredlist.org"</li>
                        <li>No Redistribution As A Separate Dataset</li>
                        <li>Respect API Rate Limits</li>
                      </ul>
                      <a 
                        href="https://www.iucnredlist.org/terms/terms-of-use" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-bangor-red underline text-sm font-medium"
                      >
                        Full Terms <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* iNaturalist Terms */}
                    <div className="bg-bangor-sun/10 p-4 rounded-lg border border-bangor-sun/30 space-y-3">
                      <h4 className="font-semibold text-bangor-sun">iNaturalist Terms</h4>
                      <ul className="space-y-2 ml-4 list-disc text-sm text-slate-700">
                        <li>Respect Creative Commons Licenses On Observations</li>
                        <li>Acknowledge iNaturalist As The Data Source</li>
                        <li>Do Not Use Location Data Inappropriately</li>
                        <li>Appropriate And Responsible Use Only</li>
                      </ul>
                      <a 
                        href="https://www.inaturalist.org/pages/terms" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-bangor-sun underline text-sm font-medium"
                      >
                        Full Terms <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </ScrollArea>

                <label className="flex items-start gap-3 cursor-pointer p-4 bg-bangor-sun/10 rounded-lg border-2 border-bangor-sun/50">
                  <Checkbox 
                    checked={formData.terms_accepted} 
                    onCheckedChange={(checked) => setFormData({...formData, terms_accepted: checked})}
                    className="mt-1"
                  />
                  <span className="text-sm text-slate-800">
                    I have read and agree to the IUCN Red List and iNaturalist Terms of Service. 
                    I will use this data responsibly for non-commercial purposes and provide proper attribution.
                  </span>
                </label>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          {currentStep < steps.length ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className="bg-bangor-red text-white font-semibold px-8 py-6 text-lg shadow-lg"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canProceed() || loading}
              className="bg-bangor-red text-white font-semibold px-8 py-6 text-lg shadow-lg"
            >
              {loading ? 'Saving...' : 'Complete Setup'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}