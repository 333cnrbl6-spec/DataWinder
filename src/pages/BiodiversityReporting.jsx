import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ReportScheduler from '@/components/reports/ReportScheduler';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Zap } from 'lucide-react';

export default function BiodiversityReporting() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('generateBiodiversityReport', {
        format: 'both'
      });

      if (response.data.success) {
        // In a real app, you'd download the generated files
        alert('Report generated successfully!');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-8 h-8 text-bangor-red" />
            <h1 className="text-3xl font-bold text-slate-900">Biodiversity Reporting</h1>
          </div>
          <p className="text-slate-600">
            Generate and schedule comprehensive reports on species occurrence data and validation health
          </p>
        </div>

        <Tabs defaultValue="scheduler" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="scheduler">Scheduled Reports</TabsTrigger>
            <TabsTrigger value="manual">Generate Now</TabsTrigger>
          </TabsList>

          {/* Scheduled Reports Tab */}
          <TabsContent value="scheduler" className="space-y-6 mt-6">
            <ReportScheduler />
          </TabsContent>

          {/* Manual Generation Tab */}
          <TabsContent value="manual" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Generate Report Immediately
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-slate-200 hover:border-bangor-red hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <FileText className="w-8 h-8 text-bangor-red mx-auto mb-3" />
                        <h3 className="font-semibold text-slate-900 mb-2">Biodiversity Health</h3>
                        <p className="text-sm text-slate-600 mb-4">
                          Overview of occurrence data and validation metrics
                        </p>
                        <Button
                          onClick={handleGenerateReport}
                          disabled={loading}
                          className="w-full bg-bangor-red hover:bg-bangor-red/90"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {loading ? 'Generating...' : 'Generate Now'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 hover:border-bangor-red hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <FileText className="w-8 h-8 text-bangor-red mx-auto mb-3" />
                        <h3 className="font-semibold text-slate-900 mb-2">Validation Summary</h3>
                        <p className="text-sm text-slate-600 mb-4">
                          Detailed breakdown of flagged records and issues
                        </p>
                        <Button
                          onClick={handleGenerateReport}
                          disabled={loading}
                          className="w-full bg-bangor-red hover:bg-bangor-red/90"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {loading ? 'Generating...' : 'Generate Now'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-blue-900 mb-2">Report Formats</h4>
                    <p className="text-sm text-blue-800">
                      All reports are generated in both PDF (formatted summary) and CSV (raw data) formats for maximum compatibility and flexibility.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}