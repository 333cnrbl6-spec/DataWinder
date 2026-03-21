import React, { useState, useEffect } from 'react';
import { Leaf, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function BangorMicrosoftLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          setIsAuthenticated(true);
          // Redirect to home after a brief delay
          setTimeout(() => {
            window.location.href = '/Home';
          }, 1000);
        }
      } catch (e) {
        // Not logged in, show login page
      }
    };
    checkAuth();
  }, []);

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // Redirect to Base44 login - Microsoft should be available as a provider
      await base44.auth.redirectToLogin('/?source=bangor_microsoft');
    } catch (e) {
      setError('Failed to initiate login. Please try again.');
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bangor-red/5 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-bangor-red mx-auto mb-4" />
          <p className="text-slate-600">Redirecting to DataWinder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bangor-red/5 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b-4 border-bangor-red shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-bangor-red rounded-lg flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-bangor-red">DataWinder</h1>
              <p className="text-sm text-slate-500">Bangor University Founder Program</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Container */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-8">
            {/* Welcome Section */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-bangor-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-8 h-8 text-bangor-red" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
              <p className="text-slate-600 text-sm">
                Sign in with your Bangor University account to access DataWinder
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex gap-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-6">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Microsoft Login Button */}
            <Button
              onClick={handleMicrosoftLogin}
              disabled={loading}
              className="w-full bg-bangor-red hover:bg-bangor-red/90 text-white font-semibold py-3 rounded-lg mb-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 mr-2 inline"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                  </svg>
                  Sign in with Microsoft
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Bangor Only</span>
              </div>
            </div>

            {/* Info Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-xs text-blue-900 font-semibold mb-2">✓ Bangor University Email Required</p>
              <p className="text-xs text-blue-800">
                You must use your @bangor.ac.uk email address to access the Founder Program. If you don't have DataWinder access yet, contact us.
              </p>
            </div>

            {/* Footer Text */}
            <div className="text-center text-xs text-slate-500 space-y-1">
              <p>Your account is secure and protected by Bangor University</p>
              <p className="text-slate-400">Microsoft login • Single sign-on</p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center text-sm text-slate-600">
            <p className="mb-3">First time here?</p>
            <a
              href="/BangorFounderSignup"
              className="text-bangor-red hover:text-bangor-red/90 font-semibold"
            >
              Join the Founder Program →
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-slate-200 py-4 px-6 mt-auto">
        <div className="max-w-4xl mx-auto text-center text-xs text-slate-500">
          <p>DataWinder • An independent initiative by a Zoology graduate</p>
          <p className="mt-1">Not affiliated with official Bangor University software</p>
        </div>
      </div>
    </div>
  );
}