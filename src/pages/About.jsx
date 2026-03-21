import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Leaf, Database, Layers, TrendingUp, Shield, BookOpen, 
  Search, FileOutput, Map, LineChart, BarChart2, AlertCircle,
  ArrowRight, CheckCircle2, Users, Zap
} from 'lucide-react';

const WorkflowStep = ({ number, title, icon: Icon, description, pages, color }) => (
  <div className="relative">
    {/* Connection line (hidden on last item) */}
    <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-gradient-to-b from-bangor-red/30 to-transparent md:h-24"></div>
    
    <div className={`bg-white p-4 rounded-xl border-2 border-${color}-200 relative z-10`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-8 h-8 rounded-full bg-${color}-100 flex items-center justify-center shrink-0`}>
          <span className="text-sm font-bold text-bangor-red">{number}</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
        <Icon className="w-5 h-5 text-bangor-red shrink-0" />
      </div>
      
      {pages && pages.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-600 mb-2">Tools & Pages:</p>
          <div className="flex flex-wrap gap-1">
            {pages.map(page => (
              <Link key={page.path} to={`/${page.path}`}>
                <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-slate-200">
                  {page.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

export default function About() {
  const workflow = [
    {
      number: 1,
      title: 'Species Search & Selection',
      icon: Search,
      description: 'Discover species using IUCN, iNaturalist, and GBIF databases',
      pages: [
        { name: 'Home', path: 'Home' },
        { name: 'My Data', path: 'SavedData' }
      ],
      color: 'blue'
    },
    {
      number: 2,
      title: 'Data Tidying & QC',
      icon: FileOutput,
      description: 'Clean, validate, and prepare occurrence data for modeling',
      pages: [
        { name: 'Data Prep', path: 'DataPreparation' },
        { name: 'Cleanse', path: 'DatabaseCleanse' },
        { name: 'Quality Audit', path: 'DataQualityAudit' }
      ],
      color: 'amber'
    },
    {
      number: 3,
      title: 'Climate Data Integration',
      icon: Layers,
      description: 'Select climate datasets (WorldClim, CHELSA, ERA5) and variables',
      pages: [
        { name: 'Climate Data', path: 'ClimateProjections' },
        { name: 'Variable Filter', path: 'VariableSelector' }
      ],
      color: 'cyan'
    },
    {
      number: 4,
      title: 'MAXENT Modeling',
      icon: BarChart2,
      description: 'Run species distribution models with performance validation',
      pages: [
        { name: 'MAXENT', path: 'MAXENTModeler' },
        { name: 'Results', path: 'MaxentResultsMap' },
        { name: 'Interpretation', path: 'MaxentInterpretation' }
      ],
      color: 'emerald'
    },
    {
      number: 5,
      title: 'Threat Assessment',
      icon: AlertCircle,
      description: 'Evaluate conservation risks and priority rankings',
      pages: [
        { name: 'Threats', path: 'ThreatAssessment' }
      ],
      color: 'red'
    },
    {
      number: 6,
      title: 'Scenario & Ensemble Analysis',
      icon: LineChart,
      description: 'Compare climate scenarios and project future habitat shifts',
      pages: [
        { name: 'Scenarios', path: 'ClimateScenarioComparison' }
      ],
      color: 'purple'
    }
  ];

  const keyFeatures = [
    {
      icon: Database,
      title: 'Multi-source Data',
      description: 'Integrated access to IUCN Red List, iNaturalist, GBIF, and speciesLink occurrence data'
    },
    {
      icon: Layers,
      title: 'Climate Flexibility',
      description: 'Support for WorldClim, CHELSA, ERA5, MODIS, and CMIP6 climate datasets'
    },
    {
      icon: Zap,
      title: 'MAXENT Automation',
      description: 'Streamlined species distribution modeling with batch processing'
    },
    {
      icon: Map,
      title: 'Spatial Analysis',
      description: 'ArcGIS integration for buffer analysis, range overlays, and spatial joins'
    },
    {
      icon: TrendingUp,
      title: 'Ensemble Scenarios',
      description: 'Climate change projections and habitat suitability forecasting'
    },
    {
      icon: Shield,
      title: 'Conservation Tools',
      description: 'Threat assessment, priority ranking, and conservation recommendations'
    }
  ];

  const researchPhases = [
    {
      title: 'Phase 1: Climate Driver Identification',
      status: 'Complete',
      icon: Layers,
      color: 'bg-green-100 text-green-700'
    },
    {
      title: 'Phase 2: Conservation Threat Profiling',
      status: 'Complete',
      icon: Shield,
      color: 'bg-green-100 text-green-700'
    },
    {
      title: 'Phase 3: Ensemble Scenario Analysis',
      status: 'Complete',
      icon: LineChart,
      color: 'bg-green-100 text-green-700'
    },
    {
      title: 'Phase 3B: Phylogenetic Comparative Analysis',
      status: 'Planned',
      icon: Leaf,
      color: 'bg-slate-100 text-slate-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b-4 border-bangor-red">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-bangor-red rounded-lg flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">About DataWinder</h1>
              <p className="text-lg text-slate-600 mt-2">Species Distribution Modelling Platform for Conservation Research</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">

        {/* Introduction */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>What is DataWinder?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700 leading-relaxed">
                DataWinder is a comprehensive web-based platform for species distribution modelling and conservation assessment. It integrates primary biodiversity databases (IUCN, iNaturalist, GBIF) with state-of-the-art climate data and MAXENT species distribution models to support evidence-based conservation planning.
              </p>
              <p className="text-slate-700 leading-relaxed">
                Built on peer-reviewed research frameworks (Duran et al. 2013, Chapman et al. 2020, Hill & Winder 2019), DataWinder enables researchers to assess climate-driven habitat shifts, profile conservation threats, and prioritize species for intervention.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Research Pipeline */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Research Pipeline</h2>
            <p className="text-slate-600">Six-phase workflow from species discovery to conservation action</p>
          </div>
          <div className="space-y-8">
            {workflow.map((step, idx) => (
              <WorkflowStep key={idx} {...step} />
            ))}
          </div>
        </section>

        {/* Key Features */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Key Features</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {keyFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <Icon className="w-8 h-8 text-bangor-red mb-3" />
                    <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Getting Started */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Getting Started</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-bangor-red text-white flex items-center justify-center text-sm font-bold">1</span>
                  Explore Species
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-700">Start by searching for species of interest using the integrated IUCN, iNaturalist, and GBIF databases.</p>
                <Link to="/Home">
                  <Button variant="outline" className="w-full gap-2">
                    Open Species Search <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-bangor-red text-white flex items-center justify-center text-sm font-bold">2</span>
                  Prepare Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-700">Clean and validate occurrence records, detect outliers, and prepare datasets for modeling.</p>
                <Link to="/DataPreparation">
                  <Button variant="outline" className="w-full gap-2">
                    Start Data Prep <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-bangor-red text-white flex items-center justify-center text-sm font-bold">3</span>
                  Configure Models
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-700">Select climate variables, configure MAXENT parameters, and run species distribution models.</p>
                <Link to="/MAXENTModeler">
                  <Button variant="outline" className="w-full gap-2">
                    Open MAXENT <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-bangor-red text-white flex items-center justify-center text-sm font-bold">4</span>
                  Assess Threats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-700">Calculate threat scores, project climate impacts, and generate conservation recommendations.</p>
                <Link to="/ThreatAssessment">
                  <Button variant="outline" className="w-full gap-2">
                    Threat Assessment <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Research Phases */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Research Phases</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {researchPhases.map((phase, idx) => {
              const Icon = phase.icon;
              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3">
                  <Icon className={`w-5 h-5 shrink-0 mt-1 ${phase.color.split(' ')[1]}`} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{phase.title}</h3>
                    <Badge className={`mt-2 ${phase.color}`}>{phase.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                q: 'What data sources does DataWinder use?',
                a: 'DataWinder integrates IUCN Red List, iNaturalist observations, GBIF occurrence records, and speciesLink specimens. Climate data includes WorldClim, CHELSA, ERA5, MODIS, and CMIP6 projections.'
              },
              {
                q: 'How do I start a new project?',
                a: 'Navigate to Projects, create a new project, and select or create species lists. Associate climate datasets and start modeling.'
              },
              {
                q: 'What is MAXENT and why use it?',
                a: 'MAXENT is a machine learning algorithm for species distribution modeling that uses occurrence data and environmental variables to predict suitable habitat. It\'s widely used in conservation because it requires only presence data and handles high-dimensional environmental data effectively.'
              },
              {
                q: 'How are threat scores calculated?',
                a: 'Threat scores integrate habitat loss, population trends, protected area coverage, climate suitability change, and disease risk. The composite score ranges 0-100, with higher values indicating greater conservation concern.'
              },
              {
                q: 'Can I share my analyses?',
                a: 'Yes, you can create shareable species lists and export data in multiple formats (CSV, GeoJSON, ZIP). Community features allow collaboration with other researchers.'
              }
            ].map((item, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-base">{item.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* References */}
        <section>
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-bangor-red" />
                Scientific Foundation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>• Duran et al. (2013) - Climate-driven species distribution modelling methodology</p>
              <p>• Chapman et al. (2020) - Ensemble approaches for biodiversity assessment</p>
              <p>• Hill & Winder (2019) - Conservation threat profiling and prioritization</p>
            </CardContent>
          </Card>
        </section>

        {/* Contact */}
        <section>
          <Card className="bg-bangor-red text-white">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-2">Questions or Feedback?</h3>
              <p className="mb-4">Join our community forum or contact support for assistance.</p>
              <Link to="/Community">
                <Button variant="secondary" className="gap-2">
                  <Users className="w-4 h-4" />
                  Visit Community
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}