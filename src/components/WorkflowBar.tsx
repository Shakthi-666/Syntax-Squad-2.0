import React from 'react';
import {
  Search,
  FileSearch,
  Brain,
  Camera,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { AgentState } from '../types';

interface WorkflowBarProps {
  state: AgentState;
}

interface StepDef {
  key: string;
  label: string;
  states: AgentState[];
  icon: React.ReactNode;
}

export const WorkflowBar: React.FC<WorkflowBarProps> = ({ state }) => {
  const steps: StepDef[] = [
    {
      key: 'scan',
      label: 'SCAN',
      states: ['SCANNING', 'EVIDENCE_COLLECTION'],
      icon: <Search className="w-3.5 h-3.5" />
    },
    {
      key: 'analyze',
      label: 'ANALYZE & PLAN',
      states: ['ANALYZING', 'PLANNING'],
      icon: <Brain className="w-3.5 h-3.5" />
    },
    {
      key: 'snapshot',
      label: 'SNAPSHOT',
      states: ['SNAPSHOT'],
      icon: <Camera className="w-3.5 h-3.5" />
    },
    {
      key: 'remediate',
      label: 'MUTATE',
      states: ['REMEDIATING'],
      icon: <Wrench className="w-3.5 h-3.5" />
    },
    {
      key: 'verify',
      label: 'DUAL VERIFY',
      states: ['VERIFYING'],
      icon: <FileSearch className="w-3.5 h-3.5" />
    }
  ];

  const isRegressionPath = [
    'REGRESSION_DETECTED',
    'ROLLING_BACK',
    'REFLECTING',
    'REPLANNING'
  ].includes(state);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 backdrop-blur-sm shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono font-semibold tracking-wider text-slate-300">
            AUTONOMOUS STATE MACHINE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">CURRENT STATE:</span>
          <span
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              state === 'SUCCESS'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : isRegressionPath
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                : state === 'FAILED'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : state === 'IDLE'
                ? 'bg-slate-800 text-slate-300'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
            }`}
          >
            {state}
          </span>
        </div>
      </div>

      {/* Main State Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {steps.map((step, idx) => {
          const isActive = step.states.includes(state);
          const isPassed =
            state === 'SUCCESS' ||
            (idx === 0 && !['IDLE', 'SCANNING'].includes(state)) ||
            (idx === 1 && !['IDLE', 'SCANNING', 'EVIDENCE_COLLECTION', 'ANALYZING'].includes(state)) ||
            (idx === 2 && !['IDLE', 'SCANNING', 'EVIDENCE_COLLECTION', 'ANALYZING', 'PLANNING', 'SNAPSHOT'].includes(state));

          return (
            <div
              key={step.key}
              className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-mono transition-all ${
                isActive
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-900/30 ring-1 ring-cyan-500/50'
                  : isPassed
                  ? 'bg-slate-900/80 border-slate-700 text-slate-300'
                  : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
              }`}
            >
              <div
                className={`p-1 rounded ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400 animate-pulse'
                    : isPassed
                    ? 'bg-slate-800 text-emerald-400'
                    : 'bg-slate-900 text-slate-600'
                }`}
              >
                {step.icon}
              </div>
              <span className="font-semibold truncate">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Self-Healing / Rollback Branch (Visualized prominently during self-healing) */}
      {isRegressionPath && (
        <div className="mt-3 pt-2 border-t border-amber-900/40 bg-amber-950/20 rounded-lg p-2.5 border flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-amber-300 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>SELF-HEALING BRANCH TRIGGERED</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded border text-[11px] ${
                state === 'REGRESSION_DETECTED'
                  ? 'bg-rose-500/30 text-rose-300 border-rose-500 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              1. REGRESSION DETECTED
            </span>
            <span
              className={`px-2 py-0.5 rounded border text-[11px] ${
                state === 'ROLLING_BACK'
                  ? 'bg-amber-500/30 text-amber-300 border-amber-500 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              2. AUTO ROLLBACK
            </span>
            <span
              className={`px-2 py-0.5 rounded border text-[11px] ${
                state === 'REFLECTING'
                  ? 'bg-purple-500/30 text-purple-300 border-purple-500 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              3. REFLECT
            </span>
            <span
              className={`px-2 py-0.5 rounded border text-[11px] ${
                state === 'REPLANNING'
                  ? 'bg-cyan-500/30 text-cyan-300 border-cyan-500 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              4. SAFER REPLAN
            </span>
          </div>
        </div>
      )}

      {/* Outcome Banner */}
      {state === 'SUCCESS' && (
        <div className="mt-3 pt-2 border-t border-emerald-900/40 bg-emerald-950/20 rounded-lg p-2 flex items-center justify-between text-xs font-mono text-emerald-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">STATUS: REMEDIATION VERIFIED SUCCESSFUL</span>
          </div>
          <span className="text-slate-400">Security Protected + Legitimate Workflows Preserved</span>
        </div>
      )}
    </div>
  );
};
