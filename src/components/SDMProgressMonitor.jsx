import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

/**
 * SDM PROGRESS MONITOR COMPONENT
 * =============================
 * Real-time progress monitoring via Server-Sent Events (SSE)
 * Replaces polling with instant updates from backend
 */

export default function SDMProgressMonitor({ runId, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('queued');
  const [message, setMessage] = useState('Initializing...');
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!runId) return;

    const eventSource = new EventSource(
      `/sdmProgressCallback?runId=${runId}`
    );

    eventSource.onopen = () => {
      console.log('✓ Connected to progress stream');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'progress':
            setProgress(data.progress_pct || 0);
            setStatus(data.status);
            setMessage(data.progress_message);
            if (data.metrics) setMetrics(data.metrics);
            break;

          case 'complete':
            setStatus(data.status);
            setProgress(100);
            setMessage(`Model ${data.status === 'completed' ? 'complete' : 'failed'}`);
            setMetrics(data.metrics);
            eventSource.close();
            onComplete?.(data);
            break;

          case 'error':
            setError(data.message);
            eventSource.close();
            break;

          case 'connected':
            console.log('Connected to SDM progress stream');
            break;

          default:
            console.log('Progress update:', data);
        }
      } catch (e) {
        console.error('Failed to parse progress message:', e);
      }
    };

    eventSource.onerror = () => {
      console.warn('Progress stream error, falling back to polling');
      eventSource.close();
      // Fallback to polling if SSE fails
      startPolling();
    };

    return () => eventSource.close();
  }, [runId, onComplete]);

  // Fallback polling mechanism
  const startPolling = () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/sdmProgressCallback?runId=${runId}`
        );
        const data = await response.json();

        setProgress(data.progress_pct || 0);
        setStatus(data.status);
        setMessage(data.progress_message);
        if (data.metrics) setMetrics(data.metrics);

        if (['completed', 'failed'].includes(data.status)) {
          clearInterval(interval);
          onComplete?.(data);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const getStatusIcon = () => {
    if (status === 'completed') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (status === 'failed') return <XCircle className="w-5 h-5 text-red-600" />;
    return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-semibold text-slate-800">{message}</span>
        </div>
        <span className="text-sm text-slate-500">{progress}%</span>
      </div>

      <Progress value={progress} className="h-2" />

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-blue-50 p-2 rounded">
            <div className="text-blue-900 font-semibold">AUC</div>
            <div className="text-blue-700">{metrics.auc?.toFixed(3)}</div>
          </div>
          <div className="bg-green-50 p-2 rounded">
            <div className="text-green-900 font-semibold">TSS</div>
            <div className="text-green-700">{metrics.tss?.toFixed(3)}</div>
          </div>
          <div className="bg-purple-50 p-2 rounded">
            <div className="text-purple-900 font-semibold">Kappa</div>
            <div className="text-purple-700">{metrics.kappa?.toFixed(3)}</div>
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div className="text-sm text-green-700 bg-green-50 p-3 rounded flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Model training complete! Results ready for review.
        </div>
      )}
    </div>
  );
}