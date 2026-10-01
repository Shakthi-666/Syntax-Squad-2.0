import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Table,
  RefreshCw,
  HardDrive,
  Layers,
  FileText,
  Shield,
  Activity,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface TableStatus {
  name: string;
  rowCount: number;
  lastUpdated: string | null;
}

interface DatabaseStatus {
  dbPath: string;
  connected: boolean;
  sizeBytes: number;
  tables: TableStatus[];
}

interface DatabaseExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseExplorerModal: React.FC<DatabaseExplorerModalProps> = ({ isOpen, onClose }) => {
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('resources');
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/database/status');
      if (res.ok) {
        const data: DatabaseStatus = await res.json();
        setDbStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch DB status:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSample = async (tableName: string) => {
    try {
      setSelectedTable(tableName);
      const res = await fetch(`/api/database/sample/${tableName}?limit=25`);
      if (res.ok) {
        const data = await res.json();
        setSampleRows(data);
      }
    } catch (e) {
      console.error('Failed to fetch table sample:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      fetchSample('resources');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  SQLITE DATABASE EXPLORER
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  READ-ONLY SAFE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Persistent local database: <code className="text-cyan-300">{dbStatus?.dbPath || 'data/cloudmend.db'}</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchStatus();
                fetchSample(selectedTable);
              }}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
              title="Refresh database status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Database Summary Bar */}
        <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Status: <strong className="text-emerald-400">Connected</strong></span>
            </div>
            <div>
              <span>File Size: <strong className="text-slate-200">{Math.round((dbStatus?.sizeBytes || 0) / 1024)} KB</strong></span>
            </div>
            <div>
              <span>Total Tables: <strong className="text-slate-200">{dbStatus?.tables.length || 11}</strong></span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500">
            Strict Zero Arbitrary SQL Execution Policy
          </div>
        </div>

        {/* Explorer Layout: Left Table Selector, Right Data Preview */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Table List Sidebar */}
          <div className="w-full md:w-64 border-r border-slate-800 bg-slate-950/40 p-3 overflow-y-auto space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block px-2 pb-1 font-bold">
              Database Tables
            </span>
            {dbStatus?.tables.map(t => (
              <button
                key={t.name}
                onClick={() => fetchSample(t.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition ${
                  selectedTable === t.name
                    ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Table className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{t.name}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {t.rowCount}
                </span>
              </button>
            ))}
          </div>

          {/* Table Content Window */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-900/60 p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">TABLE:</span>
                <span className="text-xs font-bold text-cyan-400 uppercase">{selectedTable}</span>
                <span className="text-[10px] text-slate-500">({sampleRows.length} sample rows shown)</span>
              </div>
            </div>

            {/* Scrollable Records Table */}
            <div className="flex-1 overflow-auto mt-3 border border-slate-800 rounded-xl bg-slate-950/80 scrollbar-thin">
              {sampleRows.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No records stored yet in <code>{selectedTable}</code>
                </div>
              ) : (
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead className="bg-slate-900/90 text-slate-300 sticky top-0 border-b border-slate-800">
                    <tr>
                      {Object.keys(sampleRows[0]).map(key => (
                        <th key={key} className="px-3 py-2 font-semibold uppercase text-[10px] whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {sampleRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-900/40 transition">
                        {Object.values(row).map((val: any, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 text-slate-300 whitespace-nowrap max-w-xs truncate">
                            {typeof val === 'object' && val !== null ? (
                              <span className="text-cyan-400 font-mono text-[10px]">
                                {JSON.stringify(val).substring(0, 40)}...
                              </span>
                            ) : val === null || val === undefined ? (
                              <span className="text-slate-600 italic">null</span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-slate-400 text-[11px]">
          <span>CLI available: <code>npm run db:inspect</code> • <code>npm run db:reset</code></span>
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
