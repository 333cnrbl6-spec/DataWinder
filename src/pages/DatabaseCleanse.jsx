import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, BarChart3, Loader, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import FamilyHealthCard from '@/components/datahealth/FamilyHealthCard';
import { motion, AnimatePresence } from 'framer-motion';

export default function DatabaseCleanse() {
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [mergingData, setMergingData] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dataHealth'],
    queryFn: () => base44.functions.invoke('analyzeDataHealth', {}),
    refetchInterval: 10000
  });

  const healthData = data?.data;
  const selectedFamilyData = selectedFamily && healthData?.familyStats?.find(f => f.family === selectedFamily);
  const duplicatesInFamily = selectedFamily && healthData?.duplicatesByFamily?.[selectedFamily];

  const handleAutoMergeDuplicates = async () => {
    if (!selectedFamily || !duplicatesInFamily) return;
    
    setMergingData({ status: 'processing', family: selectedFamily });
    
    try {
      let mergedCount = 0;
      for (const dupGroup of duplicatesInFamily) {
        const { records } = dupGroup;
        if (records.length <= 1) continue;

        const masterRecord = records[0];
        const recordsToDelete = records.slice(1).map(r => r.id);

        // Merge data
        const mergedRecord = { ...masterRecord };
        for (const dup of records.slice(1)) {
          for (const [key, val] of Object.entries(dup)) {
            if (!mergedRecord[key] && val) {
              mergedRecord[key] = val;
            }
          }
        }

        const { id, created_date, updated_date, created_by, ...cleanData } = mergedRecord;
        
        await base44.functions.invoke('mergeSpeciesRecords', {
          masterId: masterRecord.id,
          duplicateIds: recordsToDelete,
          mergedData: cleanData
        });

        mergedCount += recordsToDelete.length;
      }

      setMergingData({ status: 'success', family: selectedFamily, mergedCount });
    } catch (err) {
      console.error('Merge error:', err);
      setMergingData({ status: 'error', family: selectedFamily, error: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-bangor-sun/8 to-bangor-red/3">
      <header className="bg-white border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-bangor-red" />
            <div>
              <h1 className="text-2xl font-bold text-bangor-red">Database Cleanse</h1>
              <p className="text-sm text-slate-600 mt-1">Identify and merge duplicate species records by taxonomy</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="w-8 h-8 text-bangor-red animate-spin mb-4" />
            <p className="text-slate-600">Analyzing database health...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {healthData && !selectedFamily && (
          <div className="space-y-6">
            {/* Overview Card */}
            <Card className="bg-gradient-to-r from-bangor-red/5 to-bangor-sun/5 border-bangor-red/20">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Total Species</p>
                    <p className="text-3xl font-bold text-bangor-red">{healthData.totalSpecies}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Families</p>
                    <p className="text-3xl font-bold text-slate-900">{healthData.totalFamilies}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Problematic Groups</p>
                    <p className="text-3xl font-bold text-amber-600">
                      {healthData.familyStats.filter(f => f.duplicationRatio > 1.5).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Family Grid */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Families by Duplication Ratio</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {healthData.familyStats.map((family) => (
                  <FamilyHealthCard
                    key={family.family}
                    family={family.family}
                    stats={family}
                    onSelect={() => setSelectedFamily(family.family)}
                    isSelected={selectedFamily === family.family}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Family Detail View */}
        <AnimatePresence>
          {selectedFamily && selectedFamilyData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFamily(null);
                    setMergingData(null);
                  }}
                >
                  ← Back
                </Button>
                <h2 className="text-2xl font-bold text-slate-900 italic">{selectedFamily}</h2>
              </div>

              {/* Stats */}
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-600 font-semibold uppercase">Total Records</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{selectedFamilyData.recordCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-semibold uppercase">Unique Species</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{selectedFamilyData.uniqueSpecies}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-semibold uppercase">Duplication Ratio</p>
                      <p className="text-2xl font-bold text-bangor-red mt-1">{selectedFamilyData.duplicationRatio}x</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-semibold uppercase">Potential Duplicates</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">{duplicatesInFamily?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Duplicates List */}
              {duplicatesInFamily && duplicatesInFamily.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Duplicate Groups Found</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {duplicatesInFamily.map((group, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-slate-900 italic">{group.scientific_name}</p>
                            <p className="text-xs text-slate-500 mt-1">{group.recordCount} duplicate records</p>
                          </div>
                          <Badge className="bg-red-100 text-red-700">{group.recordCount} records</Badge>
                        </div>
                        <div className="space-y-1">
                          {group.records.slice(0, 3).map((record, i) => (
                            <div key={record.id} className="text-xs text-slate-600 ml-2">
                              {i === 0 && <span className="font-medium">Master: </span>}
                              {record.common_name ? `${record.common_name} (${record.iucn_status || 'unknown'})` : 'No common name'}
                            </div>
                          ))}
                          {group.records.length > 3 && (
                            <div className="text-xs text-slate-500 ml-2">+{group.records.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Action */}
              {mergingData?.status === 'success' ? (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <p className="text-green-700 font-medium">
                      ✓ Successfully merged {mergingData.mergedCount} duplicate records
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  onClick={handleAutoMergeDuplicates}
                  disabled={mergingData?.status === 'processing' || !duplicatesInFamily?.length}
                  className="w-full bg-bangor-red hover:bg-bangor-red/90 text-white py-6"
                >
                  {mergingData?.status === 'processing' ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Merging duplicates...
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-4 h-4 mr-2" />
                      Auto-Merge All Duplicates
                    </>
                  )}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}