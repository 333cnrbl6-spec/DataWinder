import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from 'framer-motion';
import TaxonomicSearch from '@/components/species/TaxonomicSearch';

export default function SearchPanel({ onSearch, isLoading }) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-bangor-red/10 to-slate-100">
          <CardTitle className="text-bangor-red">Species Search</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <TaxonomicSearch onSearch={onSearch} isLoading={isLoading} />
        </CardContent>
      </Card>
    </motion.div>
  );
}