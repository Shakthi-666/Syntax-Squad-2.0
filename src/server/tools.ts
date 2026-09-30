import { sandbox } from './sandbox';
import {
  SandboxConfig,
  Snapshot,
  ProbeResult,
  SecurityFinding
} from '../types';

export interface EvidenceArtifact {
  id: string;
  name: string;
  phase: string;
  timestamp: string;
  summary: string;
  data: any;
}

const evidenceStore: EvidenceArtifact[] = [];

export const SafeTools = {
  inspect_configuration: (): SandboxConfig => {
    return sandbox.getConfig();
  },

  inspect_storage_policy: (): SandboxConfig['storage'] => {
    return sandbox.getConfig().storage;
  },

  inspect_gateway_policy: (): SandboxConfig['gateway'] => {
    return sandbox.getConfig().gateway;
  },

  create_snapshot: (runId: string, description: string): Snapshot => {
    return sandbox.createSnapshot(runId, description);
  },

  apply_storage_policy: (policy: Partial<SandboxConfig['storage']>): SandboxConfig => {
    return sandbox.applyStoragePolicy(policy);
  },

  apply_gateway_policy: (policy: Partial<SandboxConfig['gateway']>): SandboxConfig => {
    return sandbox.applyGatewayPolicy(policy);
  },

  restore_snapshot: (revision: string): { success: boolean; config: SandboxConfig } => {
    return sandbox.restoreSnapshot(revision);
  },

  run_security_probe: (): ProbeResult[] => {
    const all = sandbox.runAllProbes();
    return all.filter(p => p.category === 'SECURITY');
  },

  run_application_health_probe: (): ProbeResult[] => {
    const all = sandbox.runAllProbes();
    return all.filter(p => p.category === 'APPLICATION');
  },

  capture_evidence: (phase: string, summary: string, data: any): EvidenceArtifact => {
    const artifact: EvidenceArtifact = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `evidence_${phase.toLowerCase().replace(/\s+/g, '_')}`,
      phase,
      timestamp: new Date().toISOString(),
      summary,
      data
    };
    evidenceStore.push(artifact);
    return artifact;
  },

  get_application_status: (): {
    security_status: 'EXPOSED' | 'PROTECTED';
    application_status: 'HEALTHY' | 'REGRESSED';
    finding: SecurityFinding | null;
    probes: ProbeResult[];
  } => {
    const probes = sandbox.runAllProbes();
    const secPassed = probes.filter(p => p.category === 'SECURITY').every(p => p.passed);
    const appPassed = probes.filter(p => p.category === 'APPLICATION').every(p => p.passed);
    const finding = sandbox.scanVulnerabilities();

    return {
      security_status: secPassed && !finding ? 'PROTECTED' : 'EXPOSED',
      application_status: appPassed ? 'HEALTHY' : 'REGRESSED',
      finding,
      probes
    };
  },

  get_all_evidence: (): EvidenceArtifact[] => {
    return [...evidenceStore];
  },

  clear_evidence: () => {
    evidenceStore.length = 0;
  }
};
