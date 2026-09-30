import React from 'react';
import {
  Shield,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Zap,
  Play,
  History,
  AlertTriangle,
  Server,
  Layers,
  FileCheck
} from 'lucide-react';
import { ReadinessResponse, SandboxConfig } from '../types';

interface HeaderProps {
  readiness: ReadinessResponse | null;
  config: SandboxConfig | null;
  onReset: () => void;
  onRunDemoA: () => void;
  onRunDemoB: () => void;
  onOpenHistory: () => void;
  onExportAudit: () => void;
  onSelectScenario: (id: number) => void;
  disabled: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  readiness,
  config,
  onReset,
  onRunDemoA,
  onRunDemoB,
  onOpenHistory,
  onExportAudit,
  onSelectScenario,
  disabled
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wider text-slate-100 font-mono">
                CLOUDMEND
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                v2.4 Autonomous
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous cloud security remediation with zero workflow regression
            </p>
          </div>
        </div>

        {/* Center: System Status & Scenario Select */}
        <div className="flex flex-wrap items-center gap-2">
          {/* AI Mode Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <Sparkles className={`w-3.5 h-3.5 ${readiness?.gemini_available ? 'text-cyan-400 animate-pulse' : 'text-amber-400'}`} />
            <span className="text-slate-400">AI:</span>
            <span className={readiness?.gemini_available ? 'text-cyan-300 font-semibold' : 'text-amber-300 font-medium'}>
              {readiness?.ai_mode || 'Deterministic Agent'}
            </span>
          </div>

          {/* Sandbox Engine Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Engine:</span>
            <span className="text-emerald-400">RustFS + Gateway</span>
          </div>

          {/* Scenario Selector */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={config?.scenario_id || 3}
              onChange={e => onSelectScenario(parseInt(e.target.value, 10))}
              disabled={disabled}
              className="bg-transparent text-slate-200 outline-none cursor-pointer pr-1"
            >
              <option value={1} className="bg-slate-900 text-slate-200">Scenario 1: Gateway Vulnerable</option>
              <option value={2} className="bg-slate-900 text-slate-200">Scenario 2: Storage Bucket Public</option>
              <option value={3} className="bg-slate-900 text-slate-200">Scenario 3: Self-Healing Recovery</option>
              <option value={4} className="bg-slate-900 text-slate-200">Scenario 4: Overly Restrictive</option>
              <option value={5} className="bg-slate-900 text-slate-200">Scenario 5: Combined Misconfig</option>
            </select>
          </div>
        </div>

        {/* Right: Quick Demo & Control Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Demo A: Successful Remediation */}
          <button
            onClick={onRunDemoA}
            disabled={disabled}
            title="Deterministic Demo A: Storage Bucket Remediation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-medium transition disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>DEMO: STORAGE FIX</span>
          </button>

          {/* Demo B: Self-Healing */}
          <button
            onClick={onRunDemoB}
            disabled={disabled}
            title="Headline Demo B: Candidate Regression + Auto Rollback + Self-Healing"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/40 hover:to-blue-600/40 text-cyan-200 border border-cyan-500/50 text-xs font-mono font-semibold shadow-md shadow-cyan-950/50 transition disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>DEMO: SELF-HEALING</span>
          </button>

          {/* Reset Sandbox */}
          <button
            onClick={onReset}
            disabled={disabled}
            title="Reset sandbox to vulnerable baseline"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono transition disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">RESET</span>
          </button>

          {/* Run History */}
          <button
            onClick={onOpenHistory}
            title="Inspect historical remediation runs and audit reports"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono transition"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">HISTORY</span>
          </button>

          {/* Export Audit Report */}
          <button
            onClick={onExportAudit}
            title="Export official compliance audit report (JSON or PDF)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-mono font-semibold transition shadow-sm shadow-cyan-950"
          >
            <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="whitespace-nowrap">EXPORT AUDIT REPORT</span>
          </button>
        </div>
      </div>
    </header>
  );
};
