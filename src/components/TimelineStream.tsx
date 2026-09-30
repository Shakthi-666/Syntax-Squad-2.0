import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  Terminal,
  Search,
  FileSearch,
  BookOpen,
  Brain,
  Camera,
  Wrench,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  XCircle,
  Filter,
  ArrowDown
} from 'lucide-react';
import { TimelineEvent, EventCategory } from '../types';

interface TimelineStreamProps {
  events: TimelineEvent[];
  activeRunId: string | null;
}

export const TimelineStream: React.FC<TimelineStreamProps> = ({ events, activeRunId }) => {
  const [filterLevel, setFilterLevel] = useState<'all' | 'warning_error' | 'outcome'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const filteredEvents = events.filter(e => {
    if (filterLevel === 'warning_error') {
      return e.level === 'warning' || e.level === 'error';
    }
    if (filterLevel === 'outcome') {
      return e.category === 'OUTCOME' || e.category === 'REGRESSION' || e.category === 'ROLLBACK';
    }
    return true;
  });

  const getCategoryBadge = (category: EventCategory) => {
    switch (category) {
      case 'SCAN':
        return { label: '[SCAN]', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
      case 'EVIDENCE':
        return { label: '[EVIDENCE]', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      case 'RAG':
        return { label: '[RAG]', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      case 'PLAN':
        return { label: '[PLAN]', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
      case 'SNAPSHOT':
        return { label: '[SNAPSHOT]', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
      case 'MUTATION':
        return { label: '[MUTATION]', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'PROBE':
        return { label: '[PROBE]', bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30' };
      case 'REGRESSION':
        return { label: '[REGRESSION]', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/60 font-bold' };
      case 'ROLLBACK':
        return { label: '[ROLLBACK]', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold' };
      case 'REFLECTION':
        return { label: '[REFLECTION]', bg: 'bg-violet-500/20 text-violet-300 border-violet-500/40' };
      case 'REPLAN':
        return { label: '[REPLAN]', bg: 'bg-teal-500/20 text-teal-300 border-teal-500/40' };
      case 'OUTCOME':
        return { label: '[OUTCOME]', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold' };
      default:
        return { label: `[${category}]`, bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur-md shadow-md flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-mono font-bold text-slate-200 uppercase">
            AUDIT TIMELINE STREAM
          </h4>
          {activeRunId && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 animate-pulse">
              LIVE
            </span>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setFilterLevel('all')}
            className={`px-2 py-0.5 rounded text-[11px] transition ${
              filterLevel === 'all' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({events.length})
          </button>
          <button
            onClick={() => setFilterLevel('warning_error')}
            className={`px-2 py-0.5 rounded text-[11px] transition ${
              filterLevel === 'warning_error'
                ? 'bg-slate-800 text-amber-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Warnings & Regressions
          </button>
          <button
            onClick={() => setFilterLevel('outcome')}
            className={`px-2 py-0.5 rounded text-[11px] transition ${
              filterLevel === 'outcome' ? 'bg-slate-800 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Outcomes
          </button>
        </div>
      </div>

      {/* Events List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs font-mono scrollbar-thin scrollbar-thumb-slate-800"
      >
        {filteredEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center p-6">
            <div>
              <Clock className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              <span>No timeline events recorded yet. Click SCAN or AUTONOMOUS REPAIR to begin.</span>
            </div>
          </div>
        ) : (
          filteredEvents.map(evt => {
            const badge = getCategoryBadge(evt.category);
            const timeStr = new Date(evt.timestamp).toLocaleTimeString([], {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });

            return (
              <div
                key={evt.id}
                className={`p-2.5 rounded-lg border transition-all ${
                  evt.category === 'REGRESSION'
                    ? 'bg-rose-950/40 border-rose-500/60 shadow-md shadow-rose-950/30'
                    : evt.category === 'ROLLBACK'
                    ? 'bg-amber-950/40 border-amber-500/60 shadow-md shadow-amber-950/30'
                    : evt.category === 'OUTCOME' && evt.level === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                    <span className="font-semibold text-slate-200 truncate">{evt.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{timeStr}</span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed pl-1">{evt.description}</p>

                {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                  <div className="mt-1.5 pt-1 border-t border-slate-800/60 text-[10px] text-cyan-400/80 flex flex-wrap gap-2 pl-1">
                    {Object.entries(evt.metadata).map(([k, v]) => (
                      <span key={k}>
                        {k}: <code className="text-slate-300">{JSON.stringify(v)}</code>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Auto-scroll helper */}
      <div className="pt-2 mt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="truncate">Active Audit Trail: SHA-256 Validated</span>
        <button
          onClick={() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }}
          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
        >
          <ArrowDown className="w-3 h-3" />
          <span>Scroll to Latest</span>
        </button>
      </div>
    </div>
  );
};
