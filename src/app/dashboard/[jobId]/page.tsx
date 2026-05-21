'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  Circle,
  Clock,
  Car,
  BarChart3,
  LayoutDashboard,
  ExternalLink
} from 'lucide-react';

interface JobProgress {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    message: string;
    percentage: number;
  };
  error?: string;
}

export default function DashboardPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<JobProgress | null>(null);
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/vehicle/jobs/${jobId}/stream`);

    const safeParse = (data: string) => {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.error('Invalid SSE data:', error);
        setEvents(prev => [...prev.slice(-4), 'Received malformed SSE event']);
        return null;
      }
    };

    const handleProgress = (event: MessageEvent) => {
      const data = safeParse(event.data);
      if (!data) return;

      setJob(data);
      setEvents(prev => [...prev.slice(-4), data.progress?.message || 'Progress update received']);
    };

    const handleCompleted = (event: MessageEvent) => {
      const data = safeParse(event.data);
      if (!data) return;

      setJob(data);
      setEvents(prev => [...prev.slice(-4), 'Job completed successfully']);
      eventSource.close();
    };

    const handleFailed = (event: MessageEvent) => {
      const data = safeParse(event.data);
      const message = data?.error || data?.message || 'Job failed';

      setJob(prev => prev ? { ...prev, status: 'failed', error: message } : {
        status: 'failed',
        progress: { message, percentage: 0 },
        error: message,
      });
      setEvents(prev => [...prev.slice(-4), `Job failed: ${message}`]);
      eventSource.close();
    };

    eventSource.addEventListener('progress', handleProgress);
    eventSource.addEventListener('completed', handleCompleted);
    eventSource.addEventListener('failed', handleFailed);

    eventSource.onerror = () => {
      setEvents(prev => [...prev.slice(-4), 'SSE connection error']);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Clock className="w-12 h-12 text-blue-500 animate-pulse" />
          <p className="text-slate-500 font-medium">Connecting to job stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Analysis Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200">
            <span className="text-sm text-slate-500">Job ID:</span>
            <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{jobId}</code>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Progress Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Processing Status</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${job.status === 'completed' ? 'bg-green-100 text-green-700' :
                    job.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                  }`}>
                  {job.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">{job.progress?.message}</span>
                  <span className="text-blue-600 font-bold">{job.progress?.percentage || 0}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${job.progress?.percentage || 0}%` }}
                  />
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-4 pt-4">
                {[
                  { label: 'VIN Decoding', min: 20 },
                  { label: 'Market Data Retrieval', min: 50 },
                  { label: 'AI Risk Assessment', min: 80 },
                  { label: 'Final Report Generation', min: 100 },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {job.progress?.percentage >= step.min ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300" />
                    )}
                    <span className={`text-sm ${job.progress?.percentage >= step.min ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Result Card (Only visible when completed) */}
            {job.status === 'completed' && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3 mb-6">
                  <Car className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold">Vehicle Summary</h2>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Market Position</p>
                    <p className="text-lg font-semibold text-slate-900">Above Average</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Holding Cost</p>
                    <p className="text-lg font-semibold text-slate-900">$45.20 / day</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Competitor Delta</p>
                    <p className="text-lg font-semibold text-green-600">-$1,200</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Estimated Sale</p>
                    <p className="text-lg font-semibold text-slate-900">14 Days</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar / Logs */}
          <div className="space-y-6">
            <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl shadow-lg font-mono text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500 uppercase tracking-widest">Live Logs</span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </div>
              <div className="space-y-2">
                {events.map((evt, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                    <span>{evt}</span>
                  </div>
                ))}
                <div className="flex gap-2">
                  <span className="text-blue-500 italic">Listening for events...</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <h3 className="font-bold">Pro Insight</h3>
              </div>
              <p className="text-sm text-blue-100 leading-relaxed">
                Phase 1 analysis uses rule-based logic. Full AI deep-dives will be available in Phase 2.
              </p>
              <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                Learn More <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
