import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SpeciesSearchFilter from '@/components/explorer/SpeciesSearchFilter';
import AnalyticsDashboard from '@/components/dashboard/AnalyticsDashboard';
import SubscriptionPaywall from '@/components/billing/SubscriptionPaywall';
import AIFieldReportGenerator from '@/components/reports/AIFieldReportGenerator';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, MapPin, Target, TrendingUp, AlertCircle, Zap } from 'lucide-react';

export default function SpeciesExplorerHub() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [filteredOccurrences, setFilteredOccurrences] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    }
  });

  const { data: occurrences = [] } = useQuery({
    queryKey: ['occurrences'],
    queryFn: () => base44.entities.Occurrence?.list?.() || []
  });

  const { data: surveys = [] } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => base44.entities.Survey?.list?.() || []
  });

  const { data: species = [] } = useQuery({
    queryKey: ['species'],
    queryFn: () => base44.entities.Species?.list?.() || []
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.ConservationProject?.list?.() || []
  });

  const userPlan = user?.subscription_plan || 'free';
  const isProfessional = ['professional', 'enterprise'].includes(userPlan);

  return (
    <div className="space-y-8">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Header with Notifications */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Species Explorer</h1>
          <p className="text-slate-600 mt-2">Real-time biodiversity monitoring, AI species identification, conservation impact tracking</p>
        </div>
        <NotificationCenter />
      </div>

      {/* Premium Badge */}
      {userPlan === 'free' && (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900">Upgrade for Full Access</p>
                  <p className="text-sm text-amber-800">Unlock AI identification, PDF reports, and team collaboration</p>
                </div>
              </div>
              <Link to="/Pricing">
                <Button className="bg-bangor-red hover:bg-bangor-red/90">Upgrade Plan</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'overview', label: '📊 Dashboard', icon: TrendingUp },
          { id: 'search', label: '🔍 Search & Filter', icon: MapPin },
          { id: 'identify', label: '🤖 AI Identification', icon: Sparkles },
          { id: 'projects', label: '🎯 Projects', icon: Target }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              activeTab === tab.id
                ? 'border-b-bangor-red text-bangor-red'
                : 'border-b-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <AnalyticsDashboard 
              species={species} 
              surveys={surveys} 
              observations={occurrences} 
            />

            {/* Featured Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/BiodiversityDashboard">
                <Card className="cursor-pointer hover:shadow-lg transition h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="w-5 h-5 text-bangor-red" />
                      Live Map
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-3">
                      Real-time species distribution mapping with threat assessment
                    </p>
                    <Badge>View Dashboard →</Badge>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/SpeciesIdentificationLab">
                <Card className="cursor-pointer hover:shadow-lg transition h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                      AI Identifier
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-3">
                      Upload field photos for instant species identification
                    </p>
                    {!isProfessional ? (
                      <Badge className="bg-amber-100 text-amber-700">Pro Feature</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700">Ready</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>

              <Link to="/ConservationProjectTracker">
                <Card className="cursor-pointer hover:shadow-lg transition h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="w-5 h-5 text-purple-500" />
                      Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-3">
                      Track conservation impact and generate research publications
                    </p>
                    <Badge>{projects.length} active</Badge>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        )}

        {/* Search & Filter Tab */}
        {activeTab === 'search' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <SpeciesSearchFilter 
                data={occurrences}
                onFilter={setFilteredOccurrences}
              />
            </div>
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Results ({filteredOccurrences.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredOccurrences.length === 0 ? (
                    <p className="text-slate-600 text-center py-8">No results found</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredOccurrences.map(occ => (
                        <div
                          key={occ.id}
                          className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                        >
                          <p className="font-semibold text-slate-900">{occ.species_name}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            📍 {occ.latitude.toFixed(3)}, {occ.longitude.toFixed(3)}
                          </p>
                          {occ.ai_identified && (
                            <Badge className="mt-2 text-xs">
                              AI: {Math.round(occ.ai_confidence * 100)}%
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* AI Identification Tab */}
        {activeTab === 'identify' && (
          <div>
            {!isProfessional ? (
              <SubscriptionPaywall 
                feature="AI Species Identification" 
                requiredPlan="professional"
              />
            ) : (
              <Link to="/SpeciesIdentificationLab">
                <Button className="gap-2 bg-bangor-red hover:bg-bangor-red/90 w-full md:w-auto">
                  <Sparkles className="w-4 h-4" />
                  Open Identification Lab
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <Link to="/ConservationProjectTracker">
            <Button className="gap-2 bg-bangor-red hover:bg-bangor-red/90 w-full md:w-auto">
              <Target className="w-4 h-4" />
              Manage Projects
            </Button>
          </Link>
        )}
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 border-t border-slate-200">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-lg">Need Help Getting Started?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Complete our 3-step onboarding wizard to set up your first survey
            </p>
            <Button
              onClick={() => setShowOnboarding(true)}
              variant="outline"
              className="w-full"
            >
              Start Onboarding
            </Button>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-lg">Import Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Import species records from CSV, GeoJSON, or GBIF/IUCN exports
            </p>
            <Button
              onClick={() => window.location.href = '/SmartImport'}
              variant="outline"
              className="w-full"
            >
              Import Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}