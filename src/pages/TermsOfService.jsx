import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/Landing" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-bangor-red rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">DataWinder</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-slate-600 mb-8">Last updated: May 2, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Agreement to Terms</h2>
            <p className="text-slate-700 leading-relaxed">
              By accessing and using DataWinder ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Permission is granted to temporarily download one copy of the materials (information or software) on DataWinder for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on the Service</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Disclaimer</h2>
            <p className="text-slate-700 leading-relaxed">
              The materials on DataWinder are provided on an 'as is' basis. DataWinder makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Limitations</h2>
            <p className="text-slate-700 leading-relaxed">
              In no event shall DataWinder or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on DataWinder, even if DataWinder or a DataWinder authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Accuracy of Materials</h2>
            <p className="text-slate-700 leading-relaxed">
              The materials appearing on DataWinder could include technical, typographical, or photographic errors. DataWinder does not warrant that any of the materials on DataWinder are accurate, complete, or current. DataWinder may make changes to the materials contained on its Service at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Links</h2>
            <p className="text-slate-700 leading-relaxed">
              DataWinder has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by DataWinder of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Modifications</h2>
            <p className="text-slate-700 leading-relaxed">
              DataWinder may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Governing Law</h2>
            <p className="text-slate-700 leading-relaxed">
              These terms and conditions are governed by and construed in accordance with the laws of the United Kingdom, and you irrevocably submit to the exclusive jurisdiction of the courts located in that location.
            </p>
          </section>

          <section className="bg-blue-50 border-l-4 border-bangor-red p-6 rounded">
            <h3 className="font-bold mb-2">Questions?</h3>
            <p className="text-slate-700">
              If you have any questions about these Terms of Service, please contact us at <a href="mailto:support@datawinder.app" className="text-bangor-red hover:underline">support@datawinder.app</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}