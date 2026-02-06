import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, FileJson, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnalysisResultsViewer({ results, onVisualize, onClear }) {
  if (!results || results.length === 0) return null;

  return (
    <Card className="shadow-lg border-blue-200">
      <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="text-blue-700 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileJson className="w-5 h-5" />
            Analysis Results ({results.length})
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={onClear}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-2 max-h-60 overflow-y-auto">
          <AnimatePresence>
            {results.map((result, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-3 bg-slate-50 rounded-lg border flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{result.name}</p>
                  <p className="text-xs text-slate-500">
                    {result.features?.length || 0} features · {result.type}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onVisualize(result)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/geo+json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${result.name}_${Date.now()}.geojson`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <FileJson className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}