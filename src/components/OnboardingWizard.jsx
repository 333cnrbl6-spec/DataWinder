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
    terms_accepted: false,
    maxent_terms_accepted: false,
    maxent_choice: null // 'local' | 'cloud' | 'skip'
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
        institution: formData.institution,
        research_purpose: formData.research_purpose,
        research_area: formData.research_area,
        iucn_api_token: pastedToken,
        maxent_setup_choice: formData.maxent_choice,
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
      case 4: return !!formData.maxent_choice && (formData.maxent_choice !== 'local' || formData.maxent_terms_accepted);
      case 5: return formData.terms_accepted;
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

            {/* Step 4: MAXENT Setup */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-bangor-red">MAXENT Species Distribution Modelling</DialogTitle>
                  <p className="text-slate-600 text-sm">Choose how you want to run MAXENT models — you can always change this later</p>
                </DialogHeader>

                {/* What is MAXENT */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 space-y-1">
                  <p className="font-semibold text-slate-800">What is MAXENT?</p>
                  <p>MAXENT (Maximum Entropy) is the world's leading software for predicting species habitat suitability from occurrence records and environmental layers. It is free, open-source, and published by the American Museum of Natural History.</p>
                  <p className="text-xs text-slate-500 mt-1">Download size: ~2 MB (JAR file). Requires Java 8+. Disk usage: typically 10–500 MB per model run depending on output type.</p>
                </div>

                {/* Option cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Local install — recommended */}
                  <button
                    onClick={() => setFormData(f => ({ ...f, maxent_choice: 'local', maxent_terms_accepted: false }))}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${formData.maxent_choice === 'local' ? 'border-bangor-red bg-bangor-red/5' : 'border-slate-200 hover:border-bangor-red/40'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="w-5 h-5 text-bangor-red" />
                      <span className="font-semibold text-slate-800">Install Locally</span>
                      <span className="ml-auto text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Recommended</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-start gap-1.5"><ThumbsUp className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" /><span>Fastest processing — runs on your own hardware</span></div>
                      <div className="flex items-start gap-1.5"><ThumbsUp className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" /><span>Full control over parameters and output files</span></div>
                      <div className="flex items-start gap-1.5"><ThumbsUp className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" /><span>Data stays on your machine — maximum privacy</span></div>
                      <div className="flex items-start gap-1.5"><ThumbsDown className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" /><span>Requires Java installation and initial setup (~5 min)</span></div>
                    </div>
                  </button>

                  {/* Cloud service */}
                  <button
                    onClick={() => setFormData(f => ({ ...f, maxent_choice: 'cloud', maxent_terms_accepted: false }))}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${formData.maxent_choice === 'cloud' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Wifi className="w-5 h-5 text-blue-500" />
                      <span className="font-semibold text-slate-800">Use Cloud Service</span>
                      <span className="ml-auto text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">Beta</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-start gap-1.5"><ThumbsUp className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" /><span>No installation required — works in browser</span></div>
                      <div className="flex items-start gap-1.5"><ThumbsUp className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" /><span>Good for occasional or exploratory runs</span></div>
                      <div className="flex items-start gap-1.5"><ThumbsDown className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" /><span>Slower than local — depends on server availability</span></div>
                      <div className="flex items-start gap-1.5"><ThumbsDown className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" /><span>Occurrence data is transmitted to our server</span></div>
                    </div>
                  </button>

                  {/* Skip */}
                  <button
                    onClick={() => setFormData(f => ({ ...f, maxent_choice: 'skip', maxent_terms_accepted: false }))}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${formData.maxent_choice === 'skip' ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu className="w-5 h-5 text-slate-400" />
                      <span className="font-semibold text-slate-600">Skip for Now</span>
                    </div>
                    <p className="text-xs text-slate-500">You can set up MAXENT later from the MAXENT Modeller page. The rest of the app (species search, data management, ArcGIS tools) will work normally.</p>
                  </button>
                </div>

                {/* Local install guide + T&C */}
                {formData.maxent_choice === 'local' && (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-3">
                      <p className="font-semibold text-green-800">Guided Installation Steps</p>
                      <ol className="list-decimal list-inside space-y-2 text-slate-700">
                        <li>Ensure <strong>Java 8 or later</strong> is installed on your computer (<a href="https://www.java.com/en/download/" target="_blank" rel="noopener noreferrer" className="text-bangor-red underline inline-flex items-center gap-0.5">java.com <ExternalLink className="w-3 h-3" /></a>)</li>
                        <li>Visit the official MAXENT download page and download <strong>maxent.jar</strong></li>
                        <li>Save the file somewhere accessible (e.g. <code className="bg-slate-100 px-1 rounded">C:\maxent\</code> or <code className="bg-slate-100 px-1 rounded">~/maxent/</code>)</li>
                        <li>Double-click <code className="bg-slate-100 px-1 rounded">maxent.jar</code> to launch — no traditional installer needed</li>
                        <li>Return to DataWinder and enter the path to your maxent.jar in the MAXENT Modeller settings</li>
                      </ol>
                      <a
                        href="https://biodiversityinformatics.amnh.org/open_source/maxent/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-bangor-red text-white rounded-lg text-sm font-semibold"
                      >
                        <Download className="w-4 h-4" />
                        Download MAXENT from AMNH
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* MAXENT T&C acceptance */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-semibold text-amber-800">MAXENT Software Terms & Responsibility</p>
                      <p className="text-xs text-slate-700">
                        MAXENT is developed and maintained by the <strong>American Museum of Natural History</strong>. By downloading it you agree to their terms of use. DataWinder is not affiliated with AMNH and takes no responsibility for the MAXENT software, its installation, or any outcomes from its use.
                      </p>
                      <a
                        href="https://biodiversityinformatics.amnh.org/open_source/maxent/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-bangor-red underline text-xs font-medium"
                      >
                        Read MAXENT Terms <ExternalLink className="w-3 h-3" />
                      </a>
                      <label className="flex items-start gap-3 cursor-pointer mt-2">
                        <Checkbox
                          checked={formData.maxent_terms_accepted}
                          onCheckedChange={(checked) => setFormData(f => ({ ...f, maxent_terms_accepted: checked }))}
                          className="mt-0.5"
                        />
                        <span className="text-xs text-slate-800">
                          I understand that I am downloading MAXENT directly from AMNH, I accept their terms and conditions, and I take personal responsibility for its installation and use on my device.
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Terms */}
            {currentStep === 5 && (
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