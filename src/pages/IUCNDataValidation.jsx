import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Clock, Search, RefreshCw, Loader2, Filter } from 'lucide-react';
import { toast } from 'sonner';

const ISSUE_TYPES = [
  { id: 'missing_assessment', label: 'Missing Assessment', severity: 'high', icon: AlertCircle },
  { id: 'missing_range_data', label: 'Missing Range Data', severity: 'high', icon: AlertCircle },
  { id: 'missing_taxonomy', label: 'Missing Taxonomy', severity: 'medium', icon: AlertCircle },
  { id: 'missing_scientific_name', label: 'Missing Scientific Name', severity: 'critical', icon: AlertCircle },
  { id: 'missing_iucn_status', label: 'Missing IUCN Status', severity: 'high', icon: AlertCircle },
  { id: 'missing_images', label: 'Missing Images', severity: 'low', icon: AlertCircle },
  { id: 'missing_observations', label: 'Missing Observations', severity: 'medium', icon: AlertCircle },
  { id: 'missing_gbif_data', label: 'Missing GBIF Data', severity: 'medium', icon: AlertCircle },
  { id: 'orphaned_files', label: 'Orphaned Files', severity: 'low', icon: AlertCircle },
];

const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-blue-100 text-blue-800 border-blue-300',
};

export default function IUCNDataValidation() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [validating, setValidating] = useState(false);
  const [issues, setIssues] = useState([]);

  // Fetch species and validate
  const { data: species = [], isLoading } = useQuery({
    queryKey: ['species'],
    queryFn: () => base44.entities.Species.list('-updated_date', 100),
  });

  // Validate data
  const runValidation = async () => {
    setValidating(true);
    try {
      const res = await base44.functions.invoke('validateIUCNData', {});
      setIssues(res.data.issues || []);
      toast.success(`Validation complete — ${res.data.issues?.length || 0} issues found`);
    } catch (e) {
      toast.error('Validation failed: ' + e.message);
    } finally {
      setValidating(false);
    }
  };

  // Quick fix
  const quickFix = async (speciesId, issueType) => {
    try {
      await base44.functions.invoke('quickFixIssue', {
        species_id: speciesId,
        issue_type: issueType,
      });
      toast.success('Issue fixed');
      runValidation();
    } catch (e) {
      toast.error('Fix failed: ' + e.message);
    }
  };

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    const matchesSearch = !searchTerm || 
      issue.species_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.issue_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || issue.severity === selectedSeverity;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">IUCN Data Validation</h1>
              <p className="text-sm text-slate-500 mt-1">
                Identify and fix data integrity issues across your species database
              </p>
            </div>
            <Button 
              onClick={runValidation} 
              disabled={validating}
              className="bg-bangor-red hover:bg-bangor-red/90 text-white"
            >
              {validating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Validating…</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" />Run Validation</>
              )}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 font-semibold">Total Species</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{species.length}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-xs text-red-600 font-semibold">Critical Issues</p>
              <p className="text-xl font-bold text-red-800 mt-1">
                {issues.filter(i => i.severity === 'critical').length}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <p className="text-xs text-orange-600 font-semibold">High Severity</p>
              <p className="text-xl font-bold text-orange-800 mt-1">
                {issues.filter(i => i.severity === 'high').length}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="text-xs text-green-600 font-semibold">Issues Fixed</p>
              <p className="text-xl font-bold text-green-800 mt-1">0</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input 
                placeholder="Search by species name or issue type…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm"
              />
            </div>
            <select 
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Issues List */}
        {isLoading || validating ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-lg p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No issues found</p>
            <p className="text-xs text-slate-500 mt-1">Your database is in good shape!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue, idx) => (
              <Card key={idx} className="border-l-4 border-l-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 text-sm">
                          {issue.species_name || 'Unknown Species'}
                        </h3>
                        <Badge variant="outline" className={`text-xs py-0 ${SEVERITY_COLORS[issue.severity]}`}>
                          {issue.severity?.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs py-0">
                          {issue.issue_type?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      {issue.details && (
                        <p className="text-xs text-slate-500 mt-2">{issue.details}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => quickFix(issue.species_id, issue.issue_type)}
                        className="text-xs h-8"
                      >
                        Auto-Fix
                      </Button>
                      <Button 
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 text-slate-400"
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}