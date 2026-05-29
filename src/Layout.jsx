import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Database, FolderOpen, MapPin, CloudRain, Layers, Menu, X, Leaf, PackageOpen, FileOutput, BarChart2, ClipboardCheck, LineChart, Map, Users, MessageCircle, Folder, AlertCircle, AlertTriangle, Zap, Sparkles, History, CheckCircle, Download, TrendingUp, Target, Globe, Upload } from 'lucide-react';
import DataSourceBadges from '@/components/DataSourceBadges';
import BottomBotContainer from '@/components/BottomBotContainer';
import { base44 } from '@/api/base44Client';

const NAV_CATEGORIES = [
  // Primary Navigation
  {
    section: 'Primary',
    items: [
      { label: 'Dashboard', page: 'ResearcherDashboard', icon: BarChart2 },
      { label: 'Projects', page: 'ProjectDashboard', icon: Folder },
      { label: 'Species Search', page: 'SpeciesExplorerHub', icon: Search },
    ]
  },
  // Data Management
  {
    section: 'Data Management',
    items: [
      { label: 'My Data', page: 'SavedData', icon: FolderOpen },
      { label: 'Import Data', page: 'SmartImport', icon: PackageOpen },
      { label: 'Bulk Species Upload', page: 'BulkSpeciesUpload', icon: Upload },
      { label: 'Photo Processor', page: 'FieldPhotoProcessor', icon: Sparkles },
      { label: 'Data Validation', page: 'DataValidation', icon: CheckCircle },
      { label: 'Outlier Detection', page: 'GeographicOutlierCorrection', icon: AlertTriangle },
      { label: 'Version History', page: 'VersionHistory', icon: History },
    ]
  },
  // Modeling & Analysis
  {
    section: 'Modeling & Analysis',
    items: [
      { label: 'SDM Pipeline', page: 'SDMPipeline', icon: Zap },
      { label: 'Model Performance', page: 'ModelPerformance', icon: LineChart },
      { label: 'MAXENT Modeller', page: 'MAXENTModeler', icon: Layers },
      { label: 'Threat Assessment', page: 'ThreatAssessment', icon: AlertCircle },
      { label: 'Data Comparison', page: 'BiodiversityDataComparison', icon: Globe },
    ]
  },
  // Exploration & Reporting
  {
    section: 'Exploration & Reporting',
    items: [
      { label: 'Species Explorer', page: 'SpeciesExplorerHub', icon: Leaf },
      { label: 'Global Map', page: 'GlobalSpeciesExplorer', icon: MapPin },
      { label: 'Biodiversity Live', page: 'BiodiversityDashboard', icon: TrendingUp },
      { label: 'AI Identification', page: 'SpeciesIdentificationLab', icon: Sparkles },
      { label: 'Reports', page: 'SpeciesReportGenerator', icon: FileOutput },
      { label: 'Analytics', page: 'AnalyticsDashboard', icon: TrendingUp },
    ]
  },
  // Advanced Tools
  {
    section: 'Advanced Tools',
    items: [
      { label: 'Notifications', page: 'NotificationDashboard', icon: AlertCircle },
      { label: 'Conservation Tracker', page: 'ConservationProjectTracker', icon: Target },
      { label: 'Data Export', page: 'ExportDashboard', icon: Download },
      { label: 'ArcGIS Tools', page: 'ArcGISTools', icon: MapPin },
      { label: 'Climate Data', page: 'ClimateProjections', icon: CloudRain },
    ]
  },
  // Community
  {
    section: 'Community',
    items: [
      { label: 'FAQ Assistant', page: 'FAQBot', icon: MessageCircle },
      { label: 'Community Hub', page: 'Community', icon: Users },
      { label: 'About & Help', page: 'About', icon: MessageCircle },
    ]
  },
];

function NavSection({ section, currentPageName }) {
  return (
    <div className="space-y-2">
      <h3 className="px-3 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
        {section.section}
      </h3>
      <div className="space-y-1">
        {section.items.map(({ label, page, icon: Icon }) => {
          const isActive = currentPageName === page;
          return (
            <Link
              key={page}
              to={`/${page}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-bangor-red text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ── Sidebar Navigation (Desktop & Mobile) ── */}
      <aside className={`fixed lg:relative h-screen bg-white border-r border-slate-200 shadow-sm z-40 transition-transform duration-300 ${
        sidebarOpen ? 'w-64' : '-translate-x-full lg:translate-x-0 lg:w-16'
      }`}>

        {/* Sidebar Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <Link to="/ResearcherDashboard" className="flex items-center gap-3 flex-1 min-w-0 group">
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
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {NAV_CATEGORIES.map((section, idx) => (
              <NavSection
                key={idx}
                section={section}
                currentPageName={currentPageName}
              />
            ))}
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

      {/* ── Bottom Bot Container (3-column grid) ── */}
      <BottomBotContainer currentPageName={currentPageName} />

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