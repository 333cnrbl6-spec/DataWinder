import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, startOfMonth, eachDayOfInterval, endOfMonth } from 'date-fns';

export default function ResearchHealthMetrics({ surveys = [], occurrences = [], validationFlags = [], metrics }) {
  
  // Survey status breakdown
  const surveyData = useMemo(() => {
    const statusCount = surveys.reduce((acc, survey) => {
      const status = survey.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  }, [surveys]);

  // Observations over time
  const obsTimeline = useMemo(() => {
    if (occurrences.length === 0) return [];

    const grouped = {};
    occurrences.forEach(obs => {
      const month = format(new Date(obs.observation_date), 'MMM yyyy');
      grouped[month] = (grouped[month] || 0) + 1;
    });

    return Object.entries(grouped).slice(-6).map(([month, count]) => ({
      month,
      observations: count,
    }));
  }, [occurrences]);

  // Flag status breakdown
  const flagData = useMemo(() => {
    const statusCount = validationFlags.reduce((acc, flag) => {
      const status = flag.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  }, [validationFlags]);

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Survey Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Survey Status</CardTitle>
        </CardHeader>
        <CardContent>
          {surveyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={surveyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              <p className="text-sm">No survey data</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observations Timeline */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Observation Trend (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          {obsTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={obsTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="observations" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              <p className="text-sm">No observation data</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flag Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flag Status</CardTitle>
        </CardHeader>
        <CardContent>
          {flagData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={flagData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              <p className="text-sm">No flag data</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Quality Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Health Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <MetricRow
              label="Total Occurrences"
              value={metrics.totalOccurrences}
              color="text-blue-600"
            />
            <MetricRow
              label="Active Surveys"
              value={metrics.activeSurveys}
              color="text-green-600"
            />
            <MetricRow
              label="Completed Surveys"
              value={metrics.completedSurveys}
              color="text-slate-600"
            />
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Overall Health</span>
                <div className="text-right">
                  <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '85%' }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">85%</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-lg font-bold ${color}`}>{value}</span>
    </div>
  );
}