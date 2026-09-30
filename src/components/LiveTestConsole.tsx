import React, { useState } from 'react';
import {
  Send,
  Terminal,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  Code
} from 'lucide-react';

interface LiveTestConsoleProps {
  onProbeExecute?: () => void;
}

export const LiveTestConsole: React.FC<LiveTestConsoleProps> = ({ onProbeExecute }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/records');
  const [selectedIdentity, setSelectedIdentity] = useState<'anonymous' | 'invalid' | 'analyst' | 'admin'>('anonymous');
  const [loading, setLoading] = useState<boolean>(false);
  const [lastResponse, setLastResponse] = useState<{
    status_code: number;
    latency_ms: number;
    body: any;
    timestamp: string;
  } | null>(null);

  const tokenMap: Record<string, string | undefined> = {
    anonymous: undefined,
    invalid: 'token-invalid-99',
    analyst: 'token-analyst-449',
    admin: 'token-admin-901'
  };

  const handleSendProbe = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/probe/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: selectedEndpoint,
          token: tokenMap[selectedIdentity]
        })
      });
      const data = await res.json();
      setLastResponse(data);
      if (onProbeExecute) onProbeExecute();
    } catch (err: any) {
      setLastResponse({
        status_code: 500,
        latency_ms: 0,
        body: { error: err.message || 'Request failed' },
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur-md shadow-md">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-mono font-bold text-slate-200 uppercase">
            LIVE FORENSIC PROBER CONSOLE
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
          Manual Test
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {/* Identity Selector */}
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
            Simulate Identity
          </label>
          <select
            value={selectedIdentity}
            onChange={e => setSelectedIdentity(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
          >
            <option value="anonymous">Anonymous (No Credentials)</option>
            <option value="invalid">Invalid Token (token-invalid-99)</option>
            <option value="analyst">Security Analyst (token-analyst-449)</option>
            <option value="admin">Administrator (token-admin-901)</option>
          </select>
        </div>

        {/* Endpoint Selector */}
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
            Target Endpoint / Resource
          </label>
          <select
            value={selectedEndpoint}
            onChange={e => setSelectedEndpoint(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
          >
            <option value="/api/records">/api/records (Patient Charts)</option>
            <option value="/health">/health (Uptime Health Check)</option>
            <option value="/api/admin">/api/admin (Admin Operations Plane)</option>
            <option value="/api/storage/bucket/cloudmend-private-records/patient-records/SYN-REC-1001.json">
              RustFS S3 Bucket: SYN-REC-1001.json
            </option>
          </select>
        </div>
      </div>

      <button
        onClick={handleSendProbe}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-98 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold tracking-wider transition disabled:opacity-50"
      >
        <Send className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        <span>{loading ? 'DISPATCHING PROBE...' : 'SEND LIVE HTTP PROBE'}</span>
      </button>

      {/* Response Panel */}
      {lastResponse && (
        <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                  lastResponse.status_code === 200
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : lastResponse.status_code === 401 || lastResponse.status_code === 403
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                HTTP {lastResponse.status_code}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {lastResponse.latency_ms}ms
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              {new Date(lastResponse.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <pre className="text-[11px] text-slate-300 overflow-x-auto max-h-36 scrollbar-thin">
            {JSON.stringify(lastResponse.body, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
