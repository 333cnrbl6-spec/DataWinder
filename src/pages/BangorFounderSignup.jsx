import React, { useState, useEffect } from 'react';
import { Leaf, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function BangorFounderSignup() {
  const [step, setStep] = useState('landing'); // landing | signup | success | error
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          // Already authenticated, grant founder tier
          await grantFounderAccess(user);
          setStep('success');
        }
      } catch (e) {
        // Not logged in, show landing
      }
    };
    checkAuth();
  }, []);

  const validateBangorEmail = (emailAddr) => {
    return emailAddr.toLowerCase().endsWith('@bangor.ac.uk');
  };

  const grantFounderAccess = async (user) => {
    try {
      // Update user with founder status and 1-year expiry
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      
      await base44.auth.updateMe({
        membership_tier: 'Founding Member',
        founder_membership_expires: expiryDate.toISOString(),
        founder_activated_date: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to grant founder access:', e);
      throw e;
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!validateBangorEmail(email)) {
      setError('Please use your @bangor.ac.uk email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Redirect to signup with email pre-filled
      // Note: This assumes Base44 has a signup endpoint or we use the built-in auth
      await base44.auth.redirectToLogin(
        `/?founder_signup=${encodeURIComponent(email)}&source=bangor`
      );
    } catch (e) {
      setError(e.message || 'Signup failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bangor-red/5 to-blue-50">
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

      {/* Landing View */}
      {step === 'landing' && (
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Main Offer */}
            <div className="md:col-span-2">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Shape the Future of Biodiversity Research
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                DataWinder is in active development. We're inviting Bangor University researchers to join our Founder Program and help us build something truly revolutionary.
              </p>

              {/* Value Props */}
              <div className="space-y-4 mb-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Multi-Source Data Integration</h3>
                    <p className="text-sm text-slate-600">IUCN Red List, iNaturalist, GBIF, SpeciesLink — unified in one intelligent platform</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Species Distribution Modelling</h3>
                    <p className="text-sm text-slate-600">MAXENT integration for climate projections and habitat suitability analysis</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Intelligent Data Preparation</h3>
                    <p className="text-sm text-slate-600">AI-assisted file import, outlier detection, and taxonomic reconciliation</p>
                  </div>
                </div>
              </div>

              {/* Founder Benefits */}
              <div className="bg-bangor-red/5 border border-bangor-red/20 rounded-xl p-6 mb-8">
                <h3 className="font-bold text-slate-900 mb-4">Your Founder Benefits</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3 text-slate-700">
                    <span className="text-bangor-red font-bold">✓</span>
                    <span>Full platform access — all features, unlimited analyses</span>
                  </li>
                  <li className="flex gap-3 text-slate-700">
                    <span className="text-bangor-red font-bold">✓</span>
                    <span>1 year of complimentary membership</span>
                  </li>
                  <li className="flex gap-3 text-slate-700">
                    <span className="text-bangor-red font-bold">✓</span>
                    <span>Recognized as an early tester and contributor</span>
                  </li>
                  <li className="flex gap-3 text-slate-700">
                    <span className="text-bangor-red font-bold">✓</span>
                    <span>Direct influence on our development roadmap</span>
                  </li>
                  <li className="flex gap-3 text-slate-700">
                    <span className="text-bangor-red font-bold">✓</span>
                    <span>Early-adopter advantage before wider release</span>
                  </li>
                </ul>
              </div>

              {/* Mission Statement */}
              <div className="bg-slate-900 text-white rounded-xl p-6 mb-8">
                <h3 className="font-bold mb-3">Our Design Philosophy</h3>
                <p className="text-sm leading-relaxed mb-3">
                  DataWinder is designed for researchers of all neurological backgrounds. Our creator understands neurodiversity firsthand—study support, accessibility needs, different ways of thinking are strengths, not obstacles.
                </p>
                <p className="text-sm leading-relaxed">
                  <strong>We need everyone</strong> to help us build this. Your feedback—whether you're neurodivergent or not—helps us create simpler, clearer solutions that work for all researchers. Complex features are fine. Complex interfaces are not.
                </p>
              </div>

              {/* CTA */}
              <Button
                onClick={() => setStep('signup')}
                className="bg-bangor-red hover:bg-bangor-red/90 text-white px-8 py-3 text-lg font-semibold rounded-lg"
              >
                Claim Your Founder Access
              </Button>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-bold text-blue-900 mb-3">What We Need From You</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>✓ Test the platform with real research tasks</li>
                  <li>✓ Identify bugs, glitches, and friction points</li>
                  <li>✓ Suggest features that would help your work</li>
                  <li>✓ Share candid feedback on usability</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h4 className="font-bold text-amber-900 mb-3">Why Your Feedback Matters</h4>
                <p className="text-sm text-amber-800 mb-3">
                  Every piece of feedback—whether from neurodivergent or neurotypical researchers—helps us build simpler, more accessible solutions for <em>everyone</em>.
                </p>
                <p className="text-xs text-amber-700 italic">
                  DataWinder was designed by someone who experienced neurodiversity firsthand, with support systems like study access programmes. This SaaS is built on the principle that accessibility and clarity benefit all researchers. We need your voice—different perspectives make us better.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h4 className="font-bold text-slate-900 mb-3">Timeline</h4>
                <p className="text-sm text-slate-600">
                  Your 1-year founder membership begins on signup. After 12 months, we'll reach out to discuss continued access.
                </p>
              </div>

              <div className="text-center text-xs text-slate-500">
                <p>Bangor University Founder Program</p>
                <p className="mt-2">Early access • Active development • Your voice matters</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signup Form */}
      {step === 'signup' && (
        <div className="max-w-md mx-auto px-6 py-12">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to Join?</h2>
            <p className="text-slate-600 mb-6">Sign up with your @bangor.ac.uk email to activate your founder membership.</p>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Bangor University Email
                </label>
                <input
                  type="email"
                  placeholder="your.name@bangor.ac.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-bangor-red focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="flex gap-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-bangor-red hover:bg-bangor-red/90 text-white font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Continue to Signup'
                )}
              </Button>

              <button
                type="button"
                onClick={() => setStep('landing')}
                className="w-full py-2 text-slate-600 hover:text-slate-900 font-medium"
                disabled={loading}
              >
                Back
              </button>
            </form>

            <p className="text-xs text-slate-500 mt-6 text-center">
              Only @bangor.ac.uk email addresses are eligible for this program.
            </p>
          </div>
        </div>
      )}

      {/* Success */}
      {step === 'success' && (
        <div className="max-w-md mx-auto px-6 py-12">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-emerald-200 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome, Founder!</h2>
            <p className="text-slate-600 mb-6">
              Your 1-year membership is active. You now have full access to DataWinder.
            </p>
            <Button
              onClick={() => window.location.href = '/Home'}
              className="w-full bg-bangor-red hover:bg-bangor-red/90 text-white font-semibold"
            >
              Launch DataWinder
            </Button>
            <p className="text-xs text-slate-500 mt-4">
              Remember: your feedback shapes our future. Don't hesitate to report issues!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}