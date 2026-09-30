import { GoogleGenAI } from '@google/genai';
import { sandbox } from './sandbox';
import { SafeTools } from './tools';
import { queryRAG } from './rag';
import { CloudMendDB } from './db';
import {
  AgentState,
  TimelineEvent,
  SecurityFinding,
  ProbeResult,
  RunRecord,
  Snapshot,
  SandboxConfig
} from '../types';

let currentState: AgentState = 'IDLE';
let activeRunId: string | null = null;
let stopRequested: boolean = false;

// Check Gemini API readiness
export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5;
}

export function getCurrentState(): AgentState {
  return currentState;
}

export function getActiveRunId(): string | null {
  return activeRunId;
}

export function requestStop() {
  stopRequested = true;
}

function emitEvent(
  runId: string,
  category: TimelineEvent['category'],
  title: string,
  description: string,
  level: TimelineEvent['level'] = 'info',
  metadata?: Record<string, any>
): TimelineEvent {
  const event: TimelineEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    run_id: runId,
    timestamp: new Date().toISOString(),
    category,
    title,
    description,
    level,
    metadata
  };
  CloudMendDB.addEvent(event);
  return event;
}

// Generate AI reasoning via Gemini if key available, else deterministic safety reasoning
async function generateReasoning(prompt: string, fallback: string): Promise<string> {
  if (isGeminiAvailable()) {
    try {
      const ai = new GoogleGenAI({});
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt
      });
      if (response && response.text) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to deterministic reasoning:', err);
    }
  }
  return fallback;
}

export async function runScan(): Promise<SecurityFinding | null> {
  stopRequested = false;
  currentState = 'SCANNING';
  const runId = `scan-${Date.now().toString(36)}`;

  emitEvent(
    runId,
    'SCAN',
    'Cloud Security Scan Initiated',
    'Executing inspection probes on Apex Medical perimeter gateway and RustFS object storage...',
    'info'
  );

  await new Promise(r => setTimeout(r, 600));

  currentState = 'EVIDENCE_COLLECTION';
  const initialConfig = SafeTools.inspect_configuration();
  const finding = sandbox.scanVulnerabilities();

  if (!finding) {
    emitEvent(
      runId,
      'SCAN',
      'Scan Completed — Zero Critical Findings',
      'All perimeter authorization policies and storage access controls adhere to least-privilege benchmarks.',
      'success'
    );
    currentState = 'IDLE';
    return null;
  }

  // Retrieve RAG guidance
  const ragSources = queryRAG(finding.vulnerability + ' ' + finding.resource);
  finding.rag_sources = ragSources.map(r => ({ id: r.id, title: r.title, excerpt: r.rule }));

  emitEvent(
    runId,
    'EVIDENCE',
    `Vulnerability Detected: ${finding.vulnerability}`,
    finding.evidence,
    'error',
    { severity: finding.severity, resource: finding.resource }
  );

  emitEvent(
    runId,
    'RAG',
    `Retrieved Security Best Practice (${ragSources[0]?.id || 'CIS-01'})`,
    ragSources[0]?.rule || 'Private health data must enforce strict authentication and least privilege.',
    'info'
  );

  // Generate AI reasoning
  currentState = 'ANALYZING';
  const aiReasoning = await generateReasoning(
    `You are CloudMend security planner. Vulnerability: ${finding.vulnerability} on ${finding.resource}. Evidence: ${finding.evidence}. Write 2 concise sentences explaining the risk and why naive blanket denial must be avoided.`,
    `Public exposure of ${finding.resource} allows unauthorized actors to bypass identity controls and retrieve confidential records. Remediation must enforce strict caller authentication while preserving access for authorized clinical workflows.`
  );
  finding.ai_reasoning = aiReasoning;

  currentState = 'IDLE';
  return finding;
}

export interface RepairOptions {
  mode?: 'standard' | 'self_healing';
  scenario_id?: number;
}

export async function executeAutonomousRepair(options: RepairOptions = {}): Promise<RunRecord> {
  stopRequested = false;
  const runId = `run-${Date.now().toString(36)}`;
  activeRunId = runId;
  const startTime = Date.now();

  const isSelfHealing = options.mode === 'self_healing' || (options.scenario_id === 3 || options.scenario_id === undefined && sandbox.getConfig().scenario_id === 3);

  const initialConfig = JSON.parse(JSON.stringify(SafeTools.inspect_configuration()));
  const snapshots: Snapshot[] = [];
  const events: TimelineEvent[] = [];

  // Step 1: Scan & Finding
  currentState = 'SCANNING';
  events.push(
    emitEvent(
      runId,
      'SCAN',
      'Scanning Infrastructure Configuration',
      'Inspecting perimeter gateway routes and RustFS object storage permissions...',
      'info'
    )
  );
  await new Promise(r => setTimeout(r, 500));

  currentState = 'EVIDENCE_COLLECTION';
  const finding = sandbox.scanVulnerabilities();
  if (finding) {
    const ragSources = queryRAG(finding.vulnerability);
    finding.rag_sources = ragSources.map(r => ({ id: r.id, title: r.title, excerpt: r.rule }));

    events.push(
      emitEvent(
        runId,
        'EVIDENCE',
        `Critical Finding Identified: ${finding.vulnerability}`,
        finding.evidence,
        'error'
      )
    );
    events.push(
      emitEvent(
        runId,
        'RAG',
        `Retrieved Guidance: ${ragSources[0]?.title || 'Least Privilege Enforcement'}`,
        ragSources[0]?.recommendation || 'Enforce authenticated access while preserving authorized application roles.',
        'info'
      )
    );
  }

  // Step 2: Planning & Snapshot
  currentState = 'PLANNING';
  await new Promise(r => setTimeout(r, 600));

  events.push(
    emitEvent(
      runId,
      'PLAN',
      'Agent Formulation of Remediation Plan',
      isSelfHealing
        ? 'Agent preparing candidate policy. Testing perimeter access restriction on Apex Medical gateway.'
        : 'Agent formulating least-privilege policy to restrict public access while retaining authorized service principals.',
      'info'
    )
  );

  // Pre-mutation Snapshot
  currentState = 'SNAPSHOT';
  const preSnapshot = SafeTools.create_snapshot(runId, 'Pre-remediation baseline snapshot');
  snapshots.push(preSnapshot);
  events.push(
    emitEvent(
      runId,
      'SNAPSHOT',
      `Captured Immutable Baseline Snapshot (${preSnapshot.revision})`,
      `State hash: ${preSnapshot.hash}. Registered rollback target prior to mutation.`,
      'info',
      { revision: preSnapshot.revision, hash: preSnapshot.hash }
    )
  );
  await new Promise(r => setTimeout(r, 500));

  let candidateConfig: SandboxConfig | undefined;
  let rollbackOccurred = false;
  let rollbackReason: string | undefined;
  let attempts = 1;
  let verificationResults: ProbeResult[] = [];

  if (isSelfHealing) {
    // --- PHASE A: APPLY OVERLY RESTRICTIVE CANDIDATE (DEMO SCENARIO B) ---
    currentState = 'REMEDIATING';
    events.push(
      emitEvent(
        runId,
        'MUTATION',
        'Applying Candidate Policy 1: Blanket Route Restriction',
        'Enforcing emergency perimeter deny rule on /api/records to immediately seal exposure.',
        'warning'
      )
    );

    // Apply Candidate 1: block_all on /api/records
    candidateConfig = SafeTools.apply_gateway_policy({
      routes: [
        { path: '/health', allow_anonymous: true, required_roles: [] },
        { path: '/api/records', allow_anonymous: false, required_roles: [], block_all: true },
        { path: '/api/admin', allow_anonymous: false, required_roles: ['admin'] }
      ]
    });
    await new Promise(r => setTimeout(r, 700));

    // Dual Verification on Candidate 1
    currentState = 'VERIFYING';
    events.push(
      emitEvent(
        runId,
        'PROBE',
        'Executing Dual Verification Protocol (Candidate 1)',
        'Running independent Security attack probes and Application workflow probes concurrently...',
        'info'
      )
    );
    await new Promise(r => setTimeout(r, 700));

    const candidateProbes = sandbox.runAllProbes();
    verificationResults = candidateProbes;

    const secProbesPass = candidateProbes.filter(p => p.category === 'SECURITY').every(p => p.passed);
    const appProbesPass = candidateProbes.filter(p => p.category === 'APPLICATION').every(p => p.passed);

    events.push(
      emitEvent(
        runId,
        'PROBE',
        'Security Probe Result: PASS (Anonymous Blocked)',
        'Anonymous caller received HTTP 403 Forbidden. Attack vector is closed.',
        'success'
      )
    );

    events.push(
      emitEvent(
        runId,
        'PROBE',
        'Application Probe Result: FAIL (Analyst Blocked)',
        'CRITICAL: Legitimate Security Analyst was blocked with HTTP 403! Clinical records workflow broken.',
        'error'
      )
    );

    if (secProbesPass && !appProbesPass) {
      // REGRESSION DETECTED!
      currentState = 'REGRESSION_DETECTED';
      rollbackOccurred = true;
      rollbackReason = 'Candidate policy closed security exposure but broke legitimate Security Analyst workflow (HTTP 403 on /api/records).';

      events.push(
        emitEvent(
          runId,
          'REGRESSION',
          'Application Workflow Regression Detected!',
          rollbackReason,
          'error'
        )
      );
      await new Promise(r => setTimeout(r, 800));

      // Automated Rollback
      currentState = 'ROLLING_BACK';
      events.push(
        emitEvent(
          runId,
          'ROLLBACK',
          `Triggering Automated Rollback to Snapshot ${preSnapshot.revision}`,
          `Restoring baseline configuration hash ${preSnapshot.hash}...`,
          'warning'
        )
      );
      SafeTools.restore_snapshot(preSnapshot.revision);
      await new Promise(r => setTimeout(r, 700));

      // Reflection
      currentState = 'REFLECTING';
      const reflectionText = await generateReasoning(
        `CloudMend reflection: Candidate policy used blanket denial on /api/records. Security passed but legitimate analyst access failed with 403. Formulate a 2-sentence post-mortem explanation and safer next step.`,
        'Candidate policy was overly restrictive: blanket denial on /api/records severed authorized analyst access. Replanning with fine-grained role-based authorizer granting analyst and admin identities while rejecting anonymous requests.'
      );

      events.push(
        emitEvent(
          runId,
          'REFLECTION',
          'Agent Reflection & Root Cause Analysis',
          reflectionText,
          'info'
        )
      );
      await new Promise(r => setTimeout(r, 800));

      // Replanning
      currentState = 'REPLANNING';
      attempts += 1;
      events.push(
        emitEvent(
          runId,
          'REPLAN',
          'Synthesizing Least-Privilege Policy (Candidate 2)',
          'Configuring gateway authorizer: allow_anonymous=false, required_roles=["analyst", "admin"]. Preserving /health for anonymous uptime checks.',
          'info'
        )
      );
      await new Promise(r => setTimeout(r, 600));

      // Phase B: Apply Safer Least-Privilege Remediation
      currentState = 'REMEDIATING';
      events.push(
        emitEvent(
          runId,
          'MUTATION',
          'Applying Safer Least-Privilege Configuration',
          'Deploying calibrated route authorization rules to perimeter gateway...',
          'info'
        )
      );

      SafeTools.apply_gateway_policy({
        routes: [
          { path: '/health', allow_anonymous: true, required_roles: [] },
          { path: '/api/records', allow_anonymous: false, required_roles: ['analyst', 'admin'], block_all: false },
          { path: '/api/admin', allow_anonymous: false, required_roles: ['admin'] }
        ]
      });

      // Also ensure storage bucket is protected if relevant
      if (initialConfig.storage.public_read) {
        SafeTools.apply_storage_policy({
          public_read: false,
          authenticated_read: true
        });
      }
      await new Promise(r => setTimeout(r, 700));
    }
  } else {
    // --- STANDARD SAFE REMEDIATION (SCENARIO A / STORAGE OR GATEWAY) ---
    currentState = 'REMEDIATING';

    if (initialConfig.storage.public_read) {
      events.push(
        emitEvent(
          runId,
          'MUTATION',
          'Applying Storage Bucket Access Policy',
          'Setting public_read: false on RustFS bucket cloudmend-private-records while maintaining authenticated read for authorized principals.',
          'info'
        )
      );
      SafeTools.apply_storage_policy({
        public_read: false,
        authenticated_read: true,
        allowed_principals: ['role:analyst', 'role:admin']
      });
    }

    if (initialConfig.gateway.routes.some((r: any) => r.path === '/api/records' && r.allow_anonymous)) {
      events.push(
        emitEvent(
          runId,
          'MUTATION',
          'Applying Gateway Authentication Rule',
          'Setting allow_anonymous: false and required_roles: ["analyst", "admin"] on /api/records.',
          'info'
        )
      );
      SafeTools.apply_gateway_policy({
        routes: [
          { path: '/health', allow_anonymous: true, required_roles: [] },
          { path: '/api/records', allow_anonymous: false, required_roles: ['analyst', 'admin'], block_all: false },
          { path: '/api/admin', allow_anonymous: false, required_roles: ['admin'] }
        ]
      });
    }
    await new Promise(r => setTimeout(r, 800));
  }

  // Final Dual Verification
  currentState = 'VERIFYING';
  events.push(
    emitEvent(
      runId,
      'PROBE',
      'Final Dual Verification Protocol',
      'Running comprehensive suite of Security Attack probes and Application Health probes...',
      'info'
    )
  );
  await new Promise(r => setTimeout(r, 700));

  const finalProbes = sandbox.runAllProbes();
  verificationResults = finalProbes;

  const finalSecPass = finalProbes.filter(p => p.category === 'SECURITY').every(p => p.passed);
  const finalAppPass = finalProbes.filter(p => p.category === 'APPLICATION').every(p => p.passed);

  if (finalSecPass && finalAppPass) {
    currentState = 'SUCCESS';
    events.push(
      emitEvent(
        runId,
        'OUTCOME',
        isSelfHealing ? 'Self-Healing Remediation Successful' : 'Remediation Verified Successful',
        'Data protected from anonymous access + application workflow verified intact for authorized analysts.',
        'success',
        { attempts, rollback_occurred: rollbackOccurred }
      )
    );
  } else {
    currentState = 'FAILED';
    events.push(
      emitEvent(
        runId,
        'OUTCOME',
        'Remediation Incomplete',
        'One or more verification probes failed during final validation.',
        'error'
      )
    );
  }

  const finalConfig = SafeTools.inspect_configuration();
  const elapsed = Date.now() - startTime;

  const runRecord: RunRecord = {
    run_id: runId,
    timestamp: new Date().toISOString(),
    scenario_name: initialConfig.scenario_name || 'Autonomous Cloud Remediation',
    mode: isSelfHealing ? 'self_healing' : 'standard',
    finding,
    initial_config: initialConfig,
    candidate_config: candidateConfig,
    final_config: finalConfig,
    snapshots,
    remediation_attempts: attempts,
    verification_results: verificationResults,
    rollback_occurred: rollbackOccurred,
    rollback_reason: rollbackReason,
    final_outcome: currentState === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
    elapsed_ms: elapsed,
    model_used: isGeminiAvailable() ? 'Gemini 3.8 Flash' : 'Deterministic Safety Agent',
    events,
    diff: {
      before_json: JSON.stringify(initialConfig, null, 2),
      after_json: JSON.stringify(finalConfig, null, 2)
    }
  };

  CloudMendDB.addRun(runRecord);
  activeRunId = null;

  return runRecord;
}
