import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Code,
  CheckCircle,
  BookOpen,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import { SecurityFinding } from '../types';

interface FindingCardProps {
  finding: SecurityFinding | null;
  onViewEvidenceModal?: () => void;
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding, onViewEvidenceModal }) => {
  const [showConfig, setShowConfig] = useState(false);

  if (!finding) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-center backdrop-blur-sm">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <CheckCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-mono font-bold text-slate-200">
          NO UNRESOLVED SECURITY FINDINGS
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Synthetic infrastructure is hardened against anonymous access. Legitimate application routes remain authorized and verified.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-rose-900/60 rounded-xl p-4 sm:p-5 backdrop-blur-md shadow-lg shadow-rose-950/20 relative overflow-hidden">
      {/* Top Banner with Severity */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1.5 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            CRITICAL
          </span>
          <span className="text-xs font-mono text-slate-400">ID: {finding.id}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Resource:</span>
          <code className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800">
            {finding.resource}
          </code>
        </div>
      </div>

      {/* Title & Vulnerability Summary */}
      <h3 className="text-base sm:text-lg font-bold text-slate-100 font-mono tracking-wide flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
        <span>{finding.vulnerability}</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {/* Evidence */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] font-mono uppercase text-slate-400 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>OBSERVED EVIDENCE</span>
          </div>
          <p className="text-xs text-rose-200/90 font-mono leading-relaxed">
            "{finding.evidence}"
          </p>
        </div>

        {/* Security Impact */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] font-mono uppercase text-slate-400 mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>SECURITY IMPACT</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            {finding.security_impact}
          </p>
        </div>
      </div>

      {/* AI Reasoning & RAG Knowledge */}
      <div className="mt-3 bg-slate-950/50 border border-cyan-900/40 rounded-lg p-3 space-y-2">
        {finding.ai_reasoning && (
          <div>
            <div className="text-[11px] font-mono uppercase text-cyan-400 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>AI REMEDIATION REASONING</span>
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              {finding.ai_reasoning}
            </p>
          </div>
        )}

        {/* Recommended Action */}
        <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-emerald-400 font-mono">RECOMMENDED ACTION: </span>
            {finding.recommended_remediation}
          </div>
        </div>

        {/* RAG Sources Citations */}
        {finding.rag_sources && finding.rag_sources.length > 0 && (
          <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-indigo-400" />
              RAG SOURCES:
            </span>
            {finding.rag_sources.map(src => (
              <span
                key={src.id}
                title={src.excerpt}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/50 text-indigo-300 border border-indigo-800/50"
              >
                {src.id}: {src.title}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Toggle Current Config View */}
      <div className="mt-3 flex items-center justify-between text-xs font-mono">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition"
        >
          <Code className="w-3.5 h-3.5" />
          <span>{showConfig ? 'Hide Raw Configuration' : 'Inspect Raw Vulnerable Configuration'}</span>
          {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {onViewEvidenceModal && (
          <button
            onClick={onViewEvidenceModal}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline underline-offset-2 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Forensic Evidence</span>
          </button>
        )}
      </div>

      {showConfig && (
        <pre className="mt-2 p-3 rounded-lg bg-slate-950 text-cyan-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
          {finding.current_configuration}
        </pre>
      )}
    </div>
  );
};
