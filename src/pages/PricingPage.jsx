import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Download, Zap, Users, Database, Gauge } from 'lucide-react';
import { COMMERCIAL_CONFIG } from '@/lib/commercialConfig';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = Object.values(COMMERCIAL_CONFIG.PLANS);

  const comparisonFeatures = [
    { category: 'Data Management', features: ['Data Sources', 'Species Limit', 'Cloud Storage', 'Export Formats'] },
    { category: 'Modeling', features: ['Concurrent Models', 'SDM Types', 'Climate Scenarios', 'Model Comparison'] },
    { category: 'Team & Collaboration', features: ['Team Members', 'Projects', 'Annotation & Notes', 'Shared Workspaces'] },
    { category: 'Support & Tools', features: ['Support Level', 'Data Quality Checks', 'API Access', 'Custom Integrations'] },
  ];

  const featureMatrix = {
    'Data Sources': { researcher: '4 sources', professional: 'All sources', enterprise: 'All sources + custom' },
    'Species Limit': { researcher: 'Unlimited', professional: 'Unlimited', enterprise: 'Unlimited' },
    'Cloud Storage': { researcher: '5 GB', professional: '100 GB', enterprise: '1 TB' },
    'Export Formats': { researcher: 'CSV, GeoJSON', professional: 'CSV, GeoJSON, Shapefile', enterprise: 'All formats + API' },
    'Concurrent Models': { researcher: '1/month', professional: '50/month', enterprise: 'Unlimited' },
    'SDM Types': { researcher: 'MAXENT', professional: 'MAXENT + Ensemble', enterprise: 'MAXENT + Ensemble + Custom' },
    'Climate Scenarios': { researcher: 'Current only', professional: 'Current + 5 scenarios', enterprise: 'Custom scenarios' },
    'Model Comparison': { researcher: '2 models', professional: 'Unlimited', enterprise: 'Unlimited + advanced' },
    'Team Members': { researcher: '1', professional: '5', enterprise: 'Unlimited' },
    'Projects': { researcher: '2', professional: 'Unlimited', enterprise: 'Unlimited' },
    'Annotation & Notes': { researcher: 'Basic', professional: 'Advanced', enterprise: 'Premium' },
    'Shared Workspaces': { researcher: 'No', professional: 'Yes', enterprise: 'Yes + permissions' },
    'Support Level': { researcher: 'Email', professional: 'Priority email', enterprise: 'Slack + phone' },
    'Data Quality Checks': { researcher: '10/month', professional: 'Unlimited', enterprise: 'Unlimited' },
    'API Access': { researcher: 'Read-only', professional: 'Read/write', enterprise: 'Full + webhooks' },
    'Custom Integrations': { researcher: 'No', professional: 'Basic', enterprise: 'Yes' },
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
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            From individual researchers to large institutions — DataWinder scales with you
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
            >
              Annual <span className="text-xs text-green-600 font-bold">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {plans.map(plan => (
            <Card
              key={plan.id}
              className={`relative transition-all ${
                plan.badge
                  ? 'ring-2 ring-blue-500 md:scale-105 md:shadow-xl'
                  : 'hover:shadow-lg'
              }`}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white">
                  {plan.badge}
                </Badge>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <div className="text-4xl font-bold text-slate-900">
                    {plan.price_gbp === 0 ? 'Free' : `£${plan.price_gbp}`}
                  </div>
                  {plan.price_gbp > 0 && (
                    <div className="text-sm text-slate-600 mt-1">{plan.price_monthly_label}</div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <Button className="w-full" size="lg">
                  {plan.price_gbp === 0 ? 'Get Started Free' : 'Start Free Trial'}
                </Button>

                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
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
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to get started?</h2>
          <p className="text-lg text-slate-600 mb-8">
            Start free today. No credit card required.
          </p>
          <Button size="lg" className="bg-bangor-red hover:bg-bangor-red/90">
            <Download className="w-4 h-4 mr-2" />
            Download Product Overview
          </Button>
        </div>
      </div>
    </div>
  );
}