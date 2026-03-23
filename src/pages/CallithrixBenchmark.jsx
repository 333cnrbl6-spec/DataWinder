import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle, CheckCircle2, XCircle, AlertCircle, Loader2,
  BookOpen, FlaskConical, Globe, Database, Map, BarChart3, Download, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  LC: 'bg-green-100 text-green-800',
  NT: 'bg-yellow-100 text-yellow-800',
  VU: 'bg-orange-100 text-orange-800',
  EN: 'bg-red-100 text-red-800',
  CR: 'bg-red-200 text-red-900',
  DD: 'bg-slate-100 text-slate-700',
};

const VERDICT_COLORS = {
  'Fully Supported': 'bg-green-100 text-green-800 border-green-200',
  'Largely Supported': 'bg-blue-100 text-blue-800 border-blue-200',
  'Partially Supported': 'bg-amber-100 text-amber-800 border-amber-200',
  'Insufficient Data': 'bg-red-100 text-red-800 border-red-200',
};

function StageCard({ icon: Icon, label, stage, color }) {
  return (
    <div className={`rounded-xl border p-4 space-y-1 ${stage?.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        {stage?.passed
          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 ml-auto" />
          : <XCircle className="w-3.5 h-3.5 text-red-500 ml-auto" />
        }
      </div>
      {stage?.error && <p className="text-xs text-red-600">{stage.error}</p>}
      {stage?.count !== undefined && <p className="text-xs text-slate-500">{stage.count} species found</p>}
      {stage?.observation_count !== undefined && <p className="text-xs text-slate-500">{stage.observation_count.toLocaleString()} observations</p>}
      {stage?.occurrence_count !== undefined && <p className="text-xs text-slate-500">{stage.occurrence_count.toLocaleString()} occurrences</p>}
      {stage?.total_occurrences !== undefined && <p className="text-xs text-slate-500">{stage.total_occurrences.toLocaleString()} total records</p>}
      {stage?.can_create !== undefined && <p className="text-xs text-slate-500">CRUD: {stage.can_create ? 'OK' : 'Failed'}</p>}
    </div>
  );
}

function PaperCard({ paper }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className={`border ${VERDICT_COLORS[paper.verdict] || ''}`}>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs text-slate-500 font-medium">{paper.authors}</p>
            <CardTitle className="text-sm mt-0.5 leading-snug">{paper.title}</CardTitle>
            <p className="text-xs text-slate-500 mt-1 italic">{paper.focus}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge className={`text-xs border ${VERDICT_COLORS[paper.verdict]}`}>{paper.verdict}</Badge>
            <span className="text-lg font-bold text-slate-800">{paper.readiness_pct}%</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </div>
        </div>
        <Progress value={paper.readiness_pct} className="h-1.5 mt-2" />
      </CardHeader>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <CardContent className="pt-0 space-y-2">
              {Object.entries(paper.checks).map(([stage, data]) => (
                <div key={stage} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${data.supported ? 'bg-green-50' : 'bg-red-50'}`}>
                  {data.supported
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                    : <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                  }
                  <div>
                    <span className="font-semibold text-slate-700">{stage.replace(/_/g, ' ')}</span>
                    <p className="text-slate-500">{data.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function CallithrixBenchmark() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const run = async () => {
    setRunning(true);
    setResults(null);
    try {
      const res = await base44.functions.invoke('callithrixBenchmark', {});
      setResults(res.data);
      toast.success('Benchmark complete!');
    } catch (e) {
      toast.error('Benchmark failed: ' + e.message);
    } finally {
      setRunning(false);
    }
  };

  const exportJSON = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `callithrix_benchmark_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-bangor-red/10 rounded-xl">
                <FlaskConical className="w-6 h-6 text-bangor-red" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Callithrix End-to-End Benchmark</h1>
                <p className="text-sm text-slate-500 mt-0.5">Tests genus-level pipeline against 3 published primate papers</p>
              </div>
            </div>
            <Button
              onClick={run}
              disabled={running}
              className="bg-bangor-red hover:bg-bangor-red/90 text-white shrink-0"
            >
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
              {running ? 'Running…' : 'Run Benchmark'}
            </Button>
          </div>

          {/* Papers being benchmarked */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Rylands & Mittermeier (2009)', sub: 'Taxonomy & conservation status' },
              { label: 'Zinner et al. (2013)', sub: 'Phylogeny & SDM readiness' },
              { label: 'Freitas et al. (2019)', sub: 'Habitat loss & threats' },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                <BookOpen className="w-3.5 h-3.5 text-bangor-red shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{p.label}</p>
                  <p className="text-xs text-slate-400">{p.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Running state */}
        {running && (
          <Card className="border-bangor-red/20 bg-bangor-red/5">
            <CardContent className="py-10 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-bangor-red animate-spin" />
              <p className="font-semibold text-bangor-red">Running Callithrix pipeline…</p>
              <p className="text-sm text-slate-500">Querying IUCN · iNaturalist · GBIF · Database · MAXENT</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && !running && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Overall verdict */}
            <Card className="border-2 border-bangor-red/30 bg-white">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Overall Researcher Readiness</p>
                    <p className="text-3xl font-bold text-slate-900">{results.summary.overall_readiness_pct}%</p>
                    <p className="text-sm text-bangor-red font-medium mt-1">{results.summary.verdict}</p>
                    <p className="text-xs text-slate-400 mt-1">Completed in {(results.duration_ms / 1000).toFixed(2)}s</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <p className="text-xl font-bold text-slate-900">{results.summary.iucn_species_found}</p>
                      <p className="text-xs text-slate-500">IUCN species</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <p className="text-xl font-bold text-slate-900">{(results.summary.gbif_occurrences + results.summary.inat_observations).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">Total occurrences</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <p className="text-xl font-bold text-green-700">{results.summary.papers_largely_supported}</p>
                      <p className="text-xs text-slate-500">Papers supported</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <p className={`text-xl font-bold ${results.summary.maxent_ready ? 'text-green-700' : 'text-red-600'}`}>
                        {results.summary.maxent_ready ? 'Yes' : 'No'}
                      </p>
                      <p className="text-xs text-slate-500">MAXENT ready</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline stage results */}
            <div>
              <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Pipeline Stages</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StageCard icon={Globe} label="IUCN Red List" stage={results.stages.iucn} color="text-blue-600" />
                <StageCard icon={Map} label="iNaturalist" stage={results.stages.inat} color="text-green-600" />
                <StageCard icon={BarChart3} label="GBIF" stage={results.stages.gbif} color="text-amber-600" />
                <StageCard icon={Database} label="Database" stage={results.stages.database} color="text-slate-600" />
                <StageCard icon={FlaskConical} label="MAXENT Ready" stage={results.stages.maxent} color="text-bangor-red" />
              </div>
            </div>

            {/* IUCN species table */}
            {results.stages.iucn.species?.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Callithrix Species Found (IUCN)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {results.stages.iucn.species.map((sp, i) => (
                    <div key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <span className="text-xs italic text-slate-700 font-medium">{sp.name}</span>
                      <Badge className={`text-xs ${STATUS_COLORS[sp.status] || 'bg-slate-100 text-slate-700'}`}>{sp.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Paper cross-reference */}
            <div>
              <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Paper Cross-Reference</h2>
              <div className="space-y-3">
                {results.paper_crossref.map(paper => (
                  <PaperCard key={paper.paper_id} paper={paper} />
                ))}
              </div>
            </div>

            {/* Export */}
            <Button onClick={exportJSON} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Export Full Benchmark Report (JSON)
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}