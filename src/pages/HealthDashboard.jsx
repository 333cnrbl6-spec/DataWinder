import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ThreatLevelChart from '@/components/dashboard/ThreatLevelChart';
import SDMPerformanceChart from '@/components/dashboard/SDMPerformanceChart';
import ConservationStatusFilter from '@/components/dashboard/ConservationStatusFilter';
import DistributionHeatmap from '@/components/maps/DistributionHeatmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp } from 'lucide-react';

export default function HealthDashboard() {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [threatData, setThreatData] = useState([]);
  const [sdmData, setSDMData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalSpecies: 0,
    criticalCount: 0,
    avgModelAuc: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, [selectedStatus]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch threat assessments
      const threats = await base44.entities.ThreatAssessment.list();
      
      // Fetch SDM runs
      const sdmRuns = await base44.entities.SDMRun.list();

      // Fetch species for filtering and maps
      const allSpecies = await base44.entities.Species.list();
      const species = allSpecies;

      // Filter by conservation status
      let filteredSpecies = species;
      if (selectedStatus !== 'all') {
        filteredSpecies = species.filter(s => s.iucn_status === selectedStatus);
      }

      const speciesIds = new Set(filteredSpecies.map(s => s.id));

      // Build threat level chart data
      const threatByStatus = {};
      IUCN_STATUSES.forEach(status => {
        threatByStatus[status.value] = { status: status.label, critical: 0, high: 0, moderate: 0, low: 0 };
      });

      threats.forEach(threat => {
        if (speciesIds.has(threat.species_id) || selectedStatus === 'all') {
          const status = threat.threat_category || 'Low';
          const statusKey = status.toLowerCase();
          Object.values(threatByStatus).forEach(row => {
            if (row.status) {
              if (!row[statusKey]) row[statusKey] = 0;
              row[statusKey]++;
            }
          });
        }
      });

      setThreatData(Object.values(threatByStatus));

      // Build SDM performance chart data by date
      const sdmByDate = {};
      const completedRuns = sdmRuns.filter(r => r.status === 'completed' && r.metrics);
      
      completedRuns.forEach(run => {
        const date = run.created_date ? new Date(run.created_date).toISOString().split('T')[0] : 'Unknown';
        if (!sdmByDate[date]) {
          sdmByDate[date] = { date, aucValues: [], tssValues: [], runCount: 0 };
        }
        if (run.metrics?.auc) sdmByDate[date].aucValues.push(run.metrics.auc);
        if (run.metrics?.tss) sdmByDate[date].tssValues.push(run.metrics.tss);
        sdmByDate[date].runCount++;
      });

      const sdmChartData = Object.values(sdmByDate).map(d => ({
        date: d.date,
        avgAuc: d.aucValues.length > 0 ? d.aucValues.reduce((a, b) => a + b) / d.aucValues.length : 0,
        avgTss: d.tssValues.length > 0 ? d.tssValues.reduce((a, b) => a + b) / d.tssValues.length : 0,
        successRate: (d.runCount / completedRuns.length) * 100
      })).sort((a, b) => new Date(a.date) - new Date(b.date));

      setSDMData(sdmChartData);

      // Calculate metrics
      const criticalThreats = threats.filter(t => t.threat_category === 'Critical' && (speciesIds.has(t.species_id) || selectedStatus === 'all')).length;
      const avgAuc = completedRuns.length > 0 
        ? completedRuns.reduce((sum, r) => sum + (r.metrics?.auc || 0), 0) / completedRuns.length 
        : 0;

      setMetrics({
        totalSpecies: filteredSpecies.length,
        criticalCount: criticalThreats,
        avgModelAuc: avgAuc.toFixed(3)
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const IUCN_STATUSES = ['all', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Species Health Dashboard</h1>
          <p className="text-slate-600 mt-1">Monitor species threats and SDM model performance</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Species</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{metrics.totalSpecies}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Critical Threats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{metrics.criticalCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Avg Model AUC
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{metrics.avgModelAuc}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <ConservationStatusFilter
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ThreatLevelChart data={threatData} />
          <SDMPerformanceChart data={sdmData} />
        </div>

        {/* Distribution Map */}
        <DistributionHeatmap species={filteredSpecies} />
      </div>
    </div>
  );
}