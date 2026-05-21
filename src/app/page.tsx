'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Send, Loader2 } from 'lucide-react';

export default function LandingPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedInput = input.trim();
    if (!trimmedInput) {
      setError("Please enter a VIN or JSON payload");
      setLoading(false);
      return;
    }

    if (trimmedInput.toLowerCase() === "undefined") {
      setError("Invalid input");
      setLoading(false);
      return;
    }

    const parseJson = (value: string) => {
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    };

    let payload: any;
    let localError: string | null = null;

    const jsonValue = parseJson(trimmedInput);
    if (jsonValue !== undefined) {
      if (typeof jsonValue === 'string') {
        localError = 'JSON payload must be an object, not a string.';
      } else if (Array.isArray(jsonValue)) {
        localError = 'JSON payload must be an object, not an array.';
      } else if (jsonValue === null || typeof jsonValue !== 'object') {
        localError = 'JSON payload must be an object.';
      } else if (jsonValue.vehicle && typeof jsonValue.vehicle === 'object') {
        payload = {
          submitted_by: jsonValue.submitted_by || 'web_user',
          timestamp: jsonValue.timestamp || new Date().toISOString(),
          ...jsonValue,
        };
      } else if (typeof jsonValue.vin === 'string' && jsonValue.vin.trim()) {
        payload = {
          submitted_by: jsonValue.submitted_by || 'web_user',
          timestamp: jsonValue.timestamp || new Date().toISOString(),
          vehicle: jsonValue,
        };
      } else {
        localError = 'JSON payload must include vehicle.vin or vehicle.make + vehicle.model + vehicle.year.';
      }
    } else if (trimmedInput.startsWith('{') || trimmedInput.startsWith('[')) {
      setError('Malformed JSON payload. Fix the JSON or enter a VIN.');
      setLoading(false);
      return;
    } else {
      payload = {
        submitted_by: 'web_user',
        timestamp: new Date().toISOString(),
        vehicle: {
          vin: trimmedInput,
        }
      };
    }

    if (localError) {
      setError(localError);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/vehicle/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `web-${Date.now()}`
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error === 'validation_error'
          ? data.details?.[0]?.message || 'Validation error'
          : 'Failed to submit vehicle');
      }

      // Redirect to dashboard with jobId
      router.push(`/dashboard/${data.job_id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Car className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900">TrueNestAuto</h1>
          <p className="text-slate-500">Enter a VIN or paste a vehicle JSON payload to start the analysis.</p>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="relative">
            <textarea
              disabled={loading}
              className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none font-mono text-sm"
              placeholder='Enter VIN (e.g., 1HGCM...) or { "vehicle": { "vin": "..." }, ... }'
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            Analyze Inventory
          </button>
        </form>

        <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-100 text-xs text-slate-400 uppercase tracking-wider font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            MarketCheck Integrated
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            AI Analysis Enabled
          </div>
        </div>
      </div>
    </div>
  );
}
