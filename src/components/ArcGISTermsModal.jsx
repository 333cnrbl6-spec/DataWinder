import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, ExternalLink } from 'lucide-react';

export default function ArcGISTermsModal({ open, onClose, onAgree }) {
  const [agreed, setAgreed] = useState(false);

  const handleAgree = () => {
    if (agreed) {
      onAgree();
      setAgreed(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="w-5 h-5 text-bangor-red" />
            ArcGIS Terms of Use
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900">
              <span className="font-semibold">ArcGIS Maps:</span> This application uses Esri's ArcGIS mapping services to display species distribution data and satellite imagery.
            </p>
          </div>

          {/* Terms Content */}
          <div className="space-y-3 text-sm text-slate-700 max-h-96 overflow-y-auto">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Third-Party Service</h4>
              <p>
                ArcGIS mapping services are provided by Esri. By using these maps, you acknowledge that:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
                <li>Data visualization uses Esri's ArcGIS REST API services</li>
                <li>Your map interactions may transmit location data to Esri servers</li>
                <li>Attribution requirements apply (© Esri, DigitalGlobe, Earthstar Geographics)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Data Privacy</h4>
              <p>
                When using ArcGIS maps:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
                <li>Your map zoom level, center point, and interactions may be logged</li>
                <li>Species observation coordinates will be transmitted to render the map</li>
                <li>Esri's privacy policy applies to your data interactions</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Licensing</h4>
              <p>
                This application uses:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
                <li>World Imagery basemap (© Esri and its licensors)</li>
                <li>Leaflet open-source mapping library</li>
                <li>Free ArcGIS online mapping services</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">External Links</h4>
              <div className="space-y-2">
                <a
                  href="https://www.esri.com/en-us/terms/master-license-agreement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bangor-red hover:text-bangor-red/80 flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  Esri Master License Agreement
                </a>
                <a
                  href="https://www.esri.com/en-us/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bangor-red hover:text-bangor-red/80 flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  Esri Privacy Policy
                </a>
              </div>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={setAgreed}
                className="mt-1"
              />
              <label htmlFor="agree" className="text-sm text-slate-700 cursor-pointer">
                I understand and agree to the ArcGIS terms of use. I acknowledge that my map interactions and species data coordinates will be transmitted to Esri services.
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="text-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAgree}
              disabled={!agreed}
              className="bg-bangor-red hover:bg-bangor-red/90 disabled:opacity-50"
            >
              Agree & Enable Maps
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}