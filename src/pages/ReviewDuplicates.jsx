import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DuplicateReviewModal from '@/components/species/DuplicateReviewModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReviewDuplicates() {
  const [reviewingId, setReviewingId] = useState(null);
  const [processedGroups, setProcessedGroups] = useState(new Set());
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading, error } = useQuery({
    queryKey: ['pendingReviews'],
    queryFn: () => base44.entities.PendingSpeciesReview.filter({
      status: 'pending'
    }),
    refetchInterval: 2000
  });

  const currentReview = reviews.find(r => r.id === reviewingId);

  const handleMerge = (reviewId, recordsToDelete) => {
    setProcessedGroups(prev => new Set([...prev, reviewId]));
    queryClient.invalidateQueries({ queryKey: ['pendingReviews'] });
    setReviewingId(null);
    // In production, you'd trigger the actual merge function here
  };

  const handleDismiss = (reviewId) => {
    setProcessedGroups(prev => new Set([...prev, reviewId]));
    queryClient.invalidateQueries({ queryKey: ['pendingReviews'] });
    setReviewingId(null);
  };

  const pendingReviews = reviews.filter(r => !processedGroups.has(r.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-bangor-sun/8 to-bangor-red/3">
      <header className="bg-white border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-bangor-red">Review Duplicates</h1>
          <p className="text-sm text-slate-600 mt-1">AI-assisted taxonomy and duplication check</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="w-8 h-8 text-bangor-red animate-spin mb-4" />
            <p className="text-slate-600">Loading pending reviews...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {!isLoading && pendingReviews.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">All Done!</h2>
            <p className="text-slate-600">No pending duplicate reviews.</p>
          </motion.div>
        )}

        {!isLoading && pendingReviews.length > 0 && (
          <div className="space-y-6">
            <Card className="bg-bangor-sun/10 border-bangor-sun/30">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-700">
                  <strong>{pendingReviews.length}</strong> potential duplicate groups found. Review each group and decide how to handle them.
                </p>
              </CardContent>
            </Card>

            <AnimatePresence>
              {pendingReviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow border-bangor-sun/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-bangor-red" />
                            Duplicate Group {index + 1}
                          </CardTitle>
                          <p className="text-sm text-slate-600 mt-2">{review.ai_analysis.reason}</p>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs text-slate-500">Confidence:</span>
                            <div className="w-32 bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-bangor-red h-2 rounded-full transition-all"
                                style={{ width: `${review.ai_analysis.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{review.ai_analysis.confidence}%</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Species in Group:</h4>
                        <div className="space-y-2">
                          {review.duplicate_species_data?.map(sp => (
                            <div key={sp.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                              <div>
                                <p className="text-sm font-medium text-slate-900">{sp.scientific_name}</p>
                                {sp.common_name && <p className="text-xs text-slate-500">{sp.common_name}</p>}
                              </div>
                              {sp.id === review.ai_analysis.suggested_canonical_id && (
                                <span className="text-xs bg-bangor-sun/20 text-bangor-sun px-2 py-1 rounded">AI Suggested</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={() => setReviewingId(review.id)}
                        className="w-full bg-bangor-red hover:bg-bangor-red/90"
                      >
                        Review & Decide
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Review Modal */}
      <AnimatePresence>
        {currentReview && (
          <DuplicateReviewModal
            review={currentReview}
            onClose={() => setReviewingId(null)}
            onMerge={handleMerge}
            onDismiss={handleDismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}