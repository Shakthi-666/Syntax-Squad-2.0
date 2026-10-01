import React from 'react';
import { X, ShieldAlert, Database, FileText, Lock, CheckCircle2 } from 'lucide-react';
import { SYNTHETIC_PATIENT_RECORDS } from '../constants';

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-slate-100 uppercase">
                FORENSIC EVIDENCE & SYNTHETIC DATA ARTIFACTS
              </h3>
              <p className="text-xs text-slate-400">
                Synthetic HIPAA test records used for controlled vulnerability reproduction
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
        <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs scrollbar-thin">
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/40 text-amber-300 text-[11px] leading-relaxed">
            <span className="font-bold">SYNTHETIC ENVIRONMENT NOTICE:</span> All patient names, diagnoses, and SSNs displayed herein are purely fictional test fixtures designed for hackathon demonstration. No production or real personal data is ever accessed or stored.
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>RustFS S3 Bucket: cloudmend-private-records/patient-records/</span>
            </h4>

            <div className="space-y-3">
              {Object.entries(SYNTHETIC_PATIENT_RECORDS).map(([key, record]) => (
                <div
                  key={key}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800/60">
                    <span className="text-cyan-300 font-bold">{key}</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 text-[10px]">
                      {record.classification}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 block text-[10px]">PATIENT</span>
                      <span className="text-slate-200 font-medium">{record.patient}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">DIAGNOSIS</span>
                      <span className="text-slate-200">{record.diagnosis}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">SSN</span>
                      <span className="text-slate-200">{record.ssn}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">DEPARTMENT</span>
                      <span className="text-slate-200">{record.department}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between font-mono text-xs text-slate-400">
          <span>Engine: RustFS Synthetic S3 Protocol</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
