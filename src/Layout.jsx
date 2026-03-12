import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, Database, FolderOpen, Map, CloudRain, Layers, Menu, X, Leaf } from 'lucide-react';
import DataSourceBadges from '@/components/DataSourceBadges';

const NAV_ITEMS = [
  { label: 'Species Search', page: 'Home', icon: Search },
  { label: 'My Data', page: 'SavedData', icon: FolderOpen },
  { label: 'Data Management', page: 'DataManagement', icon: Database },
  { label: 'ArcGIS Tools', page: 'ArcGISTools', icon: Map },
  { label: 'Climate Data', page: 'ClimateProjections', icon: CloudRain },
  { label: 'MAXENT Modeller', page: 'MAXENTModeler', icon: Layers },
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
              to={createPageUrl('Home')}
              className="flex items-center gap-2.5 shrink-0 group"
            >
              <div className="w-8 h-8 bg-bangor-red rounded-lg flex items-center justify-center group-hover:opacity-90 transition-opacity">
                <Leaf className="w-4 h-4 text-bangor-sun" />
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-sm font-bold text-bangor-red tracking-tight">DataWinder</div>
                <div className="text-xs text-slate-400 font-normal">Bangor University</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-0.5">
              {NAV_ITEMS.map(({ label, page, icon: Icon }) => {
                const isActive = currentPageName === page;
                return (
                  <Link
                    key={page}
                    to={createPageUrl(page)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-bangor-red text-white shadow-sm'
                        : 'text-slate-600 hover:bg-bangor-red/10 hover:text-bangor-red'
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
                    to={createPageUrl(page)}
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

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-slate-200 py-5 mt-auto">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-bangor-red rounded flex items-center justify-center">
                  <Leaf className="w-3 h-3 text-bangor-sun" />
                </div>
                <span>© {new Date().getFullYear()} Bangor University — Species Distribution Modelling</span>
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