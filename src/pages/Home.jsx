import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

/**
 * Home page redirects authenticated users to dashboard, others to landing page
 */
export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await base44.auth.isAuthenticated().catch(() => false);
      if (isAuth) {
        navigate('/ResearcherDashboard', { replace: true });
      } else {
        navigate('/Landing', { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-bangor-red rounded-full animate-spin"></div>
    </div>
  );
}