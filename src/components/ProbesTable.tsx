import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';
import { ProbeResult } from '../types';

interface ProbesTableProps {
  probes: ProbeResult[];
  onRevalidate?: () => void;
  isLoading?: boolean;
}

export const ProbesTable: React.FC<ProbesTableProps> = ({
  probes,
  onRevalidate,
  isLoading
}) => {
  const [filter, setFilter] = useState<'ALL' | 'SECURITY' | 'APPLICATION'>('ALL');

  const filteredProbes = probes.filter(p => {
    if (filter === 'ALL') return true;
    return p.category === filter;
  });

  const secPassed = probes.filter(p => p.category === 'SECURITY').every(p => p.passed);
  const appPassed = probes.filter(p => p.category === 'APPLICATION').every(p => p.passed);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur-md shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-mono font-bold text-slate-200 uppercase">
              DUAL VERIFICATION PROBE SUITE
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-cyan-400 font-mono border border-slate-800">
              {probes.length} Active Probes
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Independent security barrier validation + application workflow health tests
          </p>
        </div>

        {/* Filter & Revalidate */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2 py-0.5 rounded transition ${
                filter === 'ALL' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('SECURITY')}
              className={`px-2 py-0.5 rounded transition ${
                filter === 'SECURITY' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setFilter('APPLICATION')}
              className={`px-2 py-0.5 rounded transition ${
                filter === 'APPLICATION' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Application
            </button>
          </div>

          {onRevalidate && (
            <button
              onClick={onRevalidate}
              disabled={isLoading}
              title="Re-run probes against live environment"
              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-mono transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Probes Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800/80 text-[10px] uppercase text-slate-400 tracking-wider">
              <th className="pb-2 pl-2">Category</th>
              <th className="pb-2">Probe Name</th>
              <th className="pb-2">Identity / Principal</th>
              <th className="pb-2">Target Endpoint</th>
              <th className="pb-2">Expected</th>
              <th className="pb-2">Actual</th>
              <th className="pb-2">Latency</th>
              <th className="pb-2 pr-2 text-right">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredProbes.map(probe => (
              <tr
                key={probe.id}
                className={`hover:bg-slate-950/40 transition-colors ${
                  !probe.passed ? 'bg-rose-950/20' : ''
                }`}
              >
                <td className="py-2.5 pl-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      probe.category === 'SECURITY'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                    }`}
                  >
                    {probe.category}
                  </span>
                </td>
                <td className="py-2.5 font-medium text-slate-200">
                  <div>{probe.name}</div>
                  <div className="text-[10px] text-slate-400 truncate max-w-xs">{probe.details}</div>
                </td>
                <td className="py-2.5 text-slate-300">
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 text-[10px]">
                    {probe.identity}
                  </span>
                </td>
                <td className="py-2.5 text-slate-400 truncate max-w-[140px]">
                  <code className="text-[11px] text-cyan-300/80">{probe.target}</code>
                </td>
                <td className="py-2.5 text-slate-400">{probe.expected_status}</td>
                <td className="py-2.5 font-bold">
                  <span
                    className={
                      probe.passed ? 'text-emerald-400' : 'text-rose-400 animate-pulse'
                    }
                  >
                    HTTP {probe.actual_status}
                  </span>
                </td>
                <td className="py-2.5 text-slate-500">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-2.5 h-2.5" />
                    {probe.latency_ms}ms
                  </span>
                </td>
                <td className="py-2.5 pr-2 text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                      probe.passed
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                    }`}
                  >
                    {probe.passed ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        PASS
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-rose-400" />
                        FAIL
                      </>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dual Verification Summary Footer */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Security Probes:</span>
            <span className={secPassed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {secPassed ? 'ALL PASSED' : 'VULNERABILITY PRESENT'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>Application Health:</span>
            <span className={appPassed ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {appPassed ? 'ALL HEALTHY' : 'REGRESSION DETECTED'}
            </span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400">
          Remediation Criteria: Data Protected == true && Workflow Intact == true
        </span>
      </div>
    </div>
  );
};
