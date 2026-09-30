import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  AlertOctagon,
  Play,
  Search,
  Square,
  Sparkles
} from 'lucide-react';
import { AgentState } from '../types';

interface DualIndicatorsProps {
  securityStatus: 'PROTECTED' | 'EXPOSED';
  applicationStatus: 'HEALTHY' | 'REGRESSED';
  agentState: AgentState;
  onScan: () => void;
  onRepair: () => void;
  onStop: () => void;
  disabled: boolean;
}

export const DualIndicators: React.FC<DualIndicatorsProps> = ({
  securityStatus,
  applicationStatus,
  agentState,
  onScan,
  onRepair,
  onStop,
  disabled
}) => {
  const isRunning = agentState !== 'IDLE' && agentState !== 'SUCCESS' && agentState !== 'FAILED';
  const isProtected = securityStatus === 'PROTECTED';
  const isHealthy = applicationStatus === 'HEALTHY';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 backdrop-blur-md shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Dual Independent Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          {/* Indicator 1: Security Status */}
          <div
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              isProtected
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/50 text-rose-300 shadow-sm shadow-rose-950/50'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isProtected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400 animate-pulse'
              }`}
            >
              {isProtected ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                INDEPENDENT METRIC 1
              </div>
              <div className="font-extrabold text-sm sm:text-base font-mono flex items-center gap-1.5">
                <span>{isProtected ? '✓ DATA PROTECTED' : '✕ DATA EXPOSED'}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isProtected
                  ? 'Perimeter authorizers block unauthenticated data exfiltration'
                  : 'Confidential patient records accessible without authentication'}
              </p>
            </div>
          </div>

          {/* Indicator 2: Application Health */}
          <div
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              isHealthy
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/30 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-950/50'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isHealthy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400 animate-bounce'
              }`}
            >
              {isHealthy ? <Activity className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                INDEPENDENT METRIC 2
              </div>
              <div className="font-extrabold text-sm sm:text-base font-mono flex items-center gap-1.5">
                <span>{isHealthy ? '✓ APPLICATION HEALTHY' : '✕ APPLICATION REGRESSED'}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isHealthy
                  ? 'Legitimate clinician and analyst access intact & active'
                  : 'Authorized personnel blocked by over-restrictive rule! Rollback required.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Primary Autonomous Trigger Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0 lg:border-l lg:border-slate-800 lg:pl-4">
          {/* Scan Button */}
          <button
            onClick={onScan}
            disabled={isRunning || disabled}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 text-xs font-mono font-bold tracking-wide transition shadow-sm disabled:opacity-50 disabled:pointer-events-none"
          >
            <Search className="w-4 h-4 text-cyan-400" />
            <span>SCAN</span>
          </button>

          {/* Autonomous Repair Button */}
          <button
            onClick={onRepair}
            disabled={isRunning || disabled}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-slate-950 font-mono font-extrabold text-xs tracking-wider transition shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>AUTONOMOUS REPAIR</span>
          </button>

          {/* Stop Button */}
          {isRunning && (
            <button
              onClick={onStop}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-700 text-xs font-mono transition"
            >
              <Square className="w-3.5 h-3.5 fill-rose-300" />
              <span>STOP</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
