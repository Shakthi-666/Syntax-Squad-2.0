import React, { useState } from 'react';
import {
  GitCommit,
  ArrowRight,
  RotateCcw,
  Check,
  Copy,
  Sparkles,
  Layers,
  FileCode
} from 'lucide-react';
import { SandboxConfig, Snapshot } from '../types';

interface ConfigDiffViewerProps {
  beforeConfig: SandboxConfig | null;
  afterConfig: SandboxConfig | null;
  latestSnapshot?: Snapshot | null;
  rollbackOccurred?: boolean;
}

export const ConfigDiffViewer: React.FC<ConfigDiffViewerProps> = ({
  beforeConfig,
  afterConfig,
  latestSnapshot,
  rollbackOccurred
}) => {
  const [copied, setCopied] = useState(false);

  // Build readable diff lines
  const beforeJson = beforeConfig ? JSON.stringify(beforeConfig, null, 2) : '// No baseline captured';
  const afterJson = afterConfig ? JSON.stringify(afterConfig, null, 2) : '// Awaiting remediation';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(
      `--- BEFORE ---\n${beforeJson}\n\n+++ AFTER +++\n${afterJson}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract key config differences for high-level bullet summary
  const beforeStoragePublic = beforeConfig?.storage?.public_read;
  const afterStoragePublic = afterConfig?.storage?.public_read;

  const beforeGatewayAnon = beforeConfig?.gateway?.routes?.find(r => r.path === '/api/records')?.allow_anonymous;
  const afterGatewayAnon = afterConfig?.gateway?.routes?.find(r => r.path === '/api/records')?.allow_anonymous;

  const beforeGatewayBlock = beforeConfig?.gateway?.routes?.find(r => r.path === '/api/records')?.block_all;
  const afterGatewayBlock = afterConfig?.gateway?.routes?.find(r => r.path === '/api/records')?.block_all;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur-md shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-2">
              <span>CONFIG MUTATION DIFF</span>
              {latestSnapshot && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-indigo-900/60 font-mono">
                  {latestSnapshot.revision} ({latestSnapshot.hash})
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-400">
              Immutable pre-mutation snapshot vs verified least-privilege state
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rollbackOccurred && (
            <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[11px] font-mono flex items-center gap-1 font-semibold animate-pulse">
              <RotateCcw className="w-3 h-3" />
              AUTO ROLLBACK RECORDED
            </span>
          )}

          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-mono flex items-center gap-1 transition"
            title="Copy diff to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Key Diff Highlight Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 font-mono text-xs">
          <div className="text-[10px] uppercase text-rose-400 font-bold mb-1 flex items-center gap-1">
            <span>[-] BEFORE MUTATION</span>
          </div>
          <div className="space-y-0.5 text-slate-400 text-[11px]">
            <div>Storage PublicRead: <span className={beforeStoragePublic ? 'text-rose-400 font-bold' : 'text-slate-300'}>{String(beforeStoragePublic)}</span></div>
            <div>/api/records Anonymous: <span className={beforeGatewayAnon ? 'text-rose-400 font-bold' : 'text-slate-300'}>{beforeGatewayAnon ? 'ALLOW (200)' : 'DENY (401)'}</span></div>
            <div>/api/records BlanketBlock: <span className="text-slate-300">{String(beforeGatewayBlock || false)}</span></div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-emerald-950/50 font-mono text-xs">
          <div className="text-[10px] uppercase text-emerald-400 font-bold mb-1 flex items-center gap-1">
            <span>[+] AFTER MUTATION (CALIBRATED)</span>
          </div>
          <div className="space-y-0.5 text-slate-400 text-[11px]">
            <div>Storage PublicRead: <span className={afterStoragePublic ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{String(afterStoragePublic)}</span></div>
            <div>/api/records Anonymous: <span className={afterGatewayAnon ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{afterGatewayAnon ? 'ALLOW (200)' : 'DENY (401/403)'}</span></div>
            <div>Authorized Analyst: <span className="text-emerald-400 font-bold">ALLOW (200)</span></div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Code Diffs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Baseline (Before) */}
        <div>
          <div className="text-[11px] font-mono text-slate-400 mb-1 flex items-center justify-between">
            <span className="text-rose-400">BASELINE REVISION (SNAPSHOT)</span>
            <span>JSON</span>
          </div>
          <pre className="p-3 rounded-lg bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800/80 leading-relaxed scrollbar-thin">
            {beforeJson}
          </pre>
        </div>

        {/* Hardened (After) */}
        <div>
          <div className="text-[11px] font-mono text-slate-400 mb-1 flex items-center justify-between">
            <span className="text-emerald-400">HARDENED CONFIGURATION</span>
            <span>JSON</span>
          </div>
          <pre className="p-3 rounded-lg bg-slate-950 text-emerald-300/90 font-mono text-[11px] overflow-x-auto max-h-48 border border-emerald-950/50 leading-relaxed scrollbar-thin">
            {afterJson}
          </pre>
        </div>
      </div>
    </div>
  );
};
