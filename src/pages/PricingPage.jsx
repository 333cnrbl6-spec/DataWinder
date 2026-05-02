import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Download, Zap, Users, Database, Gauge, AlertCircle, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PricingPage() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [user, setUser] = useState(null);
  const [isBangorUser, setIsBangorUser] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsBangorUser(u?.email?.endsWith('@bangor.ac.uk'));
    }).catch(() => null);
  }, []);

  // Stripe price IDs (from your Stripe products)
  const priceIds = {
    monthly: 'price_1TShNCCw5m86DE5Z2skevIqj',
    yearly: 'price_1TShNCCw5m86DE5ZDMGTo7C5',
  };

  const handleCheckout = (billing) => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    const priceId = billing === 'monthly' ? priceIds.monthly : priceIds.yearly;
    navigate(`/Checkout?priceId=${priceId}&plan=pro`);
  };

  const handleFreeTier = () => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    navigate('/ResearcherDashboard');
  };



  const standoutFeatures = [
    {
      icon: Zap,
      title: 'Multi-Source Biodiversity Data',
      description: 'The only platform integrating IUCN Red List, iNaturalist, GBIF, and SpeciesLink in one unified interface'
    },
    {
      icon: Gauge,
      title: 'Automated Quality Assurance',
      description: 'AI-powered duplicate detection, taxonomic validation, and coordinate outlier flagging'
    },
    {
      icon: Users,
      title: 'Built for Collaboration',
      description: 'Real-time team workspaces with role-based access and shared project analysis'
    },
    {
      icon: Database,
      title: 'Production-Grade SDM Tools',
      description: 'Integrated MAXENT modeling with climate scenario projection and ensemble methods'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-bangor-red/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Pricing Built for Research
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Free for Bangor University. 14-day trial for everyone else. Then choose the plan that fits your team.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-bangor-red shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={billingCycle === 'monthly'}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded font-medium transition-all ${
                billingCycle === 'annual'
                  ? 'bg-white text-bangor-red shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={billingCycle === 'annual'}
            >
              Annual <span className="text-xs text-green-600 font-bold">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 max-w-4xl mx-auto">
          {/* Free Tier - Bangor */}
          <Card className="hover:shadow-lg transition-all flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl">Academic</CardTitle>
              <CardDescription>For Bangor University researchers</CardDescription>
              <div className="mt-4">
                <div className="text-4xl font-bold text-slate-900">£0</div>
                <div className="text-sm text-slate-600 mt-1">Forever — @bangor.ac.uk only</div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 flex-1 flex flex-col">
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleFreeTier}
              >
                {isBangorUser ? 'Go to Dashboard' : 'Sign Up'}
              </Button>

              <div className="space-y-3 flex-1">
                {['Up to 5 projects', '1,000 occurrences/month', 'MaxEnt SDM modeling', 'AI data validation', 'Email support', 'Team of 5'].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className="ring-2 ring-bangor-red relative transition-all flex flex-col shadow-xl">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-bangor-red text-white">
              Most Popular
            </Badge>

            <CardHeader>
              <CardTitle className="text-2xl">Pro</CardTitle>
              <CardDescription>14-day free trial, then £99/month</CardDescription>
              <div className="mt-4">
                <div className="text-4xl font-bold text-slate-900">
                  {billingCycle === 'monthly' ? '£99' : '£990'}
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  /{billingCycle === 'monthly' ? 'month' : 'year'} {billingCycle === 'annual' && '(save 17%)'}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 flex-1 flex flex-col">
              <Button 
                className="w-full bg-bangor-red hover:bg-bangor-red/90" 
                size="lg"
                onClick={() => handleCheckout(billingCycle)}
              >
                Upgrade to Pro <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <div className="space-y-3 flex-1">
                {['Unlimited projects', 'Unlimited occurrences', 'Ensemble SDM methods', 'Climate scenario projections', 'Unlimited team members', 'Priority support', 'API access', 'Custom integrations'].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Why DataWinder Stands Out */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">
            Why DataWinder Stands Out
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {standoutFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="hover:shadow-lg transition-all">
                  <CardContent className="pt-6">
                    <Icon className="w-8 h-8 text-bangor-red mb-4" />
                    <h3 className="font-semibold text-lg text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Competitive Comparison */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">
            How DataWinder Compares
          </h2>
          <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left font-semibold text-slate-900">Feature</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-900">DataWinder</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-600">QGIS + Maxent</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-600">MaxEnt Online</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-600">GBIF Platform</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Integrated Biodiversity Data', dw: true, qgis: false, maxo: false, gbif: false },
                  { feature: 'Multi-source Search', dw: true, qgis: false, maxo: false, gbif: false },
                  { feature: 'Data Quality Automation', dw: true, qgis: false, maxo: false, gbif: false },
                  { feature: 'SDM Modeling', dw: true, qgis: false, maxo: true, gbif: false },
                  { feature: 'GIS Tools', dw: true, qgis: true, maxo: false, gbif: false },
                  { feature: 'Team Collaboration', dw: true, qgis: false, maxo: false, gbif: false },
                  { feature: 'Cloud Storage', dw: true, qgis: false, maxo: false, gbif: false },
                  { feature: 'API Access', dw: true, qgis: false, maxo: false, gbif: true },
                  { feature: 'Open Source', dw: false, qgis: true, maxo: false, gbif: true },
                  { feature: 'No Setup Required', dw: true, qgis: false, maxo: false, gbif: false },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-900 font-medium">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      {row.dw ? (
                        <Check className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.qgis ? (
                        <Check className="w-5 h-5 text-slate-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.maxo ? (
                        <Check className="w-5 h-5 text-slate-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.gbif ? (
                        <Check className="w-5 h-5 text-slate-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-slate-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Start your journey in conservation science</h2>
          <p className="text-lg text-slate-600 mb-8">
            Sign up today for a free 14-day Pro trial. No credit card required.
          </p>
          <Button 
            size="lg" 
            className="bg-bangor-red hover:bg-bangor-red/90"
            onClick={() => window.location.href = '/ProductOverview'}
            aria-label="Download product overview"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Product Overview
          </Button>
        </div>
      </div>
    </div>
  );
}