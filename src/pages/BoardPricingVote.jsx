import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import UnifiedPricingManager from '@/components/pricing/UnifiedPricingManager';

export default function BoardPricingVote() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-bangor-red shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-bangor-red mb-2">Board Pricing Administration</h1>
          <p className="text-slate-600">Manage pricing structure with democratic board voting</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <UnifiedPricingManager productId="datawinder" />
      </main>
    </div>
  );
}