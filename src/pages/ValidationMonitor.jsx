import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ValidationNotificationDashboard from '@/components/notifications/ValidationNotificationDashboard';
import ValidationFlagsPanel from '@/components/validation/ValidationFlagsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ValidationMonitor() {
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const navigate = useNavigate();

  const handleNavigateToFlag = (flag) => {
    setSelectedFlag(flag);
    setSelectedSpecies(flag.species_id);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-6 h-6 text-bangor-red" />
            <h1 className="text-3xl font-bold text-slate-900">Validation Monitor</h1>
          </div>
          <p className="text-slate-600">
            Real-time tracking of species occurrence validation issues and quality flags
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="dashboard">Notifications</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <ValidationNotificationDashboard onNavigateToFlag={handleNavigateToFlag} />
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            {selectedSpecies ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Detailed Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedFlag && (
                      <div className="space-y-4 mb-6 bg-slate-50 rounded-lg p-4">
                        <div>
                          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                            Selected Occurrence
                          </div>
                          <div className="text-lg font-semibold text-slate-900">
                            {selectedFlag.species_name}
                          </div>
                          <div className="text-sm text-slate-600 mt-1">
                            Rule: {selectedFlag.rule_name}
                          </div>
                        </div>
                      </div>
                    )}
                    <ValidationFlagsPanel
                      speciesId={selectedSpecies}
                      refreshTrigger={selectedFlag?.id}
                    />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600">
                    Select a flagged occurrence from the dashboard to view detailed review options
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}