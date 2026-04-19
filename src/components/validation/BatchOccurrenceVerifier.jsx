import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle, AlertTriangle, CheckCircle2, Loader2, RefreshCw,
  MapPin, Copy, FlaskConical, XCircle, Info,
} from 'lucide-react';

const FLAG_META = {
  MISSING_COORDS:         { label: 'Missing Coords',       color: 'bg-red-100 text-red-700 border-red-200' },
  LAT_OUT_OF_RANGE:       { label: 'Lat Out of Range',     color: 'bg-red-100 text-red-700 border-red-200' },
  LON_OUT_OF_RANGE:       { label: 'Lon Out of Range',     color: 'bg-red-100 text-red-700 border-red-200' },
  TRANSPOSED_COORDS:      { label: 'Transposed Coords',    color: 'bg-red-100 text-red-700 border-red-200' },
  CENTROID_ARTEFACT:      { label: 'Centroid Artefact',    color: 'bg-amber-100 text-amber-700 border-amber-200' },
  LOW_PRECISION:          { label: 'Low Precision',        color: 'bg-amber-100 text-amber-700 border-amber-200' },
  DUPLICATE:              { label: 'Duplicate',            color: 'bg-amber-100 text-amber-700 border-amber-200' },
  TAXONOMY_UNMATCHED:     { label: 'Not in GBIF',          color: 'bg-red-100 text-red-700 border-red-200' },
  TAXONOMY_FUZZY:         { label: 'Fuzzy Match',          color: 'bg-amber-100 text-amber-700 border-amber-200' },
  TAXONOMY_SYNONYM:       { label: 'Synonym',              color: 'bg-amber-100 text-amber-700 border-amber-200' },
  TAXONOMY_DOUBTFUL:      { label: 'Doubtful Taxon',       color: 'bg-amber-100 text-amber-700 border-amber-200' },
  TAXONOMY_LOW_CONFIDENCE:{ label: 'Low Confidence',       color: 'bg-amber-100 text-amber-700 border-amber-200' },
  MISSING_SPECIES_NAME:   { label: 'No Species Name',      color: 'bg-red-100 text-red-700 border-red-200' },
};

function QualityIcon({ quality }) {
  if (quality === 'clean')   return <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />;
  if (quality === 'invalid') return <XCircle className="w-4 h-4 text-red-600 shrink-0" />;
  return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
}

function FlagBadge({ code }) {
  const meta = FLAG_META[code] || { label: code, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function SummaryCard({ label, value, icon: Icon, colorClass }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-white">
      <span className="text-sm text-slate-600 flex items-center gap-1.5">
        <Icon className={`w-4 h-4 ${colorClass}`} />
        {label}
      </span>
      <span className={`text-xl font-bold ${colorClass}`}>{value}</span>
    </div>
  );
}

function OccurrenceRow({ occ, expanded, onToggle }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <QualityIcon quality={occ.quality} />
          <div className="flex-1 min-w-0">
            <p className="font-medium italic text-slate-900 truncate">{occ.species_name || <span className="not-italic text-slate-400">Unknown</span>}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {occ.latitude != null ? `${occ.latitude}, ${occ.longitude}` : 'No coordinates'}
              {occ.source && <span className="ml-1 text-slate-400">· {occ.source}</span>}
              {occ.occurrence_date && <span className="text-slate-400">· {occ.occurrence_date}</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[200px]">
          {occ.flags.map((f, i) => <FlagBadge key={i} code={f.code} />)}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-3">
          {/* Flag details */}
          <div className="space-y-1.5">
            {occ.flags.map((f, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs rounded px-2 py-1.5 border ${FLAG_META[f.code]?.color || 'bg-slate-100'}`}>
                {f.severity === 'error'
                  ? <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                <span>{f.message}</span>
              </div>
            ))}
          </div>

          {/* GBIF match detail */}
          {occ.gbif_match && (
            <div className="text-xs bg-white border border-slate-200 rounded p-2 space-y-0.5 font-mono">
              <p className="font-sans font-semibold text-slate-600 mb-1 not-italic">GBIF Backbone Match</p>
              <p>Type: <span className="text-slate-900">{occ.gbif_match.matchType}</span></p>
              {occ.gbif_match.acceptedName && <p>Accepted: <span className="text-slate-900 italic">{occ.gbif_match.acceptedName}</span></p>}
              <p>Confidence: <span className="text-slate-900">{occ.gbif_match.confidence}%</span></p>
              {occ.gbif_match.synonym && <p className="text-amber-700">⚠ This name is a synonym</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BatchOccurrenceVerifier() {
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const runVerification = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setSummary(null);
    setExpandedId(null);
    try {
      const res = await base44.functions.invoke('batchOccurrenceVerify', {});
      setResults(res.data.results);
      setSummary(res.data.summary);
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!results) return [];
    if (tab === 'invalid') return results.filter(r => r.quality === 'invalid');
    if (tab === 'review')  return results.filter(r => r.quality === 'review');
    if (tab === 'clean')   return results.filter(r => r.quality === 'clean');
    return results;
  }, [results, tab]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-bangor-red" />
            Batch Occurrence Verifier
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Cross-checks all loaded occurrence records against the GBIF backbone taxonomy and runs automated coordinate quality checks.
          </p>
        </div>
        <Button
          onClick={runVerification}
          disabled={loading}
          className="bg-bangor-red hover:bg-bangor-red/90 gap-2 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? 'Verifying…' : 'Run Verification'}
        </Button>
      </div>

      {/* Info note */}
      {!results && !loading && (
        <div className="flex items-start gap-2 text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <span>Click <strong>Run Verification</strong> to batch-check all OccurrenceNote records in your database. Checks include: GBIF backbone taxonomy match, duplicate detection, null island / centroid artefacts, coordinate precision, and range validation.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-12 text-slate-500 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-bangor-red" />
          <p className="text-sm font-medium">Querying GBIF backbone for all species…</p>
          <p className="text-xs text-slate-400">This may take 20–60 seconds for large datasets.</p>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <SummaryCard label="Total" value={summary.total} icon={MapPin} colorClass="text-slate-600" />
          <SummaryCard label="Clean" value={summary.clean} icon={CheckCircle2} colorClass="text-green-600" />
          <SummaryCard label="Review" value={summary.review} icon={AlertTriangle} colorClass="text-amber-600" />
          <SummaryCard label="Invalid" value={summary.invalid} icon={XCircle} colorClass="text-red-600" />
          <SummaryCard label="Duplicates" value={summary.duplicates} icon={Copy} colorClass="text-amber-600" />
          <SummaryCard label="Taxon Issues" value={summary.taxonomy_issues} icon={FlaskConical} colorClass="text-purple-600" />
        </div>
      )}

      {results && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Verification Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-4 w-full mb-4">
                <TabsTrigger value="all">All ({results.length})</TabsTrigger>
                <TabsTrigger value="invalid">Invalid ({summary.invalid})</TabsTrigger>
                <TabsTrigger value="review">Review ({summary.review})</TabsTrigger>
                <TabsTrigger value="clean">Clean ({summary.clean})</TabsTrigger>
              </TabsList>

              <TabsContent value={tab} className="space-y-2 mt-0 max-h-[600px] overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No records in this category.</div>
                ) : (
                  filtered.map(occ => (
                    <OccurrenceRow
                      key={occ.id}
                      occ={occ}
                      expanded={expandedId === occ.id}
                      onToggle={() => setExpandedId(expandedId === occ.id ? null : occ.id)}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}