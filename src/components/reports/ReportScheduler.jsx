import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Calendar, Mail, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

export default function ReportScheduler() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    report_type: 'biodiversity_health',
    export_format: 'both',
    schedule_type: 'monthly',
    day_of_month: 1,
    recipients: '',
    include_validation_flags: true
  });

  useEffect(() => {
    loadUser();
    fetchReports();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const allReports = await base44.entities.ScheduledReport.list();
      setReports(allReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const reportData = {
        ...formData,
        recipients: formData.recipients.split(',').map(e => e.trim()).filter(e => e),
        filters: {
          include_validation_flags: formData.include_validation_flags
        },
        created_by: user.email
      };

      if (editingReport) {
        await base44.entities.ScheduledReport.update(editingReport.id, reportData);
      } else {
        await base44.entities.ScheduledReport.create(reportData);
      }

      await fetchReports();
      resetForm();
    } catch (error) {
      console.error('Error saving report:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this scheduled report?')) {
      try {
        await base44.entities.ScheduledReport.delete(id);
        await fetchReports();
      } catch (error) {
        console.error('Error deleting report:', error);
      }
    }
  };

  const handleEdit = (report) => {
    setEditingReport(report);
    setFormData({
      name: report.name,
      description: report.description || '',
      report_type: report.report_type,
      export_format: report.export_format || 'both',
      schedule_type: report.schedule_type,
      day_of_month: report.day_of_month || 1,
      recipients: (report.recipients || []).join(', '),
      include_validation_flags: report.filters?.include_validation_flags !== false
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      report_type: 'biodiversity_health',
      export_format: 'both',
      schedule_type: 'monthly',
      day_of_month: 1,
      recipients: '',
      include_validation_flags: true
    });
    setEditingReport(null);
    setShowForm(false);
  };

  const getScheduleLabel = (report) => {
    if (report.schedule_type === 'manual') {
      return 'Manual';
    }
    if (report.schedule_type === 'monthly') {
      return `Monthly on day ${report.day_of_month}`;
    }
    if (report.schedule_type === 'weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Weekly on ${days[report.day_of_week] || 'Unknown'}`;
    }
    return report.schedule_type.charAt(0).toUpperCase() + report.schedule_type.slice(1);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-bangor-red" />
          <h2 className="text-2xl font-bold text-slate-900">Scheduled Reports</h2>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-bangor-red hover:bg-bangor-red/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-bangor-red/20 bg-slate-50">
          <CardHeader>
            <CardTitle className="text-base">
              {editingReport ? 'Edit Report Schedule' : 'Create New Report Schedule'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">
                  Report Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Monthly Biodiversity Report"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">
                  Description
                </label>
                <Textarea
                  placeholder="Brief description of this report..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="resize-none h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">
                    Report Type
                  </label>
                  <Select value={formData.report_type} onValueChange={(value) => setFormData({ ...formData, report_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="biodiversity_health">Biodiversity Health</SelectItem>
                      <SelectItem value="validation_summary">Validation Summary</SelectItem>
                      <SelectItem value="occurrence_inventory">Occurrence Inventory</SelectItem>
                      <SelectItem value="threat_assessment">Threat Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">
                    Export Format
                  </label>
                  <Select value={formData.export_format} onValueChange={(value) => setFormData({ ...formData, export_format: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Only</SelectItem>
                      <SelectItem value="csv">CSV Only</SelectItem>
                      <SelectItem value="both">Both PDF & CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">
                    Schedule Frequency
                  </label>
                  <Select value={formData.schedule_type} onValueChange={(value) => setFormData({ ...formData, schedule_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                      <SelectItem value="manual">Manual Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.schedule_type === 'monthly' && (
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1">
                      Day of Month
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.day_of_month}
                      onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) })}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">
                  Email Recipients (comma-separated)
                </label>
                <Input
                  type="text"
                  placeholder="email1@example.com, email2@example.com"
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="flags"
                  checked={formData.include_validation_flags}
                  onChange={(e) => setFormData({ ...formData, include_validation_flags: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="flags" className="text-sm text-slate-700">
                  Include validation flags in report
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-bangor-red hover:bg-bangor-red/90">
                  {editingReport ? 'Update Report' : 'Create Report'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading reports...</div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No scheduled reports yet</p>
            </CardContent>
          </Card>
        ) : (
          reports.map(report => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{report.name}</h3>
                      <Badge variant="secondary">{report.report_type}</Badge>
                      <Badge variant="outline" className={report.enabled ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-700'}>
                        {report.enabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {report.description && (
                      <p className="text-sm text-slate-600 mb-3">{report.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {getScheduleLabel(report)}
                      </div>
                      {report.recipients?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {report.recipients.length} recipient(s)
                        </div>
                      )}
                    </div>

                    {report.last_generated && (
                      <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Last generated: {new Date(report.last_generated).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(report)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(report.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}