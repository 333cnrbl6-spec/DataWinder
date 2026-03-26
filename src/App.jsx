import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import ErrorBoundary from '@/components/ErrorBoundary'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import DataPreparation from './pages/DataPreparation';
import DatabaseCleanse from './pages/DatabaseCleanse';
import OutlierScanAll from './pages/OutlierScanAll';
import VariableSelector from './pages/VariableSelector';
import ModelReadinessCheck from './pages/ModelReadinessCheck';
import ModelPerformance from './pages/ModelPerformance';
import MaxentResultsMap from './pages/MaxentResultsMap';
import MaxentBatchSubmit from './pages/MaxentBatchSubmit';
import MaxentInterpretation from './pages/MaxentInterpretation';
import ThreatAssessment from './pages/ThreatAssessment';
import ClimateScenarioComparison from './pages/ClimateScenarioComparison';
import Community from './pages/Community';
import FAQBot from './pages/FAQBot';
import LiteratureLibrary from './pages/LiteratureLibrary';
import MendeleyConnect from './pages/MendeleyConnect';
import ProjectDashboard from './pages/ProjectDashboard';
import SmartImport from './pages/SmartImport';
import ImportHistory from './pages/ImportHistory';
import DataQualityAudit from './pages/DataQualityAudit';
import About from './pages/About';
import BenchmarkTester from './pages/BenchmarkTester';
import BangorFounderSignup from './pages/BangorFounderSignup';
import BangorMicrosoftLogin from './pages/BangorMicrosoftLogin';
import SpeciesFieldReview from './pages/SpeciesFieldReview';
import CallithrixBenchmark from './pages/CallithrixBenchmark';
import UserManagement from './pages/UserManagement';
import ForKids from './pages/ForKids';
import AcademicPaperLab from './pages/AcademicPaperLab';
import DataWinderReport from './pages/DataWinderReport';
import GenusComparison from './pages/GenusComparison';
import SecureView from './pages/SecureView';
import IUCNDataValidation from './pages/IUCNDataValidation.jsx';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { SpeciesProvider } from '@/lib/SpeciesContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app with error boundary
  return (
    <ErrorBoundary>
      <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/DataPreparation" element={<LayoutWrapper currentPageName="DataPreparation"><DataPreparation /></LayoutWrapper>} />
      <Route path="/DatabaseCleanse" element={<LayoutWrapper currentPageName="DatabaseCleanse"><DatabaseCleanse /></LayoutWrapper>} />
      <Route path="/OutlierScanAll" element={<LayoutWrapper currentPageName="OutlierScanAll"><OutlierScanAll /></LayoutWrapper>} />
      <Route path="/VariableSelector" element={<LayoutWrapper currentPageName="VariableSelector"><VariableSelector /></LayoutWrapper>} />
      <Route path="/ModelReadinessCheck" element={<LayoutWrapper currentPageName="ModelReadinessCheck"><ModelReadinessCheck /></LayoutWrapper>} />
      <Route path="/ModelPerformance" element={<LayoutWrapper currentPageName="ModelPerformance"><ModelPerformance /></LayoutWrapper>} />
      <Route path="/MaxentResultsMap" element={<LayoutWrapper currentPageName="MaxentResultsMap"><MaxentResultsMap /></LayoutWrapper>} />
      <Route path="/MaxentBatchSubmit" element={<LayoutWrapper currentPageName="MaxentBatchSubmit"><MaxentBatchSubmit /></LayoutWrapper>} />
      <Route path="/MaxentInterpretation" element={<LayoutWrapper currentPageName="MaxentInterpretation"><MaxentInterpretation /></LayoutWrapper>} />
      <Route path="/ThreatAssessment" element={<LayoutWrapper currentPageName="ThreatAssessment"><ThreatAssessment /></LayoutWrapper>} />
      <Route path="/ClimateScenarioComparison" element={<LayoutWrapper currentPageName="ClimateScenarioComparison"><ClimateScenarioComparison /></LayoutWrapper>} />
      <Route path="/Community" element={<LayoutWrapper currentPageName="Community"><Community /></LayoutWrapper>} />
      <Route path="/FAQBot" element={<LayoutWrapper currentPageName="FAQBot"><FAQBot /></LayoutWrapper>} />
      <Route path="/LiteratureLibrary" element={<LayoutWrapper currentPageName="LiteratureLibrary"><LiteratureLibrary /></LayoutWrapper>} />
      <Route path="/MendeleyConnect" element={<MendeleyConnect />} />
      <Route path="/ProjectDashboard" element={<LayoutWrapper currentPageName="ProjectDashboard"><ProjectDashboard /></LayoutWrapper>} />
      <Route path="/SmartImport" element={<LayoutWrapper currentPageName="SmartImport"><SmartImport /></LayoutWrapper>} />
      <Route path="/ImportHistory" element={<LayoutWrapper currentPageName="ImportHistory"><ImportHistory /></LayoutWrapper>} />
      <Route path="/DataQualityAudit" element={<LayoutWrapper currentPageName="DataQualityAudit"><DataQualityAudit /></LayoutWrapper>} />
      <Route path="/About" element={<LayoutWrapper currentPageName="About"><About /></LayoutWrapper>} />
      <Route path="/BenchmarkTester" element={<LayoutWrapper currentPageName="BenchmarkTester"><BenchmarkTester /></LayoutWrapper>} />
      <Route path="/BangorFounderSignup" element={<BangorFounderSignup />} />
      <Route path="/BangorMicrosoftLogin" element={<BangorMicrosoftLogin />} />
      <Route path="/SpeciesFieldReview" element={<LayoutWrapper currentPageName="SpeciesFieldReview"><SpeciesFieldReview /></LayoutWrapper>} />
      <Route path="/CallithrixBenchmark" element={<LayoutWrapper currentPageName="CallithrixBenchmark"><CallithrixBenchmark /></LayoutWrapper>} />
      <Route path="/UserManagement" element={<LayoutWrapper currentPageName="UserManagement"><UserManagement /></LayoutWrapper>} />
      <Route path="/ForKids" element={<ForKids />} />
      {/* PRIVATE: Developer-only academic paper generation lab — never linked from nav */}
      <Route path="/AcademicPaperLab" element={<LayoutWrapper currentPageName="AcademicPaperLab"><AcademicPaperLab /></LayoutWrapper>} />
      {/* One-time secure paper viewer — no nav, no layout */}
      <Route path="/SecureView" element={<SecureView />} />
      {/* DataWinder visual evidence report — admin only */}
      <Route path="/DataWinderReport" element={<LayoutWrapper currentPageName="DataWinderReport"><DataWinderReport /></LayoutWrapper>} />
      {/* Genus comparison dashboard — admin only */}
      <Route path="/GenusComparison" element={<LayoutWrapper currentPageName="GenusComparison"><GenusComparison /></LayoutWrapper>} />
      {/* IUCN data validation dashboard */}
      <Route path="/IUCNDataValidation" element={<LayoutWrapper currentPageName="IUCNDataValidation"><IUCNDataValidation /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </ErrorBoundary>
  );
};


function App() {

  return (
    <AuthProvider>
      <SpeciesProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
      </SpeciesProvider>
    </AuthProvider>
  )
}

export default App