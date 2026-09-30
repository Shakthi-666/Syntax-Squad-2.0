import React, { useState } from 'react';
import {
  User,
  Shield,
  Server,
  Database,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock
} from 'lucide-react';
import { SandboxConfig } from '../types';

interface AccessPathDiagramProps {
  config: SandboxConfig | null;
  securityStatus: 'PROTECTED' | 'EXPOSED';
  applicationStatus: 'HEALTHY' | 'REGRESSED';
}

export const AccessPathDiagram: React.FC<AccessPathDiagramProps> = ({
  config,
  securityStatus,
  applicationStatus
}) => {
  const [selectedPersona, setSelectedPersona] = useState<'anonymous' | 'analyst' | 'admin'>('anonymous');

  // Compute live access outcomes based on config
  const recordsRoute = config?.gateway.routes.find(r => r.path === '/api/records');
  const isStoragePublic = config?.storage.public_read;

  // Evaluation for selected persona
  let gatewayOutcome: 'ALLOWED' | 'BLOCKED' | 'EXPOSED' = 'BLOCKED';
  let appOutcome: 'ALLOWED' | 'BLOCKED' | 'REGRESSED' = 'BLOCKED';
  let storageOutcome: 'ALLOWED' | 'BLOCKED' | 'EXPOSED' = 'BLOCKED';

  if (selectedPersona === 'anonymous') {
    if (recordsRoute?.allow_anonymous) {
      gatewayOutcome = 'EXPOSED';
      appOutcome = 'ALLOWED';
    } else {
      gatewayOutcome = 'BLOCKED';
      appOutcome = 'BLOCKED';
    }

    if (isStoragePublic) {
      storageOutcome = 'EXPOSED';
    } else {
      storageOutcome = 'BLOCKED';
    }
  } else if (selectedPersona === 'analyst') {
    if (recordsRoute?.block_all) {
      gatewayOutcome = 'BLOCKED';
      appOutcome = 'REGRESSED';
    } else {
      gatewayOutcome = 'ALLOWED';
      appOutcome = 'ALLOWED';
    }
    storageOutcome = 'ALLOWED';
  } else if (selectedPersona === 'admin') {
    if (recordsRoute?.block_all) {
      gatewayOutcome = 'BLOCKED';
      appOutcome = 'REGRESSED';
    } else {
      gatewayOutcome = 'ALLOWED';
      appOutcome = 'ALLOWED';
    }
    storageOutcome = 'ALLOWED';
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur-md shadow-md">
      {/* Top Header & Persona Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h4 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2">
            <span>ACCESS TOPOLOGY & PERIMETER PATHWAYS</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400">
              LIVE STATE
            </span>
          </h4>
          <p className="text-[11px] text-slate-400">
            Interactive trace of synthetic traffic through perimeter authorizer to storage
          </p>
        </div>

        {/* Persona Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setSelectedPersona('anonymous')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition ${
              selectedPersona === 'anonymous'
                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Anonymous (Attacker)
          </button>
          <button
            onClick={() => setSelectedPersona('analyst')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition ${
              selectedPersona === 'analyst'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Security Analyst
          </button>
          <button
            onClick={() => setSelectedPersona('admin')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition ${
              selectedPersona === 'admin'
                ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Administrator
          </button>
        </div>
      </div>

      {/* Access Flow Diagram Nodes */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
        {/* Node 1: Identity / Origin */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 mb-2">
            <User className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase">1. REQUEST IDENTITY</span>
          <span className="text-xs font-bold font-mono text-slate-200 mt-0.5">
            {selectedPersona === 'anonymous'
              ? 'Anonymous Client'
              : selectedPersona === 'analyst'
              ? 'Security Analyst'
              : 'System Admin'}
          </span>
          <span className="text-[10px] font-mono text-slate-400 mt-1">
            {selectedPersona === 'anonymous'
              ? 'No Bearer Token'
              : selectedPersona === 'analyst'
              ? 'token-analyst-449'
              : 'token-admin-901'}
          </span>
        </div>

        {/* Node 2: Perimeter Gateway */}
        <div
          className={`border rounded-xl p-3.5 flex flex-col items-center text-center transition-all ${
            gatewayOutcome === 'EXPOSED'
              ? 'bg-rose-950/30 border-rose-500/60'
              : gatewayOutcome === 'BLOCKED' && selectedPersona === 'anonymous'
              ? 'bg-slate-950/80 border-cyan-500/50'
              : gatewayOutcome === 'BLOCKED' && selectedPersona !== 'anonymous'
              ? 'bg-amber-950/40 border-amber-500'
              : 'bg-emerald-950/20 border-emerald-500/40'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
              gatewayOutcome === 'EXPOSED'
                ? 'bg-rose-500/20 text-rose-400'
                : gatewayOutcome === 'BLOCKED' && selectedPersona !== 'anonymous'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-cyan-500/20 text-cyan-400'
            }`}
          >
            <Shield className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase">2. PERIMETER GATEWAY</span>
          <span className="text-xs font-bold font-mono text-slate-200 mt-0.5">Apex Gateway</span>

          {/* Outcome Badge */}
          <span
            className={`mt-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              gatewayOutcome === 'EXPOSED'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500 animate-pulse'
                : gatewayOutcome === 'BLOCKED' && selectedPersona === 'anonymous'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                : gatewayOutcome === 'BLOCKED'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
            }`}
          >
            {gatewayOutcome === 'EXPOSED'
              ? '✕ UNPROTECTED (200)'
              : gatewayOutcome === 'BLOCKED' && selectedPersona === 'anonymous'
              ? '✋ BLOCKED (401/403)'
              : gatewayOutcome === 'BLOCKED'
              ? '⚠ REGRESSION (403)'
              : '✓ AUTHORIZED (200)'}
          </span>
        </div>

        {/* Node 3: Apex Application */}
        <div
          className={`border rounded-xl p-3.5 flex flex-col items-center text-center transition-all ${
            appOutcome === 'REGRESSED'
              ? 'bg-amber-950/30 border-amber-500/60'
              : appOutcome === 'ALLOWED' && selectedPersona === 'anonymous'
              ? 'bg-rose-950/20 border-rose-500/40'
              : appOutcome === 'ALLOWED'
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
              appOutcome === 'REGRESSED'
                ? 'bg-amber-500/20 text-amber-400'
                : appOutcome === 'ALLOWED'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Server className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase">3. PATIENT PORTAL API</span>
          <span className="text-xs font-bold font-mono text-slate-200 mt-0.5">/api/records</span>

          <span
            className={`mt-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              appOutcome === 'REGRESSED'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                : appOutcome === 'ALLOWED' && selectedPersona === 'anonymous'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                : appOutcome === 'ALLOWED'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            {appOutcome === 'REGRESSED'
              ? '✕ OUTAGE DETECTED'
              : appOutcome === 'ALLOWED' && selectedPersona === 'anonymous'
              ? '✕ EXPOSED TO CALLER'
              : appOutcome === 'ALLOWED'
              ? '✓ CLINICAL ACCESS OK'
              : '✋ UNREACHABLE'}
          </span>
        </div>

        {/* Node 4: RustFS Storage */}
        <div
          className={`border rounded-xl p-3.5 flex flex-col items-center text-center transition-all ${
            storageOutcome === 'EXPOSED'
              ? 'bg-rose-950/30 border-rose-500/60'
              : storageOutcome === 'ALLOWED'
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
              storageOutcome === 'EXPOSED'
                ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                : storageOutcome === 'ALLOWED'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Database className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase">4. RUSTFS S3 BUCKET</span>
          <span className="text-xs font-bold font-mono text-slate-200 mt-0.5">cloudmend-private-records</span>

          <span
            className={`mt-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              storageOutcome === 'EXPOSED'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                : storageOutcome === 'ALLOWED'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
            }`}
          >
            {storageOutcome === 'EXPOSED'
              ? '✕ PUBLICLY READABLE'
              : storageOutcome === 'ALLOWED'
              ? '✓ AUTHENTICATED'
              : '🔒 PROTECTED'}
          </span>
        </div>
      </div>

      {/* Summary Narrative */}
      <div className="mt-4 p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <div className="text-slate-300 flex items-center gap-2">
          <span className="text-cyan-400 font-bold">PERIMETER STATE:</span>
          {selectedPersona === 'anonymous' ? (
            gatewayOutcome === 'EXPOSED' ? (
              <span className="text-rose-300">
                Vulnerable — Anonymous actor can traverse perimeter and exfiltrate records without credentials.
              </span>
            ) : (
              <span className="text-emerald-300">
                Hardened — Anonymous traffic stopped at perimeter authorizer (HTTP 401 Unauthorized).
              </span>
            )
          ) : selectedPersona === 'analyst' ? (
            appOutcome === 'REGRESSED' ? (
              <span className="text-amber-300 font-bold">
                REGRESSION: Blanket deny rule severed authorized Security Analyst access!
              </span>
            ) : (
              <span className="text-emerald-300">
                Optimal: Security Analyst identity cryptographically verified; records retrieved seamlessly.
              </span>
            )
          ) : (
            <span className="text-indigo-300">
              Administrator credentials verified; full admin plane operational.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
