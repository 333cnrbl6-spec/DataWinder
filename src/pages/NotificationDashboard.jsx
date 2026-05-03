import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell } from 'lucide-react';
import AlertSubscriptionManager from '@/components/workspace/AlertSubscriptionManager';
import AlertHistoryViewer from '@/components/workspace/AlertHistoryViewer';

export default function NotificationDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-bangor-red/10 rounded-xl">
            <Bell className="w-6 h-6 text-bangor-red" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notification Center</h1>
            <p className="text-sm text-slate-600 mt-1">
              Set up automated alerts for species observations and conservation zones
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="subscriptions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="subscriptions">
              <Bell className="w-4 h-4 mr-2" />
              Alert Subscriptions
            </TabsTrigger>
            <TabsTrigger value="history">
              Alert History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="mt-6">
            <AlertSubscriptionManager />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <AlertHistoryViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}