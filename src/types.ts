export type AgentState =
  | 'IDLE'
  | 'SCANNING'
  | 'EVIDENCE_COLLECTION'
  | 'ANALYZING'
  | 'PLANNING'
  | 'SNAPSHOT'
  | 'REMEDIATING'
  | 'VERIFYING'
  | 'REGRESSION_DETECTED'
  | 'ROLLING_BACK'
  | 'REFLECTING'
  | 'REPLANNING'
  | 'SUCCESS'
  | 'FAILED';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EventCategory =
  | 'SCAN'
  | 'EVIDENCE'
  | 'RAG'
  | 'PLAN'
  | 'SNAPSHOT'
  | 'MUTATION'
  | 'PROBE'
  | 'REGRESSION'
  | 'ROLLBACK'
  | 'REFLECTION'
  | 'REPLAN'
  | 'OUTCOME';

export interface TimelineEvent {
  id: string;
  run_id: string;
  timestamp: string;
  category: EventCategory;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  level: 'info' | 'warning' | 'error' | 'success';
}

export interface SyntheticPatientRecord {
  id: string;
  patient: string;
  diagnosis: string;
  ssn: string;
  dob: string;
  department: string;
  classification: string;
}

export interface StoragePolicy {
  bucket: string;
  public_read: boolean;
  authenticated_read: boolean;
  classification: string;
  allowed_principals: string[];
}

export interface GatewayRoutePolicy {
  path: string;
  allow_anonymous: boolean;
  required_roles: string[];
  block_all?: boolean;
}

export interface GatewayPolicy {
  service: string;
  routes: GatewayRoutePolicy[];
}

export interface SandboxConfig {
  storage: StoragePolicy;
  gateway: GatewayPolicy;
  scenario_id: number;
  scenario_name: string;
}

export interface Snapshot {
  revision: string;
  hash: string;
  timestamp: string;
  run_id: string;
  description: string;
  config: SandboxConfig;
}

export interface ProbeResult {
  id: string;
  category: 'SECURITY' | 'APPLICATION';
  name: string;
  target: string;
  identity: 'Anonymous' | 'Invalid Token' | 'Security Analyst' | 'Administrator';
  expected_status: number | string;
  actual_status: number;
  latency_ms: number;
  passed: boolean;
  details: string;
}

export interface SecurityFinding {
  id: string;
  resource: string;
  vulnerability: string;
  severity: Severity;
  evidence: string;
  affected_endpoint: string;
  current_configuration: string;
  recommended_remediation: string;
  security_impact: string;
  rag_sources?: { id: string; title: string; excerpt: string }[];
  ai_reasoning?: string;
}

export interface ConfigDiffLine {
  type: 'unchanged' | 'removed' | 'added';
  text: string;
}

export interface RemediationPlan {
  finding: string;
  risk: string;
  recommended_action: string;
  target_resource: string;
  candidate_type: 'storage_least_privilege' | 'gateway_least_privilege' | 'overly_restrictive_blanket';
  rollback_required: boolean;
  verification_required: boolean;
  reason: string;
}

export interface RunRecord {
  run_id: string;
  timestamp: string;
  scenario_name: string;
  mode: 'standard' | 'self_healing';
  finding: SecurityFinding | null;
  initial_config: SandboxConfig;
  candidate_config?: SandboxConfig;
  final_config: SandboxConfig;
  snapshots: Snapshot[];
  remediation_attempts: number;
  verification_results: ProbeResult[];
  rollback_occurred: boolean;
  rollback_reason?: string;
  final_outcome: 'SUCCESS' | 'FAILED' | 'STOPPED';
  elapsed_ms: number;
  model_used: string;
  events: TimelineEvent[];
  diff: {
    before_json: string;
    after_json: string;
  };
}

export interface RAGSource {
  id: string;
  title: string;
  category: string;
  rule: string;
  recommendation: string;
}

export interface ReadinessResponse {
  ready: boolean;
  ai_mode: string;
  gemini_available: boolean;
  sandbox_ready: boolean;
  rustfs_storage_ready: boolean;
  gateway_ready: boolean;
  timestamp: string;
}

export interface StatusResponse {
  state: AgentState;
  active_run_id: string | null;
  current_scenario: {
    id: number;
    name: string;
    description: string;
  };
  security_status: 'EXPOSED' | 'PROTECTED';
  application_status: 'HEALTHY' | 'REGRESSED';
  finding: SecurityFinding | null;
  active_probes: ProbeResult[];
  latest_snapshot: Snapshot | null;
  recent_events: TimelineEvent[];
  config_state: SandboxConfig;
}
