import React from 'react';
import { Button } from "@/components/ui/button";
import { CheckSquare, Square, Download, ArrowLeftRight, List, StickyNote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SelectionBar({ 
  totalCount, 
  selectedCount, 
  onSelectAll, 
  onDeselectAll, 
  onDownload,
  onCompare,
  onManageLists,
  onAddNote,
  selectedSpecies = []
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 p-4"
    >
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{totalCount}</span> species found
        </span>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            className="text-xs"
          >
            <CheckSquare className="w-4 h-4 mr-1" />
            Select all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            className="text-xs"
          >
            <Square className="w-4 h-4 mr-1" />
            Deselect all
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3"
          >
            <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
              {selectedCount} selected
            </span>
            <div className="flex gap-2">
              <Button
                onClick={onCompare}
                variant="outline"
                disabled={selectedCount < 2}
                className="border-blue-200 hover:bg-blue-50"
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Compare
              </Button>
              <Button
                onClick={onManageLists}
                variant="outline"
                className="border-purple-200 hover:bg-purple-50"
              >
                <List className="w-4 h-4 mr-2" />
                Save to List
              </Button>
              {selectedCount === 1 && (
                <Button
                  onClick={() => onAddNote(selectedSpecies[0])}
                  variant="outline"
                  className="border-amber-200 hover:bg-amber-50"
                >
                  <StickyNote className="w-4 h-4 mr-2" />
                  Add Note
                </Button>
              )}
              <Button
                onClick={onDownload}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}