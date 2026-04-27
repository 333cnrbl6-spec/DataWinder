import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Database, FolderOpen, MapPin, CloudRain, Layers, Menu, X, Leaf, PackageOpen, FileOutput, BarChart2, ClipboardCheck, LineChart, Map, ListChecks, GitCompare, Users, MessageCircle, Folder, ChevronDown, ChevronRight, Shield, AlertCircle, AlertTriangle, Zap, Sparkles, History, CheckCircle, Download, TrendingUp, Target, ShieldCheck } from 'lucide-react';
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
      { label: 'Data Validation', page: 'DataValidation', icon: CheckCircle },
      { label: 'IUCN Validation', page: 'IUCNDataValidation', icon: CheckCircle },
      { label: 'Outlier Correction', page: 'GeographicOutlierCorrection', icon: AlertTriangle },
      { label: 'Version History', page: 'VersionHistory', icon: History },
      { label: 'ArcGIS Tools', page: 'ArcGISTools', icon: MapPin },
      { label: 'Climate Data', page: 'ClimateProjections', icon: CloudRain },
    ]
  },
  {
    label: 'Modeling',
    icon: Layers,
    items: [
      { label: 'SDM Pipeline', page: 'SDMPipeline', icon: Zap },
      { label: 'MAXENT Modeller', page: 'MAXENTModeler', icon: Layers },
      { label: 'Variable Filter', page: 'VariableSelector', icon: BarChart2 },
      { label: 'QC Checklist', page: 'ModelReadinessCheck', icon: ClipboardCheck },
      { label: 'Model Performance', page: 'ModelPerformance', icon: LineChart },
      { label: 'Results Map', page: 'MaxentResultsMap', icon: Map },
      { label: 'Interpretation', page: 'MaxentInterpretation', icon: BarChart2 },
      { label: 'Batch Submit', page: 'MaxentBatchSubmit', icon: ListChecks },
      { label: 'Scenario Compare', page: 'ClimateScenarioComparison', icon: GitCompare },
      { label: 'Annotations', page: 'SDMAnnotationViewer', icon: MessageCircle },
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
      { label: 'Report Generator', page: 'SpeciesReportGenerator', icon: FileOutput },
      { label: 'Data Export', page: 'ExportDashboard', icon: Download },
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
    label: 'Analytics',
    page: 'AnalyticsDashboard',
    icon: TrendingUp,
    standalone: true
  },
  {
    label: 'Testing & QA',
    icon: Zap,
    items: [
      { label: 'Benchmark Tests', page: 'BenchmarkTester', icon: Zap },
      { label: 'User Management', page: 'UserManagement', icon: Users },
      { label: 'Genus Comparison', page: 'GenusComparison', icon: GitCompare },
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
  {
    label: 'Species Explorer',
    icon: Leaf,
    items: [
      { label: 'Explorer Hub', page: 'SpeciesExplorerHub', icon: Zap },
      { label: 'Live Dashboard', page: 'BiodiversityDashboard', icon: TrendingUp },
      { label: 'AI Identification', page: 'SpeciesIdentificationLab', icon: Sparkles },
      { label: 'Project Tracker', page: 'ConservationProjectTracker', icon: Target },
      { label: 'Compliance', page: 'ComplianceDashboard', icon: ShieldCheck },
      { label: 'Survey Detail', page: 'SurveyDetail', icon: ClipboardCheck },
    ]
  },
];

function NavCategoryDropdown({ category, currentPageName, isMobile = false }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={isMobile ? "space-y-1" : ""}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between w-full gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
          open
            ? 'bg-bangor-red/10 text-bangor-red'
            : 'text-slate-700 hover:bg-slate-100'
        } ${isMobile ? 'text-sm' : 'text-xs'}`}
      >
        <div className="flex items-center gap-2">
          {React.createElement(category.icon, { className: isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5' })}
          {category.label}
        </div>
        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className={`space-y-1 ${isMobile ? '' : 'pl-6'}`}>
          {category.items.map(({ label, page, icon: Icon }) => {
            const isActive = currentPageName === page;
            return (
              <Link
                key={page}
                to={`/${page}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-bangor-red text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 text-sm'
                }`}
              >
                {React.createElement(Icon, { className: isMobile ? 'w-3.5 h-3.5' : 'w-3 h-3' })}
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ── Sidebar Navigation (Desktop & Mobile) ── */}
      <aside className={`fixed lg:relative h-screen bg-white border-r border-slate-200 shadow-sm z-40 transition-transform duration-300 ${
        sidebarOpen ? 'w-64' : '-translate-x-full lg:translate-x-0 lg:w-16'
      }`}>

        {/* Sidebar Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <Link to="/Home" className="flex items-center gap-3 flex-1 min-w-0 group">
            <div className="w-9 h-9 bg-bangor-red rounded-lg flex items-center justify-center shrink-0 group-hover:opacity-90 transition-opacity">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-bangor-red truncate">DataWinder</div>
                <div className="text-xs text-slate-400 truncate">Conservation</div>
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-600 shrink-0"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        {sidebarOpen && (
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
            {NAV_CATEGORIES.map((category) => {
              if (category.standalone) {
                const isActive = currentPageName === category.page;
                return (
                  <Link
                    key={category.label}
                    to={`/${category.page}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${
                      isActive
                        ? 'bg-bangor-red text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {React.createElement(category.icon, { className: 'w-4 h-4 shrink-0' })}
                    {category.label}
                  </Link>
                );
              }

              return (
                <NavCategoryDropdown
                  key={category.label}
                  category={category}
                  currentPageName={currentPageName}
                  isMobile={false}
                />
              );
            })}
          </nav>
        )}
      </aside>

      {/* ── Overlay when sidebar open on mobile ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 lg:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden h-14 bg-white border-b-4 border-bangor-red flex items-center px-4 sticky top-0 z-20 shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <div className="w-7 h-7 bg-bangor-red rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm font-bold text-bangor-red">DataWinder</div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>

      {/* ── In-page Assistant Panel ── */}
      {currentPageName !== 'FAQBot' && (
        <AssistantPanel currentPageName={currentPageName} />
      )}

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-slate-200 py-3 text-xs text-slate-400 mt-auto">
        <div className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-bangor-red shrink-0" />
              <span>© {new Date().getFullYear()} DataWinder</span>
            </div>
            <span className="italic">Always cite sources.</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
            <span className="shrink-0">Powered by:</span>
            <DataSourceBadges size="xs" />
          </div>
        </div>
      </footer>
      </div>

      </div>
      );
}