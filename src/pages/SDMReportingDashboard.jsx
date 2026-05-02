import React, { useState } from 'react';
import ProFeatureGate from '@/components/ProFeatureGate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Clock, CheckCircle2, AlertCircle, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import SDMReportGenerator from '@/components/reports/SDMReportGenerator';

function SDMReportingDashboardContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRun, setSelectedRun] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Fetch all SDM runs
  const { data: sdmRuns = [], isLoading } = useQuery({
    queryKey: ['all-sdm-runs'],
    queryFn: () => base44.entities.SDMRun.list('-updated_date', 100)
  });

  const filteredRuns = sdmRuns.filter(run =>
    run.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (run.species_names || []).some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const completedRuns = filteredRuns.filter(r => r.status === 'completed');
  const processingRuns = filteredRuns.filter(r => r.status !== 'completed' && r.status !== 'failed');
  const failedRuns = filteredRuns.filter(r => r.status === 'failed');

  const getStatusBadge = (status) => {
    const statusMap = {
      completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
      'in_progress': { bg: 'bg-blue-100', text: 'text-blue-700' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
      queued: { bg: 'bg-yellow-100', text: 'text-yellow-700' }
    };
    const statusConfig = statusMap[status] || statusMap.queued;
    return (
      <Badge className={`${statusConfig.bg} ${statusConfig.text}`}>
        {status}
      </Badge>
    );
  };

  const SDMCard = ({ run }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-900">{run.name}</h3>
            <p className="text-sm text-slate-600 mt-1">
              {run.species_names?.join(', ') || 'Unknown Species'}
            </p>
          </div>
          {getStatusBadge(run.status)}
        </div>

        {run.status === 'completed' && (
          <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50 rounded-lg text-center">
            <div>
              <p className="text-sm font-bold text-slate-700">{run.metrics?.auc?.toFixed(3)}</p>
              <p className="text-xs text-slate-500">AUC</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">{run.metrics?.tss?.toFixed(3)}</p>
              <p className="text-xs text-slate-500">TSS</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">{run.metrics?.n_train}</p>
              <p className="text-xs text-slate-500">Train</p>
            </div>
          </div>
        )}

        {run.status !== 'completed' && (
          <div className="py-2 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between px-3">
              <span className="text-xs font-medium text-slate-600">Progress</span>
              <span className="text-xs font-bold text-slate-900">{run.progress_pct || 0}%</span>
            </div>
            <div className="mt-2 mx-3 bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${run.progress_pct || 0}%` }}
              />
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500">
          {format(new Date(run.created_date || run.updated_date), 'PPp')}
        </div>

        <div className="flex gap-2 pt-2">
          {run.status === 'completed' && (
            <Dialog open={selectedRun === run.id && showReportModal} onOpenChange={setShowReportModal}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 gap-2 bg-bangor-red hover:bg-bangor-red/90"
                  onClick={() => setSelectedRun(run.id)}
                >
                  <FileText className="w-3 h-3" />
                  Generate Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Generate Report: {run.name}</DialogTitle>
                </DialogHeader>
                <SDMReportGenerator
                  sdmRunId={run.id}
                  onClose={() => {
                    setShowReportModal(false);
                    setSelectedRun(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-2"
          >
            <Eye className="w-3 h-3" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-bangor-red shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-bangor-red/10 rounded-xl">
              <FileText className="w-6 h-6 text-bangor-red" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-bangor-red">SDM Reporting Dashboard</h1>
              <p className="text-sm text-slate-500">Generate professional research reports for your models</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by model name or species..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Total Models</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{filteredRuns.length}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Ready for Report</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{completedRuns.length}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-300" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Processing</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{processingRuns.length}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-300" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Failed</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{failedRuns.length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="completed" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="completed">
              Ready for Report <Badge variant="secondary" className="ml-2">{completedRuns.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="processing">
              Processing <Badge variant="secondary" className="ml-2">{processingRuns.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="failed">
              Failed <Badge variant="secondary" className="ml-2">{failedRuns.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Completed Tab */}
          <TabsContent value="completed" className="space-y-4">
            {completedRuns.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No completed models yet</p>
                  <p className="text-sm text-slate-400">Models will appear here once they finish processing</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedRuns.map(run => (
                  <SDMCard key={run.id} run={run} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Processing Tab */}
          <TabsContent value="processing" className="space-y-4">
            {processingRuns.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No models processing</p>
                  <p className="text-sm text-slate-400">Models in progress will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processingRuns.map(run => (
                  <SDMCard key={run.id} run={run} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Failed Tab */}
          <TabsContent value="failed" className="space-y-4">
            {failedRuns.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No failed models</p>
                  <p className="text-sm text-slate-400">Failed models will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {failedRuns.map(run => (
                  <SDMCard key={run.id} run={run} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Report Format Info */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Report Format & Contents
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-2">
            <p>All generated reports include:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 ml-2">
              <li>Executive summary with key findings</li>
              <li>Complete methodology and parameter documentation</li>
              <li>Comprehensive performance metrics table</li>
              <li>Variable importance analysis with visualizations</li>
              <li>Spatial prediction statistics</li>
              <li>Evidence-based conservation recommendations</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SDMReportingDashboard() {
  return (
    <ProFeatureGate featureName="SDM Report Generation">
      <SDMReportingDashboardContent />
    </ProFeatureGate>
  );
}