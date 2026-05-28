import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Download, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

const STATUS_CONFIG = {
  matched:   { label: 'Matched',    color: 'bg-green-100 text-green-800 border-green-200',   icon: CheckCircle2, row: 'bg-green-50/40' },
  synonym:   { label: 'Synonym',    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle, row: 'bg-yellow-50/40' },
  invalid:   { label: 'Invalid',    color: 'bg-red-100 text-red-800 border-red-200',          icon: XCircle,      row: 'bg-red-50/40' },
  uncertain: { label: 'Uncertain',  color: 'bg-slate-100 text-slate-700 border-slate-200',    icon: HelpCircle,   row: 'bg-slate-50/40' },
};

const IUCN_COLORS = {
  LC: 'bg-green-100 text-green-800', NT: 'bg-lime-100 text-lime-800',
  VU: 'bg-yellow-100 text-yellow-800', EN: 'bg-orange-100 text-orange-800',
  CR: 'bg-red-100 text-red-800', EW: 'bg-purple-100 text-purple-800',
  EX: 'bg-slate-800 text-white', DD: 'bg-blue-100 text-blue-800',
  NE: 'bg-slate-100 text-slate-600', Unknown: 'bg-slate-100 text-slate-400',
};

function SummaryCard({ label, count, color, icon: Icon }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${color}`}>
      <Icon className="w-6 h-6 shrink-0" />
      <div>
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-xs font-medium">{label}</div>
      </div>
    </div>
  );
}

export default function BulkSpeciesUpload() {
  const [file, setFile] = useState(null);
  const [listName, setListName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    if (!listName) setListName(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const res = await base44.functions.invoke('validateSpeciesListUpload', {
      file_url,
      original_name: file.name,
      list_name: listName || file.name.replace(/\.[^.]+$/, ''),
    });

    const data = res.data;
    if (data.error) {
      setError(data.error);
    } else {
      setResult(data);
      setFilter('all');
      setExpandedRows(new Set());
    }
    setLoading(false);
  };

  const toggleRow = (idx) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const exportReport = () => {
    if (!result) return;
    const rows = [
      ['Row', 'Input Name', 'Status', 'Accepted Name', 'IUCN Category', 'Common Name', 'Note'],
      ...result.results.map(r => [
        r.row_index, r.input_name, r.status,
        r.accepted_name || '', r.iucn_category || '',
        r.common_name || '', r.note || ''
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.list_name}_validation_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = result?.results?.filter(r => filter === 'all' || r.status === filter) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Header */}
      <header className="bg-white border-b-2 border-bangor-red sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="p-2 bg-bangor-red/10 rounded-xl">
            <Upload className="w-6 h-6 text-bangor-red" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-bangor-red">Bulk Species Upload</h1>
            <p className="text-sm text-slate-600">Upload a CSV species list and validate against IUCN taxonomy</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Upload Species List</h2>
          <p className="text-sm text-slate-500 mb-6">
            CSV file with a column named <code className="bg-slate-100 px-1 rounded">scientific_name</code>, <code className="bg-slate-100 px-1 rounded">species</code>, or similar. Optional <code className="bg-slate-100 px-1 rounded">common_name</code> column also supported.
          </p>

          {/* Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              dragOver ? 'border-bangor-red bg-bangor-red/5' : 'border-slate-300 hover:border-bangor-red/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
            />
            <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            {file ? (
              <div>
                <p className="font-semibold text-slate-700">{file.name}</p>
                <p className="text-sm text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB — click to change</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-slate-600">Drop your CSV here or click to browse</p>
                <p className="text-sm text-slate-400 mt-1">Supports CSV, TSV, TXT</p>
              </div>
            )}
          </div>

          {/* List Name */}
          <div className="mt-5">
            <label className="block text-sm font-medium text-slate-700 mb-1">List Name (optional)</label>
            <input
              type="text"
              value={listName}
              onChange={e => setListName(e.target.value)}
              placeholder="e.g. Welsh Bat Species 2024"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bangor-red/30"
            />
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={!file || loading}
              className="bg-bangor-red hover:bg-bangor-red/90 gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {loading ? 'Validating…' : 'Upload & Validate'}
            </Button>
            {result && (
              <Button variant="outline" onClick={() => { setFile(null); setResult(null); setError(null); setListName(''); }} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Start Over
              </Button>
            )}
          </div>

          {loading && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              Parsing CSV and validating species names against IUCN taxonomy — this may take 15–30 seconds for large lists…
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{result.list_name}</h2>
                  <p className="text-sm text-slate-500">{result.total} species validated · {result.summary.needs_review} need review</p>
                </div>
                <Button variant="outline" onClick={exportReport} className="gap-2 text-sm">
                  <Download className="w-4 h-4" /> Export Report
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard label="Matched" count={result.summary.matched} color="border-green-200 bg-green-50 text-green-700" icon={CheckCircle2} />
                <SummaryCard label="Synonym" count={result.summary.synonyms} color="border-yellow-200 bg-yellow-50 text-yellow-700" icon={AlertTriangle} />
                <SummaryCard label="Invalid" count={result.summary.invalid} color="border-red-200 bg-red-50 text-red-700" icon={XCircle} />
                <SummaryCard label="Uncertain" count={result.summary.uncertain} color="border-slate-200 bg-slate-50 text-slate-600" icon={HelpCircle} />
              </div>
            </div>

            {/* Filter + Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Filter tabs */}
              <div className="flex gap-1 p-4 border-b border-slate-100 flex-wrap">
                {['all', 'matched', 'synonym', 'invalid', 'uncertain'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                      filter === f
                        ? 'bg-bangor-red text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'all' ? `All (${result.total})` : `${f} (${result.summary[f === 'synonym' ? 'synonyms' : f]})`}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 w-10">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Input Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Accepted Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">IUCN</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((row, idx) => {
                      const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.uncertain;
                      const Icon = cfg.icon;
                      const isExpanded = expandedRows.has(row.row_index);
                      return (
                        <React.Fragment key={row.row_index}>
                          <tr
                            className={`${cfg.row} hover:bg-slate-50 cursor-pointer transition-colors`}
                            onClick={() => toggleRow(row.row_index)}
                          >
                            <td className="px-4 py-3 text-slate-400 text-xs">{row.row_index}</td>
                            <td className="px-4 py-3 font-medium text-slate-800 italic">{row.input_name}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                                <Icon className="w-3 h-3" />
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700 italic">
                              {row.accepted_name && row.accepted_name !== row.input_name ? (
                                <span className="text-blue-700 font-medium">{row.accepted_name}</span>
                              ) : (
                                row.accepted_name || <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {row.iucn_category && row.iucn_category !== 'Unknown' ? (
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${IUCN_COLORS[row.iucn_category] || IUCN_COLORS.Unknown}`}>
                                  {row.iucn_category}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className={cfg.row}>
                              <td colSpan={6} className="px-6 pb-4 pt-1">
                                <div className="bg-white/70 rounded-lg p-3 space-y-1 text-xs text-slate-600 border border-slate-100">
                                  {row.common_name && (
                                    <p><span className="font-semibold text-slate-700">Common name:</span> {row.common_name}</p>
                                  )}
                                  <p><span className="font-semibold text-slate-700">Validation note:</span> {row.note || 'No additional information.'}</p>
                                  {row.status === 'synonym' && (
                                    <p className="text-yellow-700 font-medium">⚠ This is a synonym — consider updating to the accepted name: <em>{row.accepted_name}</em></p>
                                  )}
                                  {row.status === 'invalid' && (
                                    <p className="text-red-700 font-medium">✗ Name not found in IUCN taxonomy — manual review required.</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">No records match this filter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action guidance */}
            {result.summary.needs_review > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
                <p className="font-semibold mb-2">⚠ {result.summary.needs_review} species require manual review before import</p>
                <ul className="space-y-1 list-disc list-inside text-xs">
                  {result.summary.synonyms > 0 && <li><strong>{result.summary.synonyms} synonyms</strong> — update to accepted names before adding to database</li>}
                  {result.summary.invalid > 0 && <li><strong>{result.summary.invalid} invalid names</strong> — verify spelling or remove from list</li>}
                  {result.summary.uncertain > 0 && <li><strong>{result.summary.uncertain} uncertain</strong> — cross-check against IUCN Red List directly</li>}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Format guide */}
        {!result && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
            <p className="font-semibold text-slate-700 mb-3">Expected CSV Format</p>
            <div className="overflow-x-auto">
              <table className="text-xs border border-slate-200 rounded-lg overflow-hidden w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {['scientific_name', 'common_name', 'notes'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Myotis daubentonii', "Daubenton's bat", 'Riparian species'],
                    ['Pipistrellus pipistrellus', 'Common pipistrelle', ''],
                    ['Lutra lutra', 'Eurasian otter', 'Near rivers'],
                  ].map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      {r.map((c, j) => <td key={j} className="px-3 py-1.5 italic text-slate-500">{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-400">Only the <strong>scientific_name</strong> column is required. Additional columns (common_name, notes, etc.) are preserved but not validated.</p>
          </div>
        )}
      </main>
    </div>
  );
}