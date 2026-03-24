import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Database, FolderOpen, MapPin, CloudRain, Layers, Menu, X, Leaf, PackageOpen, FileOutput, BarChart2, ClipboardCheck, LineChart, Map, ListChecks, GitCompare, Users, MessageCircle, Folder, ChevronDown, Shield, AlertCircle, Zap, Sparkles, History } from 'lucide-react';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from '@/components/ui/navigation-menu';
import DataSourceBadges from '@/components/DataSourceBadges';
import AssistantPanel from '@/components/AssistantPanel';

const NAV_CATEGORIES = [
  {
    label: 'Species Search',
    page: 'Home',
    icon: Search,
    standalone: true
  },
  {
    label: 'Species Management',
    icon: Database,
    items: [
      { label: 'My Data', page: 'SavedData', icon: FolderOpen },
      { label: 'Data Management', page: 'DataManagement', icon: Database },
    ]
  },
  {
    label: 'Data Tidying',
    icon: PackageOpen,
    items: [
      { label: 'Smart Import', page: 'SmartImport', icon: PackageOpen },
      { label: 'Import History', page: 'ImportHistory', icon: History },
      { label: 'Data Preparation', page: 'DataPreparation', icon: FileOutput },
      { label: 'Database Cleanse', page: 'DatabaseCleanse', icon: PackageOpen },
      { label: 'ArcGIS Tools', page: 'ArcGISTools', icon: MapPin },
      { label: 'Climate Data', page: 'ClimateProjections', icon: CloudRain },
    ]
  },
  {
    label: 'Modeling',
    icon: Layers,
    items: [
      { label: 'MAXENT Modeller', page: 'MAXENTModeler', icon: Layers },
      { label: 'Variable Filter', page: 'VariableSelector', icon: BarChart2 },
      { label: 'QC Checklist', page: 'ModelReadinessCheck', icon: ClipboardCheck },
      { label: 'Model Performance', page: 'ModelPerformance', icon: LineChart },
      { label: 'Results Map', page: 'MaxentResultsMap', icon: Map },
      { label: 'Interpretation', page: 'MaxentInterpretation', icon: BarChart2 },
      { label: 'Batch Submit', page: 'MaxentBatchSubmit', icon: ListChecks },
      { label: 'Scenario Compare', page: 'ClimateScenarioComparison', icon: GitCompare },
    ]
  },
  {
    label: 'Projects',
    page: 'ProjectDashboard',
    icon: Folder,
    standalone: true
  },
  {
    label: 'Conservation',
    icon: Shield,
    items: [
      { label: 'Threat Assessment', page: 'ThreatAssessment', icon: AlertCircle },
    ]
  },
  {
    label: 'Community',
    icon: Users,
    items: [
      { label: 'Community', page: 'Community', icon: Users },
      { label: 'FAQ Assistant', page: 'FAQBot', icon: MessageCircle },
      { label: 'About & Help', page: 'About', icon: MessageCircle },
    ]
  },
  {
    label: 'Testing & QA',
    icon: Zap,
    items: [
      { label: 'Benchmark Tests', page: 'BenchmarkTester', icon: Zap },
      { label: 'User Management', page: 'UserManagement', icon: Users },
    ]
  },
  {
    label: 'AI Review',
    page: 'SpeciesFieldReview',
    icon: Sparkles,
    standalone: true
  },
  {
    label: 'For Kids! 🐾',
    page: 'ForKids',
    icon: Leaf,
    standalone: true
  },
];

export default function Layout({ children, currentPageName }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">

      {/* ── Global Navigation ── */}
      <nav className="bg-white border-b-4 border-bangor-red sticky top-0 z-50 shadow-md backdrop-blur-sm">
        <div className="max-w-screen-2xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-14">

           {/* Brand Mark */}
           <Link
             to="/Home"
             className="flex items-center gap-2 xs:gap-2.5 shrink-0 group"
           >
             <div className="w-7 xs:w-8 h-7 xs:h-8 bg-bangor-red rounded-lg flex items-center justify-center group-hover:opacity-90 transition-opacity">
               <Leaf className="w-3.5 xs:w-4 h-3.5 xs:h-4 text-white" />
             </div>
             <div className="hidden xs:block sm:flex sm:flex-col leading-tight">
               <div className="text-xs xs:text-sm font-bold text-bangor-red tracking-tight">DataWinder</div>
               <div className="hidden xs:block text-xs text-slate-400 font-normal">Multi-Source Biodiversity</div>
             </div>
           </Link>

            {/* Desktop Navigation */}
            <NavigationMenu className="hidden lg:flex">
              <NavigationMenuList className="gap-0">
                {NAV_CATEGORIES.map((category) => {
                  if (category.standalone) {
                    const isActive = currentPageName === category.page;
                    return (
                      <NavigationMenuItem key={category.label}>
                        <Link
                          to={`/${category.page}`}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                            isActive
                              ? 'bg-bangor-red text-white shadow-sm'
                              : 'text-slate-600 hover:bg-bangor-red/10 hover:text-bangor-red'
                          }`}
                        >
                          {React.createElement(category.icon, { className: 'w-3.5 h-3.5 shrink-0' })}
                          {category.label}
                        </Link>
                      </NavigationMenuItem>
                    );
                  }
                  
                  return (
                    <NavigationMenuItem key={category.label}>
                      <NavigationMenuTrigger className="text-xs font-semibold text-slate-600 hover:text-bangor-red hover:bg-bangor-red/10 data-[state=open]:bg-bangor-red/10 data-[state=open]:text-bangor-red">
                        {React.createElement(category.icon, { className: 'w-3.5 h-3.5 shrink-0' })}
                        {category.label}
                        <ChevronDown className="w-3 h-3 ml-0.5" />
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-48 p-2 bg-white rounded-lg shadow-lg border border-slate-100">
                          {category.items.map(({ label, page, icon: Icon }) => {
                            const isActive = currentPageName === page;
                            return (
                              <Link
                                key={page}
                                to={`/${page}`}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                                  isActive
                                    ? 'bg-bangor-red/10 text-bangor-red'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {React.createElement(Icon, { className: 'w-3.5 h-3.5 shrink-0' })}
                                {label}
                              </Link>
                            );
                          })}
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="lg:hidden p-1.5 xs:p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? <X className="w-4 xs:w-5 h-4 xs:h-5" /> : <Menu className="w-4 xs:w-5 h-4 xs:h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white px-3 pb-3 pt-2 space-y-2 max-h-[70vh] overflow-y-auto">
            {NAV_CATEGORIES.map((category) => {
              if (category.standalone) {
                const isActive = currentPageName === category.page;
                return (
                  <Link
                    key={category.label}
                    to={`/${category.page}`}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-bangor-red text-white'
                        : 'text-slate-600 hover:bg-bangor-red/10 hover:text-bangor-red'
                    }`}
                  >
                    {React.createElement(category.icon, { className: 'w-4 h-4 shrink-0' })}
                    {category.label}
                  </Link>
                );
              }

              return (
                <div key={category.label}>
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    {React.createElement(category.icon, { className: 'w-3.5 h-3.5' })}
                    {category.label}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 ml-2">
                    {category.items.map(({ label, page, icon: Icon }) => {
                      const isActive = currentPageName === page;
                      return (
                        <Link
                          key={page}
                          to={`/${page}`}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-bangor-red text-white'
                              : 'text-slate-600 hover:bg-bangor-red/10 hover:text-bangor-red'
                          }`}
                        >
                          {React.createElement(Icon, { className: 'w-3.5 h-3.5 shrink-0' })}
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
      <footer className="bg-white border-t border-slate-200 py-3 xs:py-4 sm:py-5 mt-auto">
        <div className="max-w-screen-2xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 xs:gap-3">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1 xs:gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-4 xs:w-5 h-4 xs:h-5 bg-bangor-red rounded flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-2.5 xs:w-3 h-2.5 xs:h-3 text-white" />
                </div>
                <span className="text-xs">© {new Date().getFullYear()} DataWinder</span>
              </div>
              <span className="italic text-xs">Always cite sources.</span>
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