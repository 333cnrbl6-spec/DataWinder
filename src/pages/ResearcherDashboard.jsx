import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ProjectsOverview from '@/components/dashboard/ProjectsOverview';
import RecentObservations from '@/components/dashboard/RecentObservations';
import ComplianceTasks from '@/components/dashboard/ComplianceTasks';
import ResearchHealthMetrics from '@/components/dashboard/ResearchHealthMetrics';
import AlertsPanel from '@/components/dashboard/AlertsPanel';

export default function ResearcherDashboard() {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: occurrences = [] } = useQuery({
    queryKey: ['occurrences'],
    queryFn: () => base44.entities.Occurrence.list('-observation_date', 100),
  });

  const { data: validationFlags = [] } = useQuery({
    queryKey: ['validationFlags'],
    queryFn: () => base44.entities.ValidationFlag.list('-created_date', 50),
  });

  const { data: surveys = [] } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => base44.entities.Survey.list('-start_date', 100),
  });

  const { data: dataQualityChecks = [] } = useQuery({
    queryKey: ['dataQualityChecks'],
    queryFn: () => base44.entities.DataQualityCheck.list('-run_date', 20),
  });

  // Compute metrics
  const metrics = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const recentObs = occurrences.filter(o => {
      const days = (Date.now() - new Date(o.observation_date)) / (1000 * 60 * 60 * 24);
      return days <= 7;
    }).length;
    
    const pendingFlags = validationFlags.filter(f => f.status === 'flagged').length;
    const criticalFlags = validationFlags.filter(f => f.severity === 'error').length;
    
    const completedSurveys = surveys.filter(s => s.status === 'completed').length;
    const activeSurveys = surveys.filter(s => s.status === 'active').length;

    return {
      activeProjects,
      recentObs,
      pendingFlags,
      criticalFlags,
      completedSurveys,
      activeSurveys,
      totalOccurrences: occurrences.length,
    };
  }, [projects, occurrences, validationFlags, surveys]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Research Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Monitor your projects, observations, and compliance status</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={Zap}
            label="Active Projects"
            value={metrics.activeProjects}
            color="bg-blue-50 text-blue-600"
            bgColor="bg-blue-100"
          />
          <KPICard
            icon={TrendingUp}
            label="Recent Observations"
            value={metrics.recentObs}
            subtext="This week"
            color="bg-green-50 text-green-600"
            bgColor="bg-green-100"
          />
          <KPICard
            icon={Clock}
            label="Pending Review"
            value={metrics.pendingFlags}
            color="bg-amber-50 text-amber-600"
            bgColor="bg-amber-100"
          />
          <KPICard
            icon={AlertTriangle}
            label="Critical Issues"
            value={metrics.criticalFlags}
            color="bg-red-50 text-red-600"
            bgColor="bg-red-100"
          />
        </div>

        {/* Alerts & Compliance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AlertsPanel 
              validationFlags={validationFlags}
              dataQualityChecks={dataQualityChecks}
            />
          </div>
          <div>
            <ComplianceTasks
              validationFlags={validationFlags}
              pendingCount={metrics.pendingFlags}
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProjectsOverview projects={projects} />
          <RecentObservations occurrences={occurrences} />
        </div>

        {/* Research Health */}
        <ResearchHealthMetrics
          surveys={surveys}
          occurrences={occurrences}
          validationFlags={validationFlags}
          metrics={metrics}
        />

      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, subtext, color, bgColor }) {
  return (
    <Card className={`${color}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
          </div>
          <div className={`${bgColor} p-2 rounded-lg`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}