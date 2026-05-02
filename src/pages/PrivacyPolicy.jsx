import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-slate-600 mb-8">Last updated: May 2, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-slate-700 leading-relaxed">
              DataWinder ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold mb-3 mt-4">Personal Data</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              We may collect personally identifiable information such as:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 mb-4">
              <li>Name</li>
              <li>Email address</li>
              <li>Educational institution</li>
              <li>Research interests</li>
              <li>Account credentials</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">Automatic Data</h3>
            <p className="text-slate-700 leading-relaxed">
              We automatically collect certain information about your device and usage patterns, including IP address, browser type, pages visited, and access times.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Provide and maintain the Service</li>
              <li>Process your transactions</li>
              <li>Send administrative and marketing communications</li>
              <li>Improve and optimize our Service</li>
              <li>Monitor for fraudulent activity</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Data Sharing</h2>
            <p className="text-slate-700 leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share information with service providers who assist us in operating our website and conducting our business, subject to strict confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Data Security</h2>
            <p className="text-slate-700 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Your Rights</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Request a copy of your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Cookies</h2>
            <p className="text-slate-700 leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience. You can control cookie settings in your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Third-Party Links</h2>
            <p className="text-slate-700 leading-relaxed">
              Our website may contain links to third-party websites. We are not responsible for their privacy practices. We encourage you to review their privacy policies before providing personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Data Retention</h2>
            <p className="text-slate-700 leading-relaxed">
              We retain your personal information for as long as necessary to provide the Service and fulfill the purposes outlined in this policy, unless longer retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Changes to This Policy</h2>
            <p className="text-slate-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="bg-blue-50 border-l-4 border-bangor-red p-6 rounded">
            <h3 className="font-bold mb-2">Contact Us</h3>
            <p className="text-slate-700">
              If you have questions about this Privacy Policy or our privacy practices, please contact us at <a href="mailto:support@datawinder.app" className="text-bangor-red hover:underline">support@datawinder.app</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}