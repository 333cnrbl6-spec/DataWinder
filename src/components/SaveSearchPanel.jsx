import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function SaveSearchPanel({ open, onClose, species, searchInfo, onSaveComplete }) {
  const [searchName, setSearchName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!searchName.trim()) {
      alert('Please enter a search name');
      return;
    }

    setIsSaving(true);
    try {
      // Create a saved search record
      await base44.entities.SavedSearch.create({
        name: searchName,
        taxonomy_level: searchInfo?.level || 'species',
        search_term: searchInfo?.terms || '',
        species_count: species.length
      });

      // All species should already be saved to DB by Home.js during the search
      // This just creates the search record linking them
      
      alert('Search saved successfully!');
      setSearchName('');
      onClose();
      onSaveComplete?.();
    } catch (error) {
      console.error('Error saving search:', error);
      alert('Failed to save search. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save Search</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="search-name" className="text-sm font-medium">Search Name</Label>
            <Input
              id="search-name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="e.g., Primates Q4 2025"
              className="mt-2"
              disabled={isSaving}
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-lg text-sm">
            <p><span className="font-medium">Level:</span> {searchInfo?.level}</p>
            <p><span className="font-medium">Terms:</span> {searchInfo?.terms}</p>
            <p><span className="font-medium">Species:</span> {species.length}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !searchName.trim()}
              className="flex-1 bg-bangor-red text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Search'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}