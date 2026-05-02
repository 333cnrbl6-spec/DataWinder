import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, TrendingUp, Activity } from 'lucide-react';

export default function RevenueAnalyticsDashboard() {
  const [metrics, setMetrics] = useState({
    mrr: 0,
    arr: 0,
    activeSubscribers: 0,
    conversionRate: 0,
    churnRate: 0,
    avgLTV: 0
  });
  const [mrrTrend, setMrrTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch subscription data from backend
        const result = await base44.functions.invoke('generatePlatformHealthReport', {});
        
        if (result.data) {
          setMetrics({
            mrr: result.data.mrr || 0,
            arr: result.data.arr || 0,
            activeSubscribers: result.data.active_subscribers || 0,
            conversionRate: (result.data.conversion_rate || 0).toFixed(1),
            churnRate: (result.data.churn_rate || 0).toFixed(1),
            avgLTV: result.data.avg_ltv || 0
          });

          // Mock MRR trend data (would come from analytics API)
          setMrrTrend([
            { month: 'Jan', mrr: 0 },
            { month: 'Feb', mrr: 1200 },
            { month: 'Mar', mrr: 3500 },
            { month: 'Apr', mrr: 5800 },
            { month: 'May', mrr: 8200 }
          ]);
        }
      } catch (err) {
        console.error('Analytics fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div className="animate-pulse h-96 bg-slate-200 rounded-lg" />;

  const kpis = [
    { label: 'MRR', value: `£${metrics.mrr.toLocaleString()}`, icon: DollarSign, color: 'text-green-600' },
    { label: 'ARR', value: `£${metrics.arr.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Active Subscribers', value: metrics.activeSubscribers, icon: Users, color: 'text-purple-600' },
    { label: 'Conversion Rate', value: `${metrics.conversionRate}%`, icon: Activity, color: 'text-orange-600' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                  {kpi.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Recurring Revenue</CardTitle>
          <CardDescription>Last 5 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mrrTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `£${value}`} />
              <Line type="monotone" dataKey="mrr" stroke="#dc2626" strokeWidth={2} dot={{ fill: '#dc2626' }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Churn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{metrics.churnRate}%</p>
            <p className="text-xs text-slate-500 mt-2">Monthly subscriber churn</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg LTV</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">£{metrics.avgLTV}</p>
            <p className="text-xs text-slate-500 mt-2">Customer lifetime value</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}