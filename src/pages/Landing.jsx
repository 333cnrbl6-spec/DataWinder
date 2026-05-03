import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Leaf, Users, Zap, TrendingUp, Globe, Shield, Sparkles, Database, FileOutput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function Landing() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (auth) => {
      setIsAuthenticated(auth);
      if (auth) {
        const userData = await base44.auth.me().catch(() => null);
        setUser(userData);
      }
    });
  }, []);

  const isBangorUser = user?.email?.endsWith('@bangor.ac.uk');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 sticky top-0 z-50 bg-slate-900/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-bangor-red rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">DataWinder</span>
          </Link>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-slate-300">{user?.full_name}</span>
                <Link to="/ResearcherDashboard">
                  <Button className="bg-bangor-red hover:bg-bangor-red/90">Dashboard</Button>
                </Link>
              </>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="text-sm hover:text-bangor-red transition"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
             Conservation Science, <span className="text-bangor-red">Accelerated</span>
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
             Start your 14-day trial today — no credit card required. Integrate IUCN, GBIF, and field data. Run production-grade SDM models. Generate publication-ready reports.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <Link to="/ResearcherDashboard">
                  <Button size="lg" className="bg-bangor-red hover:bg-bangor-red/90 gap-2">
                    Open Dashboard <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <button
                    onClick={() => base44.auth.redirectToLogin()}
                    className="px-8 py-3 bg-bangor-red hover:bg-bangor-red/90 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    Start 14-Day Trial <ArrowRight className="w-4 h-4" />
                  </button>
              )}
              <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
                View Docs
              </Button>
            </div>
            {isBangorUser && (
              <div className="mt-6 p-4 bg-green-900/30 border border-green-600/50 rounded-lg">
                <p className="text-sm text-green-300">✓ Bangor University account detected - Free tier activated</p>
              </div>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-bangor-red/20 to-blue-600/20 rounded-2xl blur-3xl"></div>
            <div className="relative bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-8">
              <div className="space-y-4">
                <div className="h-3 bg-slate-700 rounded w-full"></div>
                <div className="h-3 bg-slate-700 rounded w-4/5"></div>
                <div className="h-32 bg-slate-700 rounded mt-4"></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-12 bg-slate-600 rounded"></div>
                  <div className="h-12 bg-slate-600 rounded"></div>
                  <div className="h-12 bg-slate-600 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SDM & Biodiversity Capabilities */}
      <section className="bg-slate-800/50 py-20 border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-4">Complete Species Distribution Modeling Toolkit</h2>
          <p className="text-center text-slate-400 mb-16">Integrated workflow from data ingestion to publication-ready results</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Database, title: 'Unified Data Integration', desc: 'Query IUCN Red List, GBIF, iNaturalist, SpeciesLink, and upload field observations. Auto-deduplicate, validate taxonomy, flag outliers with AI.' },
              { icon: Zap, title: 'Automated Modeling Pipeline', desc: 'One-click MaxEnt models with automatic outlier removal, spatial thinning, bioclimatic variable selection, ensemble comparisons, and climate projections.' },
              { icon: CheckCircle, title: 'AI-Powered Quality Assurance', desc: 'Detect duplicate occurrences, validate against IUCN/GBIF, identify geographic outliers, flag suspicious dates, and score overall data quality.' },
              { icon: FileOutput, title: 'Publication-Ready Reports', desc: 'Generate detailed conservation assessments, threat evaluations, species profiles, and SDM results with interactive maps, charts, and metrics.' },
              { icon: TrendingUp, title: 'Climate Scenario Analysis', desc: 'Project species distributions under 4 climate futures (current + RCP 2.6, 4.5, 8.5) with response curves and suitability comparisons.' },
              { icon: Globe, title: 'Team Collaboration & Compliance', desc: 'Shared projects with role-based access, real-time workspace features, version history, audit trails, and conservation best practice compliance.' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-8 hover:border-bangor-red/50 transition group">
                <item.icon className="w-12 h-12 text-bangor-red mb-4 group-hover:scale-110 transition" />
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12">Comprehensive Conservation Toolkit</h2>
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-6">Data Management & Quality</h3>
            {['Query IUCN Red List, GBIF, iNaturalist, SpeciesLink simultaneously', 'Smart file import (CSV, Excel, GeoJSON, Shapefiles, KML)', 'Automated duplicate detection and intelligent merging', 'Taxonomic validation against authoritative sources', 'Geographic outlier flagging with confidence scoring', 'Temporal validation (suspicious date detection)', 'Photo upload with AI species identification (Pro)', 'Complete version history with change tracking', 'Audit trails for compliance and transparency'].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-6">Modeling & Analysis</h3>
            {['MaxEnt species distribution models (proven standard)', 'Ensemble method comparison (Pro tier)', 'Automatic outlier removal and spatial thinning', '19 bioclimatic variables (WorldClim data)', 'Current climate + 4 future climate scenarios (Pro)', 'Response curve visualization per variable', 'Feature/variable importance ranking', 'Model performance metrics (AUC, TSS, sensitivity, specificity, kappa)', 'Interactive prediction maps with suitability gradients', 'Comparative analysis across multiple models', 'Publication-ready result summaries'].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Pricing Comparison */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-4">Plans for Every Conservation Need</h2>
        <p className="text-center text-slate-400 mb-16">Free Academic for Bangor University. 14-day Pro trial for everyone else, then £99/month.</p>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* Free Academic Tier */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 hover:border-slate-600 transition">
            <h3 className="text-2xl font-bold mb-2">Free Academic</h3>
            <p className="text-slate-400 mb-6">@bangor.ac.uk emails only</p>
            <div className="text-4xl font-bold mb-2">£0<span className="text-lg text-slate-400">/month</span></div>
            <p className="text-xs text-slate-500 mb-6">Free forever for @bangor.ac.uk</p>
            <ul className="space-y-3 mb-8 text-sm">
              {[
                'Up to 5 projects',
                '1,000 occurrences/month',
                'Core SDM tools (MaxEnt)',
                'Data validation & QA',
                '5 team members',
                'Community support',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            {isAuthenticated && isBangorUser ? (
              <Button disabled className="w-full bg-slate-600">Active Plan</Button>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="w-full px-4 py-2 border border-slate-600 rounded-lg hover:bg-slate-700 transition font-medium"
              >
                Sign Up
              </button>
            )}
          </div>

          {/* Pro Tier */}
          <div className="bg-gradient-to-br from-bangor-red/20 to-blue-600/10 border-2 border-bangor-red/50 rounded-2xl p-8 relative transform md:scale-105">
            <div className="absolute top-4 right-4 bg-bangor-red text-white px-3 py-1 rounded-full text-xs font-semibold">Most Popular</div>
            <h3 className="text-2xl font-bold mb-2">Pro</h3>
            <p className="text-slate-400 mb-6">Professional researchers & organizations</p>
            <div className="text-4xl font-bold mb-2">£99<span className="text-lg text-slate-400">/month</span></div>
            <p className="text-xs text-slate-500 mb-6">14-day free trial, then £990/year (save 17%)</p>
            <ul className="space-y-3 mb-8 text-sm">
              {[
                'Unlimited projects',
                'Unlimited occurrences',
                'Advanced SDM tools (ensemble methods)',
                'Climate scenario projections',
                'Unlimited team members',
                'Priority email support',
                'API access (read/write)',
                'Custom integrations',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            {isAuthenticated && !isBangorUser ? (
              <Link to="/Pricing">
                <Button className="w-full bg-bangor-red hover:bg-bangor-red/90">Upgrade Now</Button>
              </Link>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="w-full px-4 py-2 bg-bangor-red hover:bg-bangor-red/90 rounded-lg transition font-semibold"
              >
                Start Your 14-Day Trial
              </button>
            )}
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-6 py-4 font-bold">Feature</th>
                <th className="text-center px-6 py-4 font-bold">Free Academic</th>
                <th className="text-center px-6 py-4 font-bold">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {[
                { feature: 'Projects', free: 'Up to 5', pro: 'Unlimited' },
                { feature: 'Occurrences/month', free: '1,000', pro: 'Unlimited' },
                { feature: 'Team Members', free: '5', pro: 'Unlimited' },
                { feature: 'Data Sources (IUCN, GBIF, etc.)', free: '4 (read-only)', pro: 'All + custom APIs' },
                { feature: 'File Import (CSV, Excel, GeoJSON)', free: '✓', pro: '✓ + Shapefiles' },
                { feature: 'Photo Upload & AI ID', free: '❌', pro: '✓' },
                { feature: 'SDM Modeling', free: 'MaxEnt only', pro: 'MaxEnt + Ensemble' },
                { feature: 'Climate Scenarios', free: 'Current only', pro: '4 futures + RCP' },
                { feature: 'Data Quality Audit', free: 'Basic', pro: 'Comprehensive' },
                { feature: 'Report Generation', free: 'Simple PDF', pro: 'Advanced + export' },
                { feature: 'Version History', free: '✓', pro: '✓ + rollback' },
                { feature: 'API Access (Read/Write)', free: '❌', pro: '✓' },
                { feature: 'Priority Support', free: 'Community', pro: '✓ 24h response' },
                { feature: 'Custom Integrations', free: '❌', pro: '✓' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-700/20 transition">
                  <td className="px-6 py-4 font-medium text-slate-300">{row.feature}</td>
                  <td className="text-center px-6 py-4 text-slate-400">{row.free}</td>
                  <td className="text-center px-6 py-4 text-slate-300 font-medium">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-800/50 border-t border-slate-700/50 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to transform your conservation research?</h2>
          <p className="text-lg text-slate-300 mb-8">Join hundreds of researchers using DataWinder for species distribution modeling. Start free today — 14-day trial, no credit card needed.</p>
          {isAuthenticated ? (
            <Link to="/ResearcherDashboard">
              <Button size="lg" className="bg-bangor-red hover:bg-bangor-red/90 gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="px-8 py-3 bg-bangor-red hover:bg-bangor-red/90 rounded-lg font-semibold transition inline-flex items-center gap-2"
            >
              Start Free 14-Day Trial <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* Legal & Compliance */}
      <section className="bg-slate-800/50 border-t border-slate-700/50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Trust & Compliance</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-8">
              <Shield className="w-12 h-12 text-bangor-red mb-4" />
              <h3 className="font-bold text-lg mb-3">Data Security</h3>
              <p className="text-slate-300 text-sm mb-4">Enterprise-grade encryption, secure data storage, and regular security audits. Your biodiversity data is protected with industry standards.</p>
              <Link to="/PrivacyPolicy" className="text-bangor-red hover:underline text-sm font-medium">Read Privacy Policy →</Link>
            </div>
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-8">
              <CheckCircle className="w-12 h-12 text-bangor-red mb-4" />
              <h3 className="font-bold text-lg mb-3">Compliance & Standards</h3>
              <p className="text-slate-300 text-sm mb-4">Designed for academic and professional use. Compliant with data protection regulations and conservation best practices.</p>
              <Link to="/TermsOfService" className="text-bangor-red hover:underline text-sm font-medium">View Terms of Service →</Link>
            </div>
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-8">
              <Globe className="w-12 h-12 text-bangor-red mb-4" />
              <h3 className="font-bold text-lg mb-3">Global Impact</h3>
              <p className="text-slate-300 text-sm mb-4">Contributing to international conservation efforts. Integrate with IUCN, GBIF, and other global biodiversity initiatives.</p>
              <a href="#" className="text-bangor-red hover:underline text-sm font-medium">Learn about our partners →</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700/50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link to="/Landing" className="hover:text-white transition">Home</Link></li>
                <li><Link to="/Pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><Link to="/About" className="hover:text-white transition">About</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link to="/FAQBot" className="hover:text-white transition">Help & FAQ</Link></li>
                <li><a href="mailto:support@datawinder.app" className="hover:text-white transition">Email Support</a></li>
                <li><Link to="/Community" className="hover:text-white transition">Community</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link to="/TermsOfService" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link to="/PrivacyPolicy" className="hover:text-white transition">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <p className="text-slate-400 text-sm mb-2">support@datawinder.app</p>
              <p className="text-slate-500 text-xs">Built for conservation science</p>
            </div>
          </div>
          <div className="border-t border-slate-700/50 pt-8 text-center text-slate-400 text-sm">
            <p>© 2026 DataWinder. Species distribution modeling, simplified.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}