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
              Species Distribution Modeling <span className="text-bangor-red">Simplified</span>
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Integrate IUCN, GBIF, and field data. Run advanced SDM pipelines. Generate conservation reports. All in one platform.
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
                  Start Free <ArrowRight className="w-4 h-4" />
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

      {/* Features */}
      <section className="bg-slate-800/50 py-20 border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">Powerful Tools for Conservation Science</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Database, title: 'Multi-Source Data', desc: 'Integrate IUCN, GBIF, iNaturalist, and custom datasets in seconds.' },
              { icon: Zap, title: 'Automated SDM Pipeline', desc: 'Run MaxEnt, outlier detection, and variable selection automatically.' },
              { icon: CheckCircle, title: 'Data Validation', desc: 'Detect duplicates, validate taxonomy, flag geographic outliers.' },
              { icon: FileOutput, title: 'Report Generation', desc: 'Create publication-ready PDFs and interactive visualizations.' },
              { icon: Users, title: 'Team Collaboration', desc: 'Share projects, assign roles, track changes and versions.' },
              { icon: Shield, title: 'Enterprise Security', desc: 'Secure data storage, audit logs, compliance reporting.' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-8 hover:border-bangor-red/50 transition">
                <item.icon className="w-12 h-12 text-bangor-red mb-4" />
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-slate-300 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
        <p className="text-center text-slate-400 mb-16">Free for Bangor University. Pro for everyone else.</p>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-2">Free</h3>
            <p className="text-slate-400 mb-6">Bangor University only</p>
            <div className="text-4xl font-bold mb-6">£0<span className="text-lg text-slate-400">/month</span></div>
            <ul className="space-y-3 mb-8">
              {['Up to 5 projects', '1,000 occurrences/month', 'Community support', 'Core SDM tools'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
            {isAuthenticated && isBangorUser ? (
              <Button disabled className="w-full bg-slate-600">Active Plan</Button>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="w-full px-4 py-2 border border-slate-600 rounded-lg hover:bg-slate-700 transition"
              >
                Get Started
              </button>
            )}
          </div>

          {/* Pro Tier */}
          <div className="bg-gradient-to-br from-bangor-red/20 to-blue-600/10 border border-bangor-red/50 rounded-2xl p-8 relative">
            <div className="absolute top-4 right-4 bg-bangor-red text-white px-3 py-1 rounded-full text-xs font-semibold">Popular</div>
            <h3 className="text-2xl font-bold mb-2">Pro</h3>
            <p className="text-slate-400 mb-6">For professionals & organizations</p>
            <div className="text-4xl font-bold mb-6">£99<span className="text-lg text-slate-400">/month</span></div>
            <ul className="space-y-3 mb-8">
              {['Unlimited projects', 'Unlimited occurrences', 'Priority email support', 'Advanced tools', 'API access', 'Custom integrations'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
            {isAuthenticated && !isBangorUser ? (
              <Link to="/Pricing">
                <Button className="w-full bg-bangor-red hover:bg-bangor-red/90">Upgrade to Pro</Button>
              </Link>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="w-full px-4 py-2 bg-bangor-red hover:bg-bangor-red/90 rounded-lg transition font-semibold"
              >
                Start Free Trial
              </button>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-800/50 border-t border-slate-700/50 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to accelerate conservation science?</h2>
          <p className="text-lg text-slate-300 mb-8">Join researchers worldwide using DataWinder for species distribution modeling.</p>
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
              Start Free Today <ArrowRight className="w-4 h-4" />
            </button>
          )}
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
                <li><Link to="/TermsOfService" className="hover:text-white transition">Terms</Link></li>
                <li><Link to="/PrivacyPolicy" className="hover:text-white transition">Privacy</Link></li>
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
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link to="/About" className="hover:text-white transition">About</Link></li>
                <li><a href="https://github.com" className="hover:text-white transition">GitHub</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <p className="text-slate-400 text-sm">support@datawinder.app</p>
            </div>
          </div>
          <div className="border-t border-slate-700/50 pt-8 text-center text-slate-400 text-sm">
            <p>© 2026 DataWinder. Conservation science, simplified.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}