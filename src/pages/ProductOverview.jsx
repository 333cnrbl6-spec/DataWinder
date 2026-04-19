import React from 'react';
import { Download, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Printable PDF-ready product overview page
 * Use browser print (Ctrl+P) or export to PDF
 */
export default function ProductOverview() {
  const generatePDF = () => {
    window.print();
  };

  return (
    <div className="bg-white p-8 print:p-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 print:mb-12 border-b-4 border-bangor-red pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Leaf className="w-8 h-8 text-bangor-red" />
          <h1 className="text-4xl font-bold text-bangor-red">DataWinder</h1>
        </div>
        <p className="text-xl text-slate-600 font-semibold">
          Multi-Source Biodiversity Platform for Species Distribution Modeling
        </p>
        <p className="text-sm text-slate-500 mt-2">Version 1.0 • April 2026</p>
      </div>

      {/* Executive Summary */}
      <section className="mb-8 page-break">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b-2 border-bangor-red/30 pb-2">
          Executive Summary
        </h2>
        <p className="text-slate-700 mb-4">
          DataWinder is a production-ready species distribution modeling platform designed for conservation researchers, universities, and environmental organizations. It uniquely integrates data from IUCN Red List, iNaturalist, GBIF, and SpeciesLink with automated quality assurance and MAXENT modeling capabilities—eliminating fragmented workflows and manual data integration.
        </p>
        <div className="bg-bangor-red/5 border-l-4 border-bangor-red p-4 text-slate-700">
          <strong>Key Value Proposition:</strong> From species search to peer-reviewed SDM results in hours instead of weeks.
        </div>
      </section>

      {/* Core Features */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b-2 border-bangor-red/30 pb-2">
          Core Features
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {[
            { title: 'Multi-Source Search', desc: 'Query 4 global biodiversity platforms simultaneously' },
            { title: 'Automated Data Cleaning', desc: 'AI flags duplicates, taxonomic errors, geographic outliers' },
            { title: 'Smart File Import', desc: 'Accepts CSV, Excel, GeoJSON, Shapefile, KML—auto-routed' },
            { title: 'MAXENT Modeling', desc: 'Integrated species distribution modeling with climate scenarios' },
            { title: 'GIS Tools', desc: 'Interactive mapping, polygon filtering, range overlays' },
            { title: 'Team Collaboration', desc: 'Shared projects, role-based access, workspace management' },
            { title: 'Advanced Analytics', desc: 'Performance metrics (AUC, TSS), variable importance, comparisons' },
            { title: 'Cloud Storage', desc: '5 GB—1 TB depending on plan' },
          ].map((feature, idx) => (
            <div key={idx}>
              <h4 className="font-semibold text-slate-900">{feature.title}</h4>
              <p className="text-sm text-slate-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b-2 border-bangor-red/30 pb-2">
          Pricing & Tiers
        </h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Researcher</th>
              <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Professional</th>
              <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 px-4 py-2"><strong>£0/mo</strong> (Free)</td>
              <td className="border border-slate-300 px-4 py-2"><strong>£79/mo</strong></td>
              <td className="border border-slate-300 px-4 py-2"><strong>£249/mo</strong></td>
            </tr>
            <tr className="bg-slate-50">
              <td className="border border-slate-300 px-4 py-2">1 project, 5GB storage</td>
              <td className="border border-slate-300 px-4 py-2">Unlimited projects, 100GB</td>
              <td className="border border-slate-300 px-4 py-2">Unlimited all, 1TB</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-4 py-2">1 team member</td>
              <td className="border border-slate-300 px-4 py-2">5 team members</td>
              <td className="border border-slate-300 px-4 py-2">Unlimited members</td>
            </tr>
            <tr className="bg-slate-50">
              <td className="border border-slate-300 px-4 py-2">1 SDM/month</td>
              <td className="border border-slate-300 px-4 py-2">50 SDMs/month</td>
              <td className="border border-slate-300 px-4 py-2">Unlimited</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Competitive Advantages */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b-2 border-bangor-red/30 pb-2">
          Competitive Advantages
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-slate-700">
          <li><strong>Unified Workflow:</strong> No switching between GBIF, QGIS, Maxent, etc.—everything in one platform</li>
          <li><strong>Intelligent QA:</strong> Automated detection of data quality issues (duplicates, outliers, taxonomy mismatches)</li>
          <li><strong>Built for Teams:</strong> Real-time collaboration, shared workspaces, role-based permissions</li>
          <li><strong>Production-Ready:</strong> Enterprise-grade security, API access, custom integrations</li>
          <li><strong>No Local Setup:</strong> Cloud-native—no MAXENT installation, Java dependency, or infrastructure overhead</li>
          <li><strong>Researcher-First Design:</strong> Built by conservation scientists, for conservation scientists</li>
        </ol>
      </section>

      {/* Target Users */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b-2 border-bangor-red/30 pb-2">
          Target Users
        </h2>
        <ul className="list-disc list-inside space-y-1 text-slate-700">
          <li>Academic researchers in ecology, conservation biology, biogeography</li>
          <li>NGOs and conservation organizations</li>
          <li>Universities and research institutions</li>
          <li>Environmental consultancies</li>
          <li>Natural England and government conservation agencies</li>
          <li>Zoological societies and wildlife trusts</li>
        </ul>
      </section>

      {/* Roadmap */}
      <section className="mb-8 page-break">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b-2 border-bangor-red/30 pb-2">
          Product Roadmap (2026–2027)
        </h2>
        <div className="space-y-4">
          {[
            { phase: 'Q2 2026', items: ['Version 1.0 General Release', 'Community Beta Program', 'Founding Member Tier'] },
            { phase: 'Q3 2026', items: ['Ensemble Modeling', 'Threat Assessment Module', 'Advanced Analytics Dashboard'] },
            { phase: 'Q4 2026', items: ['API & Webhooks', 'Custom Integrations', 'White-Label Enterprise'] },
            { phase: 'Q1 2027', items: ['Mobile App (iOS/Android)', 'Real-Time Collaboration', 'Academic Journal Integration'] },
          ].map((quarter, idx) => (
            <div key={idx}>
              <h4 className="font-semibold text-slate-900">{quarter.phase}</h4>
              <ul className="list-disc list-inside text-sm text-slate-600 ml-2">
                {quarter.items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Contact & CTA */}
      <section className="bg-bangor-red/10 p-6 rounded-lg border-2 border-bangor-red/30">
        <h2 className="text-xl font-bold text-bangor-red mb-3">Get Started Today</h2>
        <p className="text-slate-700 mb-4">
          Start free with no credit card required. All plans include email support and access to our growing community of conservation researchers worldwide.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a href="/" className="inline-block px-6 py-2 bg-bangor-red text-white font-semibold rounded-lg hover:bg-bangor-red/90">
            Launch App
          </a>
          <a href="mailto:hello@datawinder.io" className="inline-block px-6 py-2 border-2 border-bangor-red text-bangor-red font-semibold rounded-lg">
            Contact Sales
          </a>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-500 print:mt-16">
        <p>DataWinder • www.datawinder.io • Version 1.0 • April 2026</p>
        <p className="mt-2">Built by conservation researchers, for conservation researchers. Supporting biodiversity science worldwide.</p>
      </div>

      {/* Print Button */}
      <div className="fixed bottom-4 right-4 print:hidden">
        <Button
          onClick={generatePDF}
          className="bg-bangor-red hover:bg-bangor-red/90"
          size="lg"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>
    </div>
  );
}