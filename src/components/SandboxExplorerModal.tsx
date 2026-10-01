import React from 'react';
import {
  X,
  Layers,
  Shield,
  Server,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Hash,
  Activity,
  FileCode
} from 'lucide-react';
import { SandboxConfig, StatusResponse } from '../types';

interface SandboxExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SandboxConfig | null;
  status: StatusResponse | null;
}

export const SandboxExplorerModal: React.FC<SandboxExplorerModalProps> = ({
  isOpen,
  onClose,
  config,
  status
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  SANDBOX CONFIGURATION EXPLORER
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  CONTROLLED ENVIRONMENT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Real-time active state of simulated perimeter gateway and RustFS object store
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
          {/* Status Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">CURRENT SCENARIO</span>
              <span className="text-xs font-bold text-indigo-300">
                {status?.current_scenario.name || 'Scenario 3: Self-Healing Recovery'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">SECURITY POSTURE</span>
              <span className={`text-xs font-bold ${status?.security_status === 'PROTECTED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {status?.security_status || 'EXPOSED'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">APPLICATION HEALTH</span>
              <span className={`text-xs font-bold ${status?.application_status === 'HEALTHY' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {status?.application_status || 'HEALTHY'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">AGENT WORKFLOW STATE</span>
              <span className="text-xs font-bold text-cyan-400">
                {status?.state || 'IDLE'}
              </span>
            </div>
          </div>

          {/* Gateway Configuration Panel */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Server className="w-4 h-4" />
                <span>GATEWAY ROUTING POLICY (APEX MEDICAL PORTAL)</span>
              </div>
              <span className="text-[10px] text-slate-500">Service: {config?.gateway.service}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="text-slate-400 uppercase text-[10px] border-b border-slate-800/60">
                  <tr>
                    <th className="py-2 px-3">Path</th>
                    <th className="py-2 px-3">Anonymous Access</th>
                    <th className="py-2 px-3">Required Roles</th>
                    <th className="py-2 px-3">Emergency Block</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono">
                  {config?.gateway.routes.map(r => (
                    <tr key={r.path}>
                      <td className="py-2 px-3 text-slate-200 font-bold">{r.path}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.allow_anonymous ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
                          {r.allow_anonymous ? 'ENABLED (VULNERABLE)' : 'DISABLED (SECURE)'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {r.required_roles && r.required_roles.length > 0 ? (
                          r.required_roles.map(role => (
                            <span key={role} className="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] mr-1">
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 italic">None (Public)</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {r.block_all ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            BLOCKED (REGRESSION)
                          </span>
                        ) : (
                          <span className="text-slate-500">Normal Routing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Storage Bucket Policy Panel */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <HardDrive className="w-4 h-4" />
                <span>RUSTFS S3 STORAGE POLICY</span>
              </div>
              <span className="text-[10px] text-slate-500">Bucket: {config?.storage.bucket}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">PUBLIC READ ACCESS</span>
                <span className={`text-xs font-bold ${config?.storage.public_read ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {config?.storage.public_read ? 'TRUE (VULNERABLE)' : 'FALSE (BLOCKED)'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">AUTHENTICATED READ</span>
                <span className="text-xs font-bold text-slate-200">
                  {config?.storage.authenticated_read ? 'TRUE' : 'FALSE'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">ALLOWED PRINCIPALS</span>
                <span className="text-xs font-bold text-cyan-300">
                  {config?.storage.allowed_principals?.join(', ') || 'role:analyst, role:admin'}
                </span>
              </div>
            </div>
          </div>

          {/* Raw Configuration JSON */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase">Raw Sandbox Configuration State</span>
            <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-[10px] overflow-x-auto max-h-48 border border-slate-800 scrollbar-thin">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-slate-400 text-[11px]">
          <span>Protected by CloudMend Autonomous Self-Healing Verification Engine</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
