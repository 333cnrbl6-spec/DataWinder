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
          DataWinder is an enterprise-grade species distribution modeling platform built for conservation researchers, universities, environmental consultancies, and government agencies. It uniquely integrates IUCN Red List, GBIF, iNaturalist, and SpeciesLink with AI-powered data quality automation, multiple SDM algorithms, climate scenario projections, and production-ready reporting—eliminating the need for fragmented tools (QGIS, MaxEnt, R) and manual data management.
        </p>
        <div className="bg-bangor-red/5 border-l-4 border-bangor-red p-4 text-slate-700">
          <strong>Key Value Proposition:</strong> Complete workflow from multi-source data integration to publication-ready SDM results in hours. No installation, no coding, no infrastructure—just results.
        </div>
      </section>

      {/* Core Features */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b-2 border-bangor-red/30 pb-2">
          Core Features
        </h2>
        <div className="grid grid-cols-2 gap-6">
           {[
             { title: 'Unified Biodiversity Search', desc: 'Query IUCN, GBIF, iNaturalist, SpeciesLink simultaneously with smart filtering' },
             { title: 'AI Data Quality Pipeline', desc: 'Auto-detect duplicates, validate taxonomy, flag outliers, score data completeness' },
             { title: 'Smart File Import', desc: 'CSV, Excel, GeoJSON, Shapefiles, KML—auto-classified and routed to correct entity' },
             { title: 'MaxEnt & Ensemble SDM', desc: 'Integrated species distribution modeling with automatic parameter optimization' },
             { title: 'Climate Scenario Projections', desc: 'Model distributions under current + 3 future climate scenarios (RCP 2.6/4.5/8.5)' },
             { title: 'Interactive GIS Mapping', desc: 'Drag-to-draw filters, polygon-based analysis, multi-layer overlays, suitability heatmaps' },
             { title: 'Publication-Ready Reports', desc: 'Generate comprehensive PDFs with maps, metrics, interpretation, and bibliography' },
             { title: 'Team Collaboration', desc: 'Real-time workspaces, role-based access, workspace comments, version history, audit logs' },
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
              <td className="border border-slate-300 px-4 py-2"><strong>£0/mo</strong> (Academic: @bangor.ac.uk)</td>
              <td className="border border-slate-300 px-4 py-2"><strong>£99/mo</strong> (14-day trial free)</td>
              <td className="border border-slate-300 px-4 py-2"><strong>Custom</strong> (Enterprise)</td>
            </tr>
            <tr className="bg-slate-50">
              <td className="border border-slate-300 px-4 py-2">Up to 5 projects</td>
              <td className="border border-slate-300 px-4 py-2">Unlimited projects</td>
              <td className="border border-slate-300 px-4 py-2">Unlimited + dedicated support</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-4 py-2">1,000 occurrences/month</td>
              <td className="border border-slate-300 px-4 py-2">Unlimited occurrences</td>
              <td className="border border-slate-300 px-4 py-2">Unlimited everything</td>
            </tr>
            <tr className="bg-slate-50">
              <td className="border border-slate-300 px-4 py-2">5 team members, MaxEnt only</td>
              <td className="border border-slate-300 px-4 py-2">Unlimited members, ensemble+climate</td>
              <td className="border border-slate-300 px-4 py-2">API, integrations, SLA</td>
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
          <li><strong>Complete Unified Workflow:</strong> Query IUCN/GBIF, validate data, run models, generate reports—all in one cloud platform. No QGIS, MaxEnt, R, or terminal needed.</li>
          <li><strong>Enterprise-Grade QA:</strong> AI-powered detection of duplicates, outliers, taxonomy mismatches with actionable corrections. Comprehensive audit trails for regulatory compliance.</li>
          <li><strong>Real-Time Collaboration:</strong> Shared projects, role-based access (viewer/editor), workspace comments, version history, and team notifications—designed for research teams.</li>
          <li><strong>Advanced SDM Capabilities:</strong> MaxEnt + ensemble methods, climate scenario projections (4 futures), automatic parameter tuning, publication-ready visualizations.</li>
          <li><strong>Zero Infrastructure Overhead:</strong> Cloud-native, fully managed. No local installation, no Java dependencies, no server management. Access from anywhere.</li>
          <li><strong>Multi-Data Integration:</strong> Seamlessly combine IUCN, GBIF, iNaturalist, SpeciesLink, field data, and custom CSVs with automatic deduplication.</li>
          <li><strong>Academic & Government Friendly:</strong> Free tier for universities, compliance with data protection regulations, export to publication standards.</li>
        </ol>
      </section>

      {/* Target Users */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b-2 border-bangor-red/30 pb-2">
          Target Users
        </h2>
        <ul className="list-disc list-inside space-y-1 text-slate-700">
          <li><strong>Academic Researchers:</strong> Ecology, conservation biology, biogeography, evolutionary biology departments</li>
          <li><strong>University Conservation Centers:</strong> Field stations, research institutes, graduate programs</li>
          <li><strong>Conservation NGOs:</strong> Species monitoring, habitat protection, threat assessment programs</li>
          <li><strong>Government Agencies:</strong> Natural England, DEFRA, wildlife trusts, environmental consultancies</li>
          <li><strong>Zoological Societies:</strong> Field programs, breeding programs, species recovery initiatives</li>
          <li><strong>Environmental Consultancies:</strong> Impact assessments, species surveys, conservation planning</li>
          <li><strong>Research Institutions:</strong> Museum collections, herbaria, citizen science programs</li>
        </ul>
      </section>

      {/* Roadmap */}
      <section className="mb-8 page-break">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b-2 border-bangor-red/30 pb-2">
          Product Roadmap (2026–2027)
        </h2>
        <div className="space-y-4">
          {[
            { phase: 'Q2 2026 (Live)', items: ['Version 1.0 General Release', '14-day Pro trial + Free Academic tier', 'MaxEnt + Ensemble SDM', 'Climate scenario projections', 'AI photo identification', 'Publication-ready reports'] },
            { phase: 'Q3 2026 (Roadmap)', items: ['Advanced threat assessment module', 'Occupancy-habitat modeling', 'Multi-species interaction analysis', 'Phylogenetic filtering tools'] },
            { phase: 'Q4 2026 (Roadmap)', items: ['Full REST API & webhooks', 'Zapier/IFTTT integrations', 'White-label enterprise edition', 'Custom model builder (no-code)'] },
            { phase: 'Q1 2027+ (Planned)', items: ['Mobile companion app (iOS/Android)', 'Real-time field survey sync', 'Journal manuscript integration', 'Advanced ensemble methods (stacking, boosting)'] },
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