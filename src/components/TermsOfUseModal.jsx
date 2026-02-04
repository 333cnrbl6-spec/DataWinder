import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TermsOfUseModal({ open, onAccept }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!accepted) return;
    
    setLoading(true);
    try {
      await base44.auth.updateMe({
        terms_accepted: true,
        terms_accepted_date: new Date().toISOString()
      });
      onAccept();
    } catch (error) {
      console.error('Error accepting terms:', error);
      alert('Failed to save terms acceptance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-3xl max-h-[90vh]" hideClose>
        <DialogHeader>
          <DialogTitle className="text-2xl">Terms of Use Agreement</DialogTitle>
          <p className="text-sm text-slate-600 mt-2">
            To use this application, you must accept the terms of use for both data sources
          </p>
        </DialogHeader>

        <ScrollArea className="h-[50vh] pr-4">
          <div className="space-y-6">
            {/* IUCN Red List Terms */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                IUCN Red List Terms of Use
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg space-y-3 text-sm text-slate-700">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Summary of Key Terms:</h4>
                  <ul className="space-y-2 ml-4 list-disc">
                    <li><strong>Non-Commercial Use:</strong> The IUCN Red List API and data are for non-commercial, educational, and research purposes only.</li>
                    <li><strong>Attribution Required:</strong> You must cite the IUCN Red List as: "IUCN 2025. IUCN Red List of Threatened Species. Version 2025-2 www.iucnredlist.org"</li>
                    <li><strong>No Redistribution:</strong> You may not redistribute IUCN data as a separate dataset or product.</li>
                    <li><strong>Data Accuracy:</strong> While IUCN strives for accuracy, the data is provided "as is" without warranties.</li>
                    <li><strong>Respect Rate Limits:</strong> Use the API responsibly and respect rate limits to ensure availability for all users.</li>
                    <li><strong>Keep Token Private:</strong> Your API token is personal and should not be shared or exposed publicly.</li>
                  </ul>
                </div>
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    This app stores data locally for your use only and properly attributes IUCN as the data source.
                  </AlertDescription>
                </Alert>
                <a 
                  href="https://www.iucnredlist.org/terms/terms-of-use" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Read full IUCN terms <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* iNaturalist Terms */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                iNaturalist Terms of Service
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg space-y-3 text-sm text-slate-700">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Summary of Key Terms:</h4>
                  <ul className="space-y-2 ml-4 list-disc">
                    <li><strong>Appropriate Use:</strong> Use iNaturalist data responsibly and for legitimate research or educational purposes.</li>
                    <li><strong>Attribution:</strong> Acknowledge iNaturalist as the data source when using observation data.</li>
                    <li><strong>Respect Licenses:</strong> iNaturalist observations are typically licensed under Creative Commons (CC BY-NC by default).</li>
                    <li><strong>No Spam or Abuse:</strong> Do not use the platform in ways that could harm users or the service.</li>
                    <li><strong>Data Accuracy:</strong> iNaturalist data is community-contributed; verify critical information independently.</li>
                    <li><strong>Privacy:</strong> Respect the privacy of observers and do not use location data inappropriately.</li>
                    <li><strong>Age Requirement:</strong> Users must be at least 13 years old (or have parental permission).</li>
                  </ul>
                </div>
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    This app uses iNaturalist's public API and properly attributes observation data to iNaturalist contributors.
                  </AlertDescription>
                </Alert>
                <a 
                  href="https://www.inaturalist.org/pages/terms" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Read full iNaturalist terms <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Your Responsibilities */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Your Responsibilities</h3>
              <div className="bg-amber-50 p-4 rounded-lg space-y-2 text-sm text-amber-900">
                <p>By using this application, you agree to:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Use the data for non-commercial, educational, or research purposes only</li>
                  <li>Properly cite IUCN and iNaturalist when sharing or publishing data</li>
                  <li>Not redistribute the raw datasets commercially</li>
                  <li>Use your personal IUCN API token (free registration required)</li>
                  <li>Respect both platforms' terms of service and community guidelines</li>
                  <li>Verify critical information independently before making conservation decisions</li>
                </ul>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-col gap-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox 
              checked={accepted} 
              onCheckedChange={setAccepted}
              className="mt-1"
            />
            <span className="text-sm text-slate-700">
              I have read and agree to the IUCN Red List Terms of Use and iNaturalist Terms of Service. 
              I understand that I must use this data responsibly and for non-commercial purposes only.
            </span>
          </label>
          
          <Button 
            onClick={handleAccept}
            disabled={!accepted || loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? 'Saving...' : 'Accept Terms and Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}