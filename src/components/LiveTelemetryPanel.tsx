import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Server,
  Database,
  Cpu,
  ShieldAlert,
  HardDrive,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowUpRight,
  Radio
} from 'lucide-react';

export interface TelemetryData {
  timestamp: string;
  requests_per_min: number;
  latency_ms: number;
  cpu_percent: number;
  memory_percent: number;
  error_rate: number;
  blocked_requests: number;
  security_events: number;
  storage_reads: number;
  unauthorized_attempts: number;
  risk_score: number;
  health_status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  resources: {
    gateway: { status: string; requests: number; latency: number; blocked: number; unauthorized: number };
    api: { status: string; requests: number; errors: number; responseTime: number };
    storage: { status: string; reads: number; publicReads: number; denied: number };
    database: { status: string; connections: number; latency: number };
    worker: { status: string; cpu: number; memory: number; tasks: number };
  };
}

export interface TelemetryPoint {
  id: number;
  timestamp: string;
  resource_id: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  status: string;
}

interface LiveTelemetryPanelProps {
  onOpenDbExplorer: () => void;
  onOpenSandboxExplorer: () => void;
  onOpenSyntheticData: () => void;
}

export const LiveTelemetryPanel: React.FC<LiveTelemetryPanelProps> = ({
  onOpenDbExplorer,
  onOpenSandboxExplorer,
  onOpenSyntheticData
}) => {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [prevRequests, setPrevRequests] = useState<number>(135);
  const [prevLatency, setPrevLatency] = useState<number>(46);
  const [prevCpu, setPrevCpu] = useState<number>(36);

  // Poll backend telemetry every 1.5 seconds
  useEffect(() => {
    let isMounted = true;

    const fetchTelemetry = async () => {
      try {
        const [latestRes, historyRes] = await Promise.all([
          fetch('/api/telemetry/latest'),
          fetch('/api/telemetry/history?limit=30')
        ]);

        if (latestRes.ok && isMounted) {
          const data: TelemetryData = await latestRes.json();
          setTelemetry(current => {
            if (current) {
              setPrevRequests(current.requests_per_min);
              setPrevLatency(current.latency_ms);
              setPrevCpu(current.cpu_percent);
            }
            return data;
          });
        }

        if (historyRes.ok && isMounted) {
          const hist: TelemetryPoint[] = await historyRes.json();
          setHistory(hist);
        }
      } catch (e) {
        // Silently handle transient poll errors
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Compute sparkline points for specific metrics
  const getMetricHistory = (metricName: string): number[] => {
    const points = history.filter(p => p.metric_name === metricName).map(p => p.metric_value);
    if (points.length < 5) {
      // Fallback sensible values if history is just starting
      return [35, 38, 42, 40, 37, 44, 42];
    }
    return points.slice(-20);
  };

  const riskHistory = getMetricHistory('risk_score');
  const healthHistory = getMetricHistory('health_status');
  const reqHistory = getMetricHistory('request_count');
  const latencyHistory = getMetricHistory('latency_ms');

  // Sparkline SVG helper
  const renderSparkline = (data: number[], color: string, height: number = 32, maxVal?: number, minVal?: number) => {
    if (!data || data.length === 0) return null;
    const min = minVal !== undefined ? minVal : Math.min(...data);
    const max = maxVal !== undefined ? maxVal : Math.max(...data);
    const range = max - min || 1;
    const width = 120;
    const step = width / (data.length - 1 || 1);

    const points = data
      .map((val, idx) => {
        const x = idx * step;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {/* Render final point glowing dot */}
        {data.length > 0 && (
          <circle
            cx={(data.length - 1) * step}
            cy={height - ((data[data.length - 1] - min) / range) * (height - 6) - 3}
            r="3"
            fill={color}
          />
        )}
      </svg>
    );
  };

  // Render Dual-Line Graph (Security Risk vs Application Health)
  const renderDualLineGraph = () => {
    const width = 360;
    const height = 90;
    const pointsCount = Math.max(riskHistory.length, healthHistory.length, 10);
    const step = width / (pointsCount - 1 || 1);

    const riskPoints = riskHistory.map((val, idx) => {
      const x = idx * step;
      const y = height - (val / 100) * (height - 16) - 8;
      return `${x},${y}`;
    }).join(' ');

    const healthPoints = healthHistory.map((val, idx) => {
      const x = idx * step;
      const y = height - (val / 100) * (height - 16) - 8;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="relative w-full h-[95px] flex items-center justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Subtle grid lines */}
          <line x1="0" y1="20" x2={width} y2="20" stroke="#1e293b" strokeDasharray="3 3" />
          <line x1="0" y1="50" x2={width} y2="50" stroke="#1e293b" strokeDasharray="3 3" />
          <line x1="0" y1="80" x2={width} y2="80" stroke="#1e293b" strokeDasharray="3 3" />

          {/* Security Risk Line (Rose / Crimson) */}
          {riskPoints && (
            <polyline
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={riskPoints}
            />
          )}

          {/* Application Health Line (Cyan / Emerald) */}
          {healthPoints && (
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={healthPoints}
            />
          )}
        </svg>
      </div>
    );
  };

  const riskScore = telemetry?.risk_score ?? 78;
  const healthStatus = telemetry?.health_status ?? 'HEALTHY';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4 font-mono">
      {/* Top Banner: Title & Simulated Environment Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                LIVE CLOUD TELEMETRY
              </h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE SIMULATION
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Continuous synthetic metrics persisted to local SQLite database (data/cloudmend.db)
            </p>
          </div>
        </div>

        {/* Quick Explorer Shortcut Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSandboxExplorer}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition"
            title="Inspect active sandbox configuration and revisions"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>SANDBOX</span>
          </button>

          <button
            onClick={onOpenDbExplorer}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition"
            title="Inspect SQLite tables, row counts, and sample records"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>DB EXPLORER</span>
          </button>

          <button
            onClick={onOpenSyntheticData}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition"
            title="View synthetic confidential patient records"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>RECORDS</span>
          </button>
        </div>
      </div>

      {/* Primary Metric Grid (10 Core Synthetic Telemetry Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Metric 1: Requests/min */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>REQUESTS</span>
            <Radio className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-100">
              {telemetry?.requests_per_min ?? 135}
            </span>
            <span className="text-[10px] text-slate-500">/min</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Delta</span>
            <span className={telemetry && telemetry.requests_per_min >= prevRequests ? 'text-emerald-400 flex items-center' : 'text-slate-400 flex items-center'}>
              {telemetry ? `${telemetry.requests_per_min - prevRequests >= 0 ? '+' : ''}${telemetry.requests_per_min - prevRequests}` : '0'}
            </span>
          </div>
        </div>

        {/* Metric 2: Latency ms */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>LATENCY</span>
            <Zap className="w-3 h-3 text-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-xl font-extrabold ${telemetry && telemetry.latency_ms > 150 ? 'text-rose-400' : 'text-slate-100'}`}>
              {telemetry?.latency_ms ?? 46}
            </span>
            <span className="text-[10px] text-slate-500">ms</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">P95</span>
            <span className="text-slate-400">~{Math.round((telemetry?.latency_ms ?? 46) * 1.3)}ms</span>
          </div>
        </div>

        {/* Metric 3: CPU % */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>CPU UTIL</span>
            <Cpu className="w-3 h-3 text-indigo-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-100">
              {telemetry?.cpu_percent ?? 36}
            </span>
            <span className="text-[10px] text-slate-500">%</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Worker</span>
            <span className="text-emerald-400">NOMINAL</span>
          </div>
        </div>

        {/* Metric 4: Memory % */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>MEMORY</span>
            <Server className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-100">
              {telemetry?.memory_percent ?? 59}
            </span>
            <span className="text-[10px] text-slate-500">%</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Heap</span>
            <span className="text-slate-400">Stable</span>
          </div>
        </div>

        {/* Metric 5: Error Rate % */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>ERROR RATE</span>
            <AlertTriangle className={`w-3 h-3 ${telemetry && telemetry.error_rate > 10 ? 'text-rose-400' : 'text-slate-400'}`} />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-xl font-extrabold ${telemetry && telemetry.error_rate > 10 ? 'text-rose-400' : 'text-slate-100'}`}>
              {telemetry?.error_rate ?? 1.2}
            </span>
            <span className="text-[10px] text-slate-500">%</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Status</span>
            <span className={telemetry && telemetry.error_rate > 10 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {telemetry && telemetry.error_rate > 10 ? 'DEGRADED' : 'HEALTHY'}
            </span>
          </div>
        </div>

        {/* Metric 6: Blocked Requests */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>BLOCKED REQS</span>
            <ShieldAlert className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-cyan-300">
              {telemetry?.blocked_requests ?? 18}
            </span>
            <span className="text-[10px] text-slate-500">flt</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Perimeter</span>
            <span className="text-slate-400">Active</span>
          </div>
        </div>

        {/* Metric 7: Security Events */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>SEC EVENTS</span>
            <ShieldAlert className="w-3 h-3 text-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-amber-300">
              {telemetry?.security_events ?? 4}
            </span>
            <span className="text-[10px] text-slate-500">logged</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Audit DB</span>
            <span className="text-slate-400">SQLite</span>
          </div>
        </div>

        {/* Metric 8: Storage Reads */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>STORAGE READS</span>
            <HardDrive className="w-3 h-3 text-teal-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-100">
              {telemetry?.storage_reads ?? 58}
            </span>
            <span className="text-[10px] text-slate-500">/min</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Public:</span>
            <span className={telemetry && telemetry.resources.storage.publicReads > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {telemetry?.resources.storage.publicReads ?? 0}
            </span>
          </div>
        </div>

        {/* Metric 9: Unauthorized Attempts */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>UNAUTHORIZED</span>
            <ShieldAlert className={`w-3 h-3 ${telemetry && telemetry.unauthorized_attempts > 5 ? 'text-rose-400' : 'text-slate-400'}`} />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-xl font-extrabold ${telemetry && telemetry.unauthorized_attempts > 5 ? 'text-rose-400' : 'text-slate-100'}`}>
              {telemetry?.unauthorized_attempts ?? 6}
            </span>
            <span className="text-[10px] text-slate-500">hits</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Severity</span>
            <span className={telemetry && telemetry.unauthorized_attempts > 5 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {telemetry && telemetry.unauthorized_attempts > 5 ? 'HIGH' : 'LOW'}
            </span>
          </div>
        </div>

        {/* Metric 10: Risk Score (0-100) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>RISK SCORE</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${riskScore > 60 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {riskScore > 60 ? 'HIGH' : 'LOW'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-xl font-extrabold ${riskScore > 60 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {riskScore}
            </span>
            <span className="text-[10px] text-slate-500">/100</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${riskScore > 60 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${riskScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Middle Row: Dual-Line Graph (Security Risk vs Application Health) & Subsystem Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Security Risk vs Application Health Graph */}
        <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-200">
                SECURITY RISK VS APPLICATION HEALTH
              </span>
              <p className="text-[11px] text-slate-400 font-sans">
                Real-time correlation: Self-healing ensures risk drops to LOW without degrading application health
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-300">Security Risk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300">App Health</span>
              </div>
            </div>
          </div>

          {/* SVG Dual-Line Render */}
          <div className="pt-1">
            {renderDualLineGraph()}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/50">
            <span>Historical Telemetry Window (last 30 ticks from SQLite)</span>
            <span>Current: Risk {riskScore} • Health {healthStatus === 'HEALTHY' ? '98%' : '42%'}</span>
          </div>
        </div>

        {/* Right Col: Synthetic Resource Health Status */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/60 text-xs font-bold text-slate-200">
            <span>SYNTHETIC RESOURCES</span>
            <span className="text-[10px] text-slate-500 font-normal">SQLite tracked</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            {/* Gateway */}
            <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-900/60">
              <span className="text-slate-300">Gateway (Apex Edge)</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${telemetry?.resources.gateway.status === 'HEALTHY' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : telemetry?.resources.gateway.status === 'EXPOSED' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>
                {telemetry?.resources.gateway.status ?? 'HEALTHY'}
              </span>
            </div>

            {/* API Service */}
            <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-900/60">
              <span className="text-slate-300">API Service (Records)</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${telemetry?.resources.api.status === 'HEALTHY' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
                {telemetry?.resources.api.status ?? 'HEALTHY'}
              </span>
            </div>

            {/* Storage Bucket */}
            <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-900/60">
              <span className="text-slate-300">RustFS Storage Bucket</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${telemetry?.resources.storage.status === 'HEALTHY' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
                {telemetry?.resources.storage.status ?? 'EXPOSED'}
              </span>
            </div>

            {/* SQLite Database */}
            <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-900/60">
              <span className="text-slate-300">SQLite Database</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                CONNECTED
              </span>
            </div>

            {/* Worker Agent */}
            <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-900/60">
              <span className="text-slate-300">Autonomous Worker</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                RUNNING
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
