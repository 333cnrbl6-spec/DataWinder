import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Database, FolderOpen, MapPin, CloudRain, Layers, Menu, X, Leaf, PackageOpen, BarChart2, ClipboardCheck, LineChart, Map, ListChecks, GitCompare, Users, MessageCircle, BookOpen, Folder } from 'lucide-react';
import DataSourceBadges from '@/components/DataSourceBadges';
import AssistantPanel from '@/components/AssistantPanel';

const NAV_ITEMS = [
  { label: 'Species Search', page: 'Home', icon: Search },
  { label: 'My Data', page: 'SavedData', icon: FolderOpen },
  { label: 'Data Management', page: 'DataManagement', icon: Database },
  { label: 'ArcGIS Tools', page: 'ArcGISTools', icon: MapPin },
  { label: 'Climate Data', page: 'ClimateProjections', icon: CloudRain },
  { label: 'MAXENT Modeller', page: 'MAXENTModeler', icon: Layers },
  { label: 'Data Prep', page: 'DataPreparation', icon: PackageOpen },
  { label: 'Variable Filter', page: 'VariableSelector', icon: BarChart2 },
  { label: 'QC Checklist', page: 'ModelReadinessCheck', icon: ClipboardCheck },
  { label: 'Model Performance', page: 'ModelPerformance', icon: LineChart },
  { label: 'Results Map', page: 'MaxentResultsMap', icon: Map },
  { label: 'Batch Submit', page: 'MaxentBatchSubmit', icon: ListChecks },
  { label: 'Scenario Compare', page: 'ClimateScenarioComparison', icon: GitCompare },
  { label: 'Projects', page: 'ProjectDashboard', icon: Folder },
  { label: 'Community', page: 'Community', icon: Users },
  { label: 'FAQ Assistant', page: 'FAQBot', icon: MessageCircle },
  // { label: 'Literature', page: 'LiteratureLibrary', icon: BookOpen }, // Coming soon - Mendeley integration in progress
];

export default function Layout({ children, currentPageName }) {
  const [menuOpen, setMenuOpen] = useState(false);



  return (
    <div className="min-h-screen flex flex-col bg-slate-50">

      {/* ── Global Navigation ── */}
      <nav className="bg-white border-b-4 border-bangor-red sticky top-0 z-50 shadow-md backdrop-blur-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Brand Mark */}
            <Link
              to="/Home"
              className="flex items-center gap-2.5 shrink-0 group"
            >
              <div className="w-8 h-8 bg-bangor-red rounded-lg flex items-center justify-center group-hover:opacity-90 transition-opacity">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-sm font-bold text-bangor-red tracking-tight">DataWinder</div>
                <div className="text-xs text-slate-400 font-normal">Species Distribution Tools</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-0.5">
              {NAV_ITEMS.map(({ label, page, icon: Icon }) => {
                const isActive = currentPageName === page;
                return (
                  <Link
                    key={page}
                    to={`/${page}`}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-bangor-red text-white shadow-sm scale-[1.02]'
                        : 'text-slate-600 hover:bg-bangor-red/10 hover:text-bangor-red hover:scale-[1.02]'
                    }`}
                  >
                    {React.createElement(Icon, { className: 'w-3.5 h-3.5 shrink-0' })}
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white px-4 pb-4 pt-2">
            <div className="grid grid-cols-2 gap-1.5">
              {NAV_ITEMS.map(({ label, page, icon: Icon }) => {
                const isActive = currentPageName === page;
                return (
                  <Link
                    key={page}
                    to={`/${page}`}
                    onClick={() => setMenuOpen(false)}
className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-bangor-red text-white'
                        : 'text-slate-600 hover:bg-bangor-red/10 hover:text-bangor-red'
                    }`}
                  >
                    {React.createElement(Icon, { className: 'w-4 h-4 shrink-0' })}
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* ── Page Content ── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── In-page Assistant Panel ── */}
      {currentPageName !== 'FAQBot' && (
        <AssistantPanel currentPageName={currentPageName} />
      )}

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-slate-200 py-5 mt-auto">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-bangor-red rounded flex items-center justify-center">
                  <Leaf className="w-3 h-3 text-white" />
                </div>
                <span>© {new Date().getFullYear()} DataWinder — Species Distribution Modelling Platform</span>
              </div>
              <span className="italic">Data for research purposes only. Always cite original sources.</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <span className="text-xs text-slate-400 shrink-0">Powered by:</span>
              <DataSourceBadges size="xs" />
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}