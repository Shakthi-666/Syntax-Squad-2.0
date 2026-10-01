import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { WorkflowBar } from './components/WorkflowBar';
import { DualIndicators } from './components/DualIndicators';
import { FindingCard } from './components/FindingCard';
import { AccessPathDiagram } from './components/AccessPathDiagram';
import { ConfigDiffViewer } from './components/ConfigDiffViewer';
import { ProbesTable } from './components/ProbesTable';
import { TimelineStream } from './components/TimelineStream';
import { LiveTestConsole } from './components/LiveTestConsole';
import { RunHistoryModal } from './components/RunHistoryModal';
import { EvidenceModal } from './components/EvidenceModal';
import { ExportAuditModal } from './components/ExportAuditModal';
import { LiveTelemetryPanel } from './components/LiveTelemetryPanel';
import { DatabaseExplorerModal } from './components/DatabaseExplorerModal';
import { SandboxExplorerModal } from './components/SandboxExplorerModal';
import { SyntheticRecordsModal } from './components/SyntheticRecordsModal';
import {
  ReadinessResponse,
  StatusResponse,
  RunRecord,
  SandboxConfig,
  Snapshot
} from './types';

export default function App() {
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [evidenceOpen, setEvidenceOpen] = useState<boolean>(false);
  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [dbExplorerOpen, setDbExplorerOpen] = useState<boolean>(false);
  const [sandboxExplorerOpen, setSandboxExplorerOpen] = useState<boolean>(false);
  const [syntheticDataOpen, setSyntheticDataOpen] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);

  // Snapshot and Diff tracking
  const [beforeConfig, setBeforeConfig] = useState<SandboxConfig | null>(null);
  const [afterConfig, setAfterConfig] = useState<SandboxConfig | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<Snapshot | null>(null);
  const [rollbackOccurred, setRollbackOccurred] = useState<boolean>(false);

  // Fetch status from backend
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data: StatusResponse = await res.json();
        setStatus(data);

        // Keep baseline beforeConfig if not yet set
        if (!beforeConfig && data.config_state) {
          setBeforeConfig(data.config_state);
        }
      }
    } catch (err) {
      console.warn('Error fetching status:', err);
    }
  }, [beforeConfig]);

  // Fetch readiness and runs
  const fetchReadiness = async () => {
    try {
      const res = await fetch('/api/readiness');
      if (res.ok) {
        const data: ReadinessResponse = await res.json();
        setReadiness(data);
      }
    } catch (err) {
      console.warn('Error fetching readiness:', err);
    }
  };

  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/runs');
      if (res.ok) {
        const data: RunRecord[] = await res.json();
        setRuns(data);
      }
    } catch (err) {
      console.warn('Error fetching runs:', err);
    }
  };

  useEffect(() => {
    fetchReadiness();
    fetchStatus();
    fetchRuns();

    // Auto-poll status
    const interval = setInterval(() => {
      fetchStatus();
    }, 1200);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  // 1. Scan Action
  const handleScan = async () => {
    setLoadingAction(true);
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      await res.json();
      await fetchStatus();
      await fetchRuns();
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  // 2. Autonomous Repair Action
  const handleRepair = async (mode: 'standard' | 'self_healing' = 'self_healing', scenarioId?: number) => {
    setLoadingAction(true);
    if (status?.config_state) {
      setBeforeConfig(JSON.parse(JSON.stringify(status.config_state)));
    }
    setRollbackOccurred(false);

    try {
      const res = await fetch('/api/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, scenario_id: scenarioId })
      });
      const data = await res.json();
      if (data.run) {
        setAfterConfig(data.run.final_config);
        setBeforeConfig(data.run.initial_config);
        setRollbackOccurred(data.run.rollback_occurred);
        if (data.run.snapshots && data.run.snapshots.length > 0) {
          setLatestSnapshot(data.run.snapshots[0]);
        }
      }
      await fetchStatus();
      await fetchRuns();
    } catch (err) {
      console.error('Autonomous repair error:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  // 3. Reset Sandbox
  const handleReset = async (scenarioId: number = 3) => {
    setLoadingAction(true);
    try {
      const res = await fetch('/api/sandbox/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioId })
      });
      const data = await res.json();
      setBeforeConfig(data.config);
      setAfterConfig(null);
      setLatestSnapshot(null);
      setRollbackOccurred(false);
      await fetchStatus();
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  // 4. Select Scenario Fault
  const handleSelectScenario = async (id: number) => {
    setLoadingAction(true);
    try {
      const res = await fetch('/api/fault/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: id })
      });
      const data = await res.json();
      setBeforeConfig(data.config);
      setAfterConfig(null);
      setRollbackOccurred(false);
      await fetchStatus();
    } catch (err) {
      console.error('Fault load error:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  // 5. Demo A: Storage Bucket Remediation (Direct Success)
  const handleRunDemoA = async () => {
    await handleSelectScenario(2); // Storage Bucket Public Access
    await handleRepair('standard', 2);
  };

  // 6. Demo B: Self-Healing Remediation (Headline Demo)
  const handleRunDemoB = async () => {
    await handleSelectScenario(3); // Self-Healing Scenario
    await handleRepair('self_healing', 3);
  };

  // 7. Stop Action
  const handleStop = async () => {
    try {
      await fetch('/api/stop', { method: 'POST' });
      await fetchStatus();
    } catch (err) {
      console.error('Stop error:', err);
    }
  };

  const isRunning =
    status?.state !== undefined &&
    status.state !== 'IDLE' &&
    status.state !== 'SUCCESS' &&
    status.state !== 'FAILED';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Header
        readiness={readiness}
        config={status?.config_state || null}
        onReset={() => handleReset(status?.config_state?.scenario_id || 3)}
        onRunDemoA={handleRunDemoA}
        onRunDemoB={handleRunDemoB}
        onOpenHistory={() => setHistoryOpen(true)}
        onExportAudit={() => setAuditModalOpen(true)}
        onOpenDbExplorer={() => setDbExplorerOpen(true)}
        onOpenSandboxExplorer={() => setSandboxExplorerOpen(true)}
        onOpenSyntheticData={() => setSyntheticDataOpen(true)}
        onSelectScenario={handleSelectScenario}
        disabled={loadingAction || isRunning}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* 1. Workflow State Machine Progression Bar */}
        <WorkflowBar state={status?.state || 'IDLE'} />

        {/* 2. Top Dual Indicators & Action Bar */}
        <DualIndicators
          securityStatus={status?.security_status || 'EXPOSED'}
          applicationStatus={status?.application_status || 'HEALTHY'}
          agentState={status?.state || 'IDLE'}
          onScan={handleScan}
          onRepair={() => handleRepair('self_healing')}
          onStop={handleStop}
          disabled={loadingAction}
        />

        {/* 3. Live Simulated Cloud Telemetry (SQLite Backed) */}
        <LiveTelemetryPanel
          onOpenDbExplorer={() => setDbExplorerOpen(true)}
          onOpenSandboxExplorer={() => setSandboxExplorerOpen(true)}
          onOpenSyntheticData={() => setSyntheticDataOpen(true)}
        />

        {/* 4. Main Operational Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column (Main Remediation Canvas, 7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Finding Card */}
            <FindingCard
              finding={status?.finding || null}
              onViewEvidenceModal={() => setEvidenceOpen(true)}
            />

            {/* Access Path Topology Diagram */}
            <AccessPathDiagram
              config={status?.config_state || null}
              securityStatus={status?.security_status || 'EXPOSED'}
              applicationStatus={status?.application_status || 'HEALTHY'}
            />

            {/* Config Mutation Diff Viewer */}
            <ConfigDiffViewer
              beforeConfig={beforeConfig}
              afterConfig={afterConfig || status?.config_state || null}
              latestSnapshot={latestSnapshot}
              rollbackOccurred={rollbackOccurred}
            />

            {/* Dual Verification Probes Table */}
            <ProbesTable
              probes={status?.active_probes || []}
              onRevalidate={fetchStatus}
              isLoading={isRunning}
            />
          </div>

          {/* Right Column (Audit Stream, Prober & Telemetry, 5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Timeline Stream */}
            <TimelineStream
              events={status?.recent_events || []}
              activeRunId={status?.active_run_id || null}
            />

            {/* Live Interactive Forensic Prober */}
            <LiveTestConsole onProbeExecute={fetchStatus} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-center text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CloudMend Autonomous Defense • Protected by RustFS Sandboxing & Deterministic Dual Verification</span>
          <span>Zero Arbitrary Command Execution • ISO 27001 / HIPAA Compliance Synthetic Engine</span>
        </div>
      </footer>

      {/* Run History Drawer / Modal */}
      <RunHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        runs={runs}
      />

      {/* Forensic Evidence Modal */}
      <EvidenceModal
        isOpen={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
      />

      {/* Export Compliance Audit Modal */}
      <ExportAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        status={status}
        latestRun={runs[0] || null}
        events={status?.recent_events || []}
      />

      {/* SQLite Database Explorer Modal */}
      <DatabaseExplorerModal
        isOpen={dbExplorerOpen}
        onClose={() => setDbExplorerOpen(false)}
      />

      {/* Sandbox Configuration Explorer Modal */}
      <SandboxExplorerModal
        isOpen={sandboxExplorerOpen}
        onClose={() => setSandboxExplorerOpen(false)}
        config={status?.config_state || null}
        status={status}
      />

      {/* Synthetic Healthcare Records Modal */}
      <SyntheticRecordsModal
        isOpen={syntheticDataOpen}
        onClose={() => setSyntheticDataOpen(false)}
      />
    </div>
  );
}
