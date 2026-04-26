import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, AlertCircle, Database } from 'lucide-react';

export default function AnalyticsDashboard({ species = [], surveys = [], observations = [] }) {
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const surveysThisMonth = surveys.filter(s => new Date(s.created_date) >= thisMonth).length;

    // Sightings over time (last 30 days)
    const sightingsData = Array.from({ length: 30 }).map((_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (29 - i));
      const dateStr = date.toISOString().split('T')[0];
      const count = observations.filter(o => o.created_date?.startsWith(dateStr)).length;
      return { date: dateStr.slice(-5), sightings: count };
    });

    // Species by conservation status
    const statusCounts = {};
    species.forEach(s => {
      const status = s.iucn_status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // Survey areas
    const areaCounts = {};
    surveys.forEach(s => {
      const area = s.location || 'Unknown';
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    });
    const areaData = Object.entries(areaCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name: name.slice(0, 15), value }));

    const uniqueObservers = [...new Set(surveys.map(s => s.created_by_name))].filter(Boolean).length;

    return {
      totalSpecies: species.length,
      surveysThisMonth,
      activeResearchers: uniqueObservers,
      totalObservations: observations.length,
      sightingsData,
      statusData,
      areaData
    };
  }, [species, surveys, observations]);

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard
          icon={Database}
          title="Species Recorded"
          value={stats.totalSpecies}
          trend="+12%"
        />
        <KPICard
          icon={TrendingUp}
          title="Surveys This Month"
          value={stats.surveysThisMonth}
          trend="vs last month"
        />
        <KPICard
          icon={Users}
          title="Active Researchers"
          value={stats.activeResearchers}
          trend="+3 this week"
        />
        <KPICard
          icon={AlertCircle}
          title="Total Observations"
          value={stats.totalObservations}
          trend="+8%"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sightings Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Sightings Over Time (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.sightingsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sightings" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conservation Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Species by Conservation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Survey Areas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Survey Activity by Location</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.areaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, title, value, trend }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-2">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-2">{trend}</p>
          </div>
          <Icon className="w-8 h-8 text-bangor-red opacity-20" />
        </div>
      </CardContent>
    </Card>
  );
}