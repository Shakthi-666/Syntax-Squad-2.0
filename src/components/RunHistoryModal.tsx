import React, { useState } from 'react';
import {
  X,
  History,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Download,
  FileText,
  ChevronRight,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { RunRecord } from '../types';

interface RunHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  runs: RunRecord[];
  onSelectRun?: (run: RunRecord) => void;
}

export const RunHistoryModal: React.FC<RunHistoryModalProps> = ({
  isOpen,
  onClose,
  runs,
  onSelectRun
}) => {
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(runs[0] || null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-slate-100 uppercase">
                REMEDIATION RUN HISTORY & AUDIT TRAIL
              </h3>
              <p className="text-xs text-slate-400">
                Persisted records of autonomous scans, candidate mutations, and verification tests
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Runs List */}
          <div className="w-full md:w-80 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/80 scrollbar-thin">
            {runs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs font-mono">
                No recorded runs yet. Trigger a scan or repair to log executions.
              </div>
            ) : (
              runs.map(run => {
                const isSelected = selectedRun?.run_id === run.run_id;
                const isSuccess = run.final_outcome === 'SUCCESS';

                return (
                  <button
                    key={run.run_id}
                    onClick={() => {
                      setSelectedRun(run);
                      if (onSelectRun) onSelectRun(run);
                    }}
                    className={`w-full text-left p-3.5 transition flex flex-col gap-1.5 font-mono ${
                      isSelected
                        ? 'bg-slate-800/90 border-l-4 border-cyan-400 text-slate-100'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate max-w-[170px]">
                        {run.scenario_name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          isSuccess
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {run.final_outcome}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{run.run_id}</span>
                      <span>{new Date(run.timestamp).toLocaleTimeString()}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      {run.rollback_occurred && (
                        <span className="flex items-center gap-0.5 text-amber-400">
                          <RotateCcw className="w-2.5 h-2.5" />
                          Rollback
                        </span>
                      )}
                      <span>Attempts: {run.remediation_attempts}</span>
                      <span>{run.elapsed_ms}ms</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Selected Run Details */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
            {selectedRun ? (
              <>
                {/* Top Action bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">RUN AUDIT:</span>
                      <code className="text-xs font-mono font-bold text-cyan-300">
                        {selectedRun.run_id}
                      </code>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          selectedRun.final_outcome === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {selectedRun.final_outcome}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Executed: {new Date(selectedRun.timestamp).toLocaleString()} • AI Reasoner: {selectedRun.model_used}
                    </div>
                  </div>

                  <a
                    href={`/api/export-report/${selectedRun.run_id}`}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-medium transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>EXPORT REPORT (.MD)</span>
                  </a>
                </div>

                {/* Rollback Details if occurred */}
                {selectedRun.rollback_occurred && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/50 text-xs font-mono">
                    <div className="flex items-center gap-2 text-amber-300 font-bold mb-1">
                      <RotateCcw className="w-4 h-4 text-amber-400" />
                      <span>AUTOMATIC ROLLBACK TRIGGERED DURING RUN</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {selectedRun.rollback_reason ||
                        'Candidate remediation caused application regression. Safe pre-mutation snapshot restored immediately.'}
                    </p>
                  </div>
                )}

                {/* Finding Summary */}
                {selectedRun.finding && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">IDENTIFIED VULNERABILITY</div>
                    <div className="font-bold text-slate-200">{selectedRun.finding.vulnerability}</div>
                    <div className="text-slate-400 text-[11px]">{selectedRun.finding.evidence}</div>
                  </div>
                )}

                {/* Probes Summary */}
                <div>
                  <h5 className="text-xs font-mono font-bold text-slate-300 uppercase mb-2">
                    DUAL VERIFICATION PROBE RESULTS ({selectedRun.verification_results.length})
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono divide-y divide-slate-800 border border-slate-800 rounded-lg">
                      <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                        <tr>
                          <th className="p-2">Target</th>
                          <th className="p-2">Identity</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Latency</th>
                          <th className="p-2 text-right">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                        {selectedRun.verification_results.map(p => (
                          <tr key={p.id}>
                            <td className="p-2 text-slate-300">{p.target}</td>
                            <td className="p-2 text-slate-400">{p.identity}</td>
                            <td className="p-2 font-bold text-cyan-300">HTTP {p.actual_status}</td>
                            <td className="p-2 text-slate-400">{p.latency_ms}ms</td>
                            <td className="p-2 text-right">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  p.passed ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {p.passed ? 'PASS' : 'FAIL'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Run Events */}
                <div>
                  <h5 className="text-xs font-mono font-bold text-slate-300 uppercase mb-2">
                    EXECUTION EVENTS TIMELINE
                  </h5>
                  <div className="space-y-1.5">
                    {selectedRun.events.map(e => (
                      <div
                        key={e.id}
                        className="p-2 rounded bg-slate-950 border border-slate-800/80 text-xs font-mono flex items-start gap-2"
                      >
                        <span className="text-[10px] text-cyan-400 shrink-0 font-bold">
                          [{e.category}]
                        </span>
                        <div className="flex-1">
                          <span className="font-semibold text-slate-200">{e.title}</span>
                          <p className="text-slate-400 text-[11px] mt-0.5">{e.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 font-mono text-xs">
                Select a run on the left to inspect its complete audit log.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
