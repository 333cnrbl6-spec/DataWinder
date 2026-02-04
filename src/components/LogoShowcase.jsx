import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import BangOnLogo from './BangOnLogo';
import LogoOption1 from './LogoOption1';
import LogoOption2 from './LogoOption2';
import LogoOption3 from './LogoOption3';
import LogoOption4 from './LogoOption4';

export default function LogoShowcase({ open, onClose, onSelect }) {
  const logos = [
    { component: BangOnLogo, name: 'Current - Crest Shield', id: 'current' },
    { component: LogoOption1, name: 'Modern Circular "B"', id: 'option1' },
    { component: LogoOption2, name: 'Hexagon with Data Bars', id: 'option2' },
    { component: LogoOption3, name: 'Nature + Tech Leaf', id: 'option3' },
    { component: LogoOption4, name: 'Minimalist "BO" Square', id: 'option4' }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-bangor-red">Choose Your Logo</DialogTitle>
          <p className="text-slate-600 text-sm">Select a logo design for The DataWinder</p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {logos.map((logo) => {
            const LogoComponent = logo.component;
            return (
              <div 
                key={logo.id}
                className="p-6 border-2 border-bangor-red rounded-xl shadow-lg cursor-pointer"
                onClick={() => onSelect(logo.id)}
              >
                <div className="flex justify-center mb-4 py-6 bg-slate-50 rounded-lg">
                  <LogoComponent size="md" />
                </div>
                <h3 className="text-center font-semibold text-slate-900 mb-2">{logo.name}</h3>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(logo.id);
                  }}
                >
                  Select This Logo
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
          <p><strong>Note:</strong> Selecting a logo will update it throughout the app (header, onboarding, etc.)</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}