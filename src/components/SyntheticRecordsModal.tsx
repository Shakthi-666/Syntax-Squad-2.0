import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  FileText,
  Shield,
  CheckCircle2,
  Lock,
  Code
} from 'lucide-react';

interface SyntheticRecord {
  id: number;
  record_id: string;
  patient_name: string;
  diagnosis: string;
  department: string;
  classification: string;
  created_at: string;
}

interface SyntheticRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyntheticRecordsModal: React.FC<SyntheticRecordsModalProps> = ({ isOpen, onClose }) => {
  const [records, setRecords] = useState<SyntheticRecord[]>([]);
  const [activeJsonRecord, setActiveJsonRecord] = useState<SyntheticRecord | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/synthetic-records')
        .then(res => res.json())
        .then(data => setRecords(data))
        .catch(err => console.error('Error fetching synthetic records:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  SYNTHETIC DATA VIEWER
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
                  SYNTHETIC DATA ONLY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Confidential medical charts stored in SQLite (table: <code>synthetic_records</code>)
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

        {/* Warning Banner */}
        <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[11px] text-amber-300">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">NOTICE:</span>
            <span>All records shown here are strictly fictional mock data generated for HIPAA compliance testing. Never real patient data.</span>
          </div>
          <span className="text-[10px] font-mono uppercase text-amber-400/80">READ-ONLY DEMO</span>
        </div>

        {/* Records Table */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-900/90 text-slate-300 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Record ID</th>
                  <th className="py-2.5 px-3">Patient Name</th>
                  <th className="py-2.5 px-3">Diagnosis</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono">
                {records.map(r => (
                  <tr key={r.record_id} className="hover:bg-slate-900/40 transition">
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">{r.record_id}</td>
                    <td className="py-2.5 px-3 text-slate-200">{r.patient_name}</td>
                    <td className="py-2.5 px-3 text-slate-300">{r.diagnosis}</td>
                    <td className="py-2.5 px-3 text-slate-400">{r.department}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {r.classification}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setActiveJsonRecord(r)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[10px] transition inline-flex items-center gap-1"
                      >
                        <Code className="w-3 h-3" />
                        <span>VIEW JSON</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* JSON Preview Drawer if clicked */}
          {activeJsonRecord && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-900/50 space-y-2 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-cyan-400">
                  JSON RAW PAYLOAD: {activeJsonRecord.record_id} ({activeJsonRecord.patient_name})
                </span>
                <button
                  onClick={() => setActiveJsonRecord(null)}
                  className="text-slate-400 hover:text-slate-200 text-[11px]"
                >
                  Close Preview
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-300 text-[10px] overflow-x-auto">
                {JSON.stringify(
                  {
                    id: activeJsonRecord.record_id,
                    patient: activeJsonRecord.patient_name,
                    diagnosis: activeJsonRecord.diagnosis,
                    department: activeJsonRecord.department,
                    classification: activeJsonRecord.classification,
                    ssn: '***-**-4910',
                    synthetic: true,
                    disclaimer: 'SYNTHETIC TEST RECORD - NOT REAL PATIENT DATA'
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-slate-400 text-[11px]">
          <span>Apex Medical Systems Simulated Healthcare Platform</span>
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
