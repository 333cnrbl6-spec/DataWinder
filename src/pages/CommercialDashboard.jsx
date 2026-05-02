import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import RevenueAnalyticsDashboard from '@/components/RevenueAnalyticsDashboard';
import { AlertCircle } from 'lucide-react';

export default function CommercialDashboard() {
  const { user } = useAuth();

  // Admin-only page
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600">This dashboard is for administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Commercial Analytics</h1>
          <p className="text-slate-600 mt-1">Real-time revenue and subscription metrics</p>
        </div>

        <RevenueAnalyticsDashboard />
      </div>
    </div>
  );
}