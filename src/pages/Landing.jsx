import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Leaf, Users, Zap, TrendingUp, Globe, Shield, Sparkles, Database, FileOutput, Map, BarChart3, FileText, AlertCircle, Play, Layers, Zap as ZapIcon, MapPin, Clock, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function Landing() {
  const navigate = useNavigate();
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

  // Demo path — always navigate directly, no login required for demos
  const handleDemo = (demoPath) => {
    navigate(demoPath);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div>
              <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight">
                Conservation Science, <span className="text-bangor-red">Accelerated</span>
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed">
                Integrate global biodiversity data, run production-grade species distribution models, and generate publication-ready reports in minutes — not months.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <Link to="/ResearcherDashboard">
                  <Button size="lg" className="bg-bangor-red hover:bg-bangor-red/90 gap-2 h-12 text-base">
                    Open Dashboard <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="px-8 py-3 bg-bangor-red hover:bg-bangor-red/90 rounded-lg font-bold transition flex items-center justify-center gap-2 h-12 text-base"
                >
                  Start 14-Day Trial <ArrowRight className="w-5 h-5" />
                </button>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleDemo('/GlobalSpeciesExplorer')}
                className="border-slate-500 text-white hover:bg-slate-800 gap-2 h-12 text-base"
              >
                <Play className="w-5 h-5" /> Try Demo
              </Button>
            </div>

            {isBangorUser && (
              <div className="p-4 bg-green-900/30 border border-green-600/50 rounded-lg">
                <p className="text-sm text-green-300">✓ Bangor University account detected - Free tier activated</p>
              </div>
            )}
          </div>

          {/* Hero Visual */}
          <div className="relative h-96">
            <div className="absolute inset-0 bg-gradient-to-r from-bangor-red/20 via-blue-600/20 to-purple-600/20 rounded-2xl blur-3xl"></div>
            <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur border border-slate-700/50 rounded-2xl p-8 h-full flex flex-col justify-between overflow-hidden">
              {/* Map Preview */}
              <div className="space-y-4">
                <div className="h-40 bg-gradient-to-br from-green-600/30 to-blue-600/20 rounded-lg border border-slate-600/50 flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-bangor-red/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/40 p-3 rounded border border-slate-600/30">
                    <div className="text-xs text-slate-400 mb-1">Species</div>
                    <div className="text-sm font-bold">2,847</div>
                  </div>
                  <div className="bg-slate-700/40 p-3 rounded border border-slate-600/30">
                    <div className="text-xs text-slate-400 mb-1">Occurrences</div>
                    <div className="text-sm font-bold">45K+</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="bg-slate-800/30 py-20 border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Complete SDM Toolkit</h2>
            <p className="text-xl text-slate-400">Everything you need from data collection to conservation decision-making</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Database,
                title: 'Unified Data Integration',
                desc: 'Query IUCN Red List, GBIF, iNaturalist, SpeciesLink simultaneously. Upload field observations, photos with AI ID, and GeoJSON boundaries.',
                demo: '/SmartImport'
              },
              {
                icon: Zap,
                title: 'Automated Modeling',
                desc: 'One-click MaxEnt models with automatic outlier removal, spatial thinning, climate projections, and ensemble comparisons.',
                demo: '/SDMPipeline'
              },
              {
                icon: AlertCircle,
                title: 'AI Quality Assurance',
                desc: 'Detect duplicates, validate taxonomy against IUCN/GBIF, flag geographic outliers, and score overall data quality.',
                demo: '/DataValidation'
              },
              {
                icon: FileOutput,
                title: 'Publication-Ready Reports',
                desc: 'Generate conservation assessments, threat evaluations, and SDM results with interactive maps, charts, and metrics.',
                demo: '/SpeciesReportGenerator'
              },
              {
                icon: TrendingUp,
                title: 'Climate Scenario Analysis',
                desc: 'Project distributions under current + 4 climate futures (RCP 2.6, 4.5, 8.5) with response curves.',
                demo: '/ClimateImpactViewer'
              },
              {
                icon: Users2,
                title: 'Team Collaboration',
                desc: 'Shared projects with roles, workspace comments, real-time updates, version history, and audit trails.',
                demo: '/ProjectWorkspace/demo'
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-8 hover:border-bangor-red/50 transition group cursor-pointer"
                onClick={() => handleDemo(item.demo)}
              >
                <div className="flex items-start justify-between mb-4">
                  <item.icon className="w-12 h-12 text-bangor-red group-hover:scale-110 transition" />
                  {!isAuthenticated && <Play className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition" />}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-16">Comprehensive Conservation Toolkit</h2>

        <div className="grid md:grid-cols-2 gap-16">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold mb-8">Data Management & Quality</h3>
            {[
              'Query IUCN Red List, GBIF, iNaturalist, SpeciesLink',
              'Smart file import (CSV, Excel, GeoJSON, Shapefiles)',
              'Automated duplicate detection & intelligent merging',
              'Taxonomic validation against authoritative sources',
              'Geographic outlier flagging with confidence scoring',
              'Photo upload with AI species identification',
              'Complete version history with change tracking',
              'Audit trails for compliance & transparency',
              'Data quality scoring (0-100%)'
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 group">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5 group-hover:scale-110 transition" />
                <span className="text-slate-300 group-hover:text-slate-100 transition">{item}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold mb-8">Modeling & Analysis</h3>
            {[
              'MaxEnt species distribution models (proven standard)',
              'Ensemble method comparison across multiple algorithms',
              'Automatic outlier removal & spatial thinning',
              '19 bioclimatic variables (WorldClim 2.1 data)',
              'Current climate + 4 future climate scenarios',
              'Response curve visualization per variable',
              'Variable importance ranking (permutation + contribution)',
              'Performance metrics: AUC, TSS, sensitivity, specificity',
              'Interactive prediction maps with suitability gradients'
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 group">
                <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5 group-hover:scale-110 transition" />
                <span className="text-slate-300 group-hover:text-slate-100 transition">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="bg-slate-800/50 py-20 border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-4">Try DataWinder in Action</h2>
          <p className="text-center text-slate-400 mb-16 text-lg">Explore the platform — no sign-up required</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Global Species Map',
                desc: 'Explore 45K+ occurrences on an interactive map',
                icon: MapPin,
                path: '/GlobalSpeciesExplorer'
              },
              {
                title: 'Import Data',
                desc: 'See smart file import and validation',
                icon: FileOutput,
                path: '/SmartImport'
              },
              {
                title: 'Run SDM Model',
                desc: 'Launch a real modeling pipeline',
                icon: Zap,
                path: '/SDMPipeline'
              },
              {
                title: 'Generate Report',
                desc: 'View publication-ready outputs',
                icon: FileText,
                path: '/SpeciesReportGenerator'
              },
            ].map((demo, i) => (
              <button
                key={i}
                onClick={() => handleDemo(demo.path)}
                className="group bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-xl p-6 hover:border-bangor-red/50 hover:from-slate-800/80 transition"
              >
                <demo.icon className="w-10 h-10 text-bangor-red mb-4 group-hover:scale-110 transition" />
                <h3 className="font-bold text-lg mb-2">{demo.title}</h3>
                <p className="text-sm text-slate-400 group-hover:text-slate-300 transition">{demo.desc}</p>
                <div className="mt-4 flex items-center text-bangor-red text-sm font-semibold group-hover:gap-2 transition">
                  Try Demo <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-4">Plans for Every Conservation Need</h2>
        <p className="text-center text-slate-400 mb-16">Free for Bangor University. 14-day Pro trial for all academic & professional researchers, then £99/month.</p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Academic */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 hover:border-slate-600 transition">
            <h3 className="text-2xl font-bold mb-2">Free Academic</h3>
            <p className="text-slate-400 mb-6">Bangor University (@bangor.ac.uk)</p>
            <div className="text-4xl font-bold mb-6">£0<span className="text-lg text-slate-400">/month</span></div>
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

          {/* Pro */}
          <div className="bg-gradient-to-br from-bangor-red/20 to-blue-600/10 border-2 border-bangor-red/50 rounded-2xl p-8 relative transform md:scale-105">
            <div className="absolute top-4 right-4 bg-bangor-red text-white px-3 py-1 rounded-full text-xs font-semibold">Most Popular</div>
            <h3 className="text-2xl font-bold mb-2">Pro</h3>
            <p className="text-slate-400 mb-6">Academic & professional researchers</p>
            <div className="text-4xl font-bold mb-2">£99<span className="text-lg text-slate-400">/month</span></div>
            <p className="text-xs text-slate-500 mb-6">14-day free trial, then £990/year (save 17%)</p>
            <ul className="space-y-3 mb-8 text-sm">
              {[
                'Unlimited projects',
                'Unlimited occurrences',
                'Advanced SDM tools',
                'Climate scenarios',
                'Unlimited team members',
                'Priority email support',
                'API access',
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
                Start 14-Day Trial
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Trust & Compliance */}
      <section className="bg-slate-800/50 border-t border-slate-700/50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Trust & Compliance</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-8">
              <Shield className="w-12 h-12 text-bangor-red mb-4" />
              <h3 className="font-bold text-lg mb-3">Data Security</h3>
              <p className="text-slate-300 text-sm">Enterprise-grade encryption, secure storage, and regular audits protect your biodiversity data.</p>
            </div>
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-8">
              <CheckCircle className="w-12 h-12 text-bangor-red mb-4" />
              <h3 className="font-bold text-lg mb-3">Compliance</h3>
              <p className="text-slate-300 text-sm">Designed for academic and professional research with conservation best practices compliance.</p>
            </div>
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-8">
              <Globe className="w-12 h-12 text-bangor-red mb-4" />
              <h3 className="font-bold text-lg mb-3">Global Impact</h3>
              <p className="text-slate-300 text-sm">Contributing to international conservation. Integrated with IUCN, GBIF, and global initiatives.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to accelerate your conservation research?</h2>
        <p className="text-lg text-slate-300 mb-8">Join researchers transforming species distribution modeling. Start free today — 14-day trial, no credit card needed.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
          <Button
            size="lg"
            variant="outline"
            onClick={() => handleDemo('/GlobalSpeciesExplorer')}
            className="border-slate-500 text-white hover:bg-slate-800 gap-2"
          >
            <Play className="w-4 h-4" /> Try Demo First
          </Button>
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
            <p>© 2026 DataWinder. Species distribution modeling, accelerated.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}