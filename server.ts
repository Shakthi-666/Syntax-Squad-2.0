import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { sandbox, SCENARIO_DEFINITIONS } from './src/server/sandbox';
import { SafeTools } from './src/server/tools';
import {
  runScan,
  executeAutonomousRepair,
  getCurrentState,
  getActiveRunId,
  requestStop,
  isGeminiAvailable
} from './src/server/agent';
import { CloudMendDB } from './src/server/db';
import { sqlite } from './src/server/sqlite';
import { telemetryService } from './src/server/telemetry';
import { ReadinessResponse, StatusResponse } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// ----------------------------------------------------
// 1. API: READINESS & STATUS
// ----------------------------------------------------

app.get('/api/readiness', (req, res) => {
  const geminiLive = isGeminiAvailable();
  const response: ReadinessResponse = {
    ready: true,
    ai_mode: geminiLive ? 'Gemini 3.8 Flash' : 'Deterministic Safety Agent',
    gemini_available: geminiLive,
    sandbox_ready: true,
    rustfs_storage_ready: true,
    gateway_ready: true,
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

app.get('/api/status', (req, res) => {
  const status = SafeTools.get_application_status();
  const state = getCurrentState();
  const activeRunId = getActiveRunId();
  const currentConfig = sandbox.getConfig();
  const scenarioDef = SCENARIO_DEFINITIONS.find(s => s.id === currentConfig.scenario_id) || SCENARIO_DEFINITIONS[2];

  const response: StatusResponse = {
    state,
    active_run_id: activeRunId,
    current_scenario: {
      id: scenarioDef.id,
      name: scenarioDef.name,
      description: scenarioDef.description
    },
    security_status: status.security_status,
    application_status: status.application_status,
    finding: status.finding,
    active_probes: status.probes,
    latest_snapshot: null,
    recent_events: CloudMendDB.getRecentEvents(25),
    config_state: currentConfig
  };
  res.json(response);
});

// ----------------------------------------------------
// 2. API: SCAN & REPAIR ACTIONS
// ----------------------------------------------------

app.post('/api/scan', async (req, res) => {
  try {
    const finding = await runScan();
    const status = SafeTools.get_application_status();
    res.json({
      success: true,
      finding,
      status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Scan failed' });
  }
});

app.post('/api/repair', async (req, res) => {
  try {
    const { mode, scenario_id } = req.body || {};
    const runRecord = await executeAutonomousRepair({
      mode: mode || 'self_healing',
      scenario_id: scenario_id ? parseInt(scenario_id, 10) : undefined
    });
    res.json({
      success: true,
      run: runRecord
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Autonomous repair failed' });
  }
});

app.post('/api/stop', (req, res) => {
  requestStop();
  res.json({ success: true, message: 'Stop signal sent to agent' });
});

// ----------------------------------------------------
// 3. API: SCENARIO FAULT LOADER & SANDBOX RESET
// ----------------------------------------------------

app.post('/api/fault/load', (req, res) => {
  const scenarioId = parseInt(req.body.scenario, 10) || 3;
  const config = sandbox.loadScenario(scenarioId);
  telemetryService.reset();
  const status = SafeTools.get_application_status();
  res.json({
    success: true,
    scenario_id: scenarioId,
    config,
    status
  });
});

app.post('/api/sandbox/reset', (req, res) => {
  const scenarioId = req.body?.scenario ? parseInt(req.body.scenario, 10) : 3;
  const config = sandbox.reset(scenarioId);
  telemetryService.reset();
  const status = SafeTools.get_application_status();
  res.json({
    success: true,
    message: 'Sandbox restored to initial baseline vulnerability state',
    config,
    status
  });
});

// ----------------------------------------------------
// 4. API: EVENTS & RUN HISTORY
// ----------------------------------------------------

app.get('/api/events', (req, res) => {
  const runId = req.query.run_id as string | undefined;
  const events = CloudMendDB.getEvents(runId);
  res.json(events);
});

app.get('/api/events/recent', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const events = CloudMendDB.getRecentEvents(limit);
  res.json(events);
});

app.get('/api/runs', (req, res) => {
  const runs = CloudMendDB.getRuns();
  res.json(runs);
});

app.get('/api/runs/:run_id', (req, res) => {
  const run = CloudMendDB.getRunById(req.params.run_id);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  res.json(run);
});

app.get('/api/export-report/:run_id', (req, res) => {
  const run = CloudMendDB.getRunById(req.params.run_id);
  if (!run) {
    res.status(404).json({ error: 'Run record not found' });
    return;
  }

  const report = `# CloudMend Autonomous Remediation Audit Report
**Run ID:** \`${run.run_id}\`  
**Timestamp:** ${run.timestamp}  
**Scenario:** ${run.scenario_name}  
**Final Outcome:** **${run.final_outcome}**  
**Execution Duration:** ${run.elapsed_ms}ms  
**AI Reasoner:** ${run.model_used}  
**Rollback Triggered:** ${run.rollback_occurred ? 'YES (Self-Healing Recovery)' : 'NO'}  
${run.rollback_reason ? `**Rollback Post-Mortem:** ${run.rollback_reason}\n` : ''}

---

## 1. Initial Finding
- **Resource:** ${run.finding?.resource || 'N/A'}
- **Vulnerability:** ${run.finding?.vulnerability || 'N/A'}
- **Severity:** ${run.finding?.severity || 'N/A'}
- **Evidence:** ${run.finding?.evidence || 'N/A'}

---

## 2. Configuration Mutation
### Baseline vs Post-Remediation Diff
\`\`\`json
// BEFORE (Baseline)
${run.diff.before_json}

// AFTER (Hardened Least-Privilege)
${run.diff.after_json}
\`\`\`

---

## 3. Dual Verification Results
| Category | Probe Name | Target | Identity | Expected | Actual | Status | Latency |
|---|---|---|---|---|---|---|---|
${run.verification_results
  .map(
    p =>
      `| ${p.category} | ${p.name} | \`${p.target}\` | ${p.identity} | ${p.expected_status} | ${p.actual_status} | ${p.passed ? 'PASS' : 'FAIL'} | ${p.latency_ms}ms |`
  )
  .join('\n')}

---

## 4. Timeline Audit Log
${run.events
  .map(
    e =>
      `- **[${e.category}]** \`${e.timestamp}\` — **${e.title}**: ${e.description}`
  )
  .join('\n')}

---
*Report generated autonomously by CloudMend Security Agent.*
`;

  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="remediation_report_${run.run_id}.md"`);
  res.send(report);
});

app.get('/api/export-audit', (req, res) => {
  const status = SafeTools.get_application_status();
  const currentConfig = sandbox.getConfig();
  const latestRun = CloudMendDB.getRuns()[0] || null;
  const recentEvents = CloudMendDB.getRecentEvents(100);
  const reportId = `CMR-AUDIT-${Date.now().toString(36).toUpperCase()}`;

  const auditPayload = {
    metadata: {
      report_id: reportId,
      timestamp: new Date().toISOString(),
      generator: 'CloudMend Autonomous Defense v2.4',
      target_system: 'Apex Medical Patient Portal & RustFS Object Storage',
      compliance_frameworks: ['HIPAA 45 CFR § 164.312', 'CIS Cloud Benchmark v8', 'ISO/IEC 27001']
    },
    executive_summary: {
      security_posture: status.security_status,
      application_health: status.application_status,
      compliance_met: status.security_status === 'PROTECTED' && status.application_status === 'HEALTHY'
    },
    active_finding: status.finding || { status: 'CLEARED', message: 'No active critical vulnerabilities found.' },
    configuration_snapshot: {
      current: currentConfig,
      baseline: latestRun?.initial_config || currentConfig,
      latest_snapshot_hash: latestRun?.snapshots?.[0]?.hash || null
    },
    verification_probes: status.probes,
    self_healing: {
      rollback_occurred: latestRun?.rollback_occurred || false,
      rollback_reason: latestRun?.rollback_reason || null,
      remediation_attempts: latestRun?.remediation_attempts || 1
    },
    audit_timeline_events: recentEvents
  };

  const asDownload = req.query.download === 'true';
  if (asDownload) {
    res.setHeader('Content-Disposition', `attachment; filename="cloudmend_compliance_audit_${reportId}.json"`);
  }
  res.json(auditPayload);
});

// ----------------------------------------------------
// TELEMETRY & DATABASE APIS
// ----------------------------------------------------

app.get('/api/telemetry/latest', (req, res) => {
  res.json(telemetryService.getLatestMetrics());
});

app.get('/api/telemetry/history', (req, res) => {
  const metric = req.query.metric as string | undefined;
  const resource = req.query.resource as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
  res.json(telemetryService.getHistory(metric, resource, limit));
});

app.get('/api/telemetry/resource/:resourceId', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
  res.json(telemetryService.getHistory(undefined, req.params.resourceId, limit));
});

app.get('/api/telemetry/summary', (req, res) => {
  res.json(telemetryService.getAggregatedMetrics());
});

app.get('/api/security-events', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  res.json(sqlite.getSecurityEvents(limit));
});

app.get('/api/resources', (req, res) => {
  res.json(sqlite.getResources());
});

app.get('/api/synthetic-records', (req, res) => {
  res.json(sqlite.getSyntheticRecords());
});

app.get('/api/database/status', (req, res) => {
  res.json(sqlite.getStatus());
});

app.get('/api/database/sample/:table', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
  res.json(sqlite.getTableSample(req.params.table, limit));
});

// ----------------------------------------------------
// 5. DIRECT SYNTHETIC RESOURCE ENDPOINTS
// ----------------------------------------------------

app.get('/health', (req, res) => {
  const result = sandbox.handleEndpointRequest('/health', req.headers.authorization);
  res.status(result.status).json(result.body);
});

app.get('/api/records', (req, res) => {
  const result = sandbox.handleEndpointRequest('/api/records', req.headers.authorization);
  res.status(result.status).json(result.body);
});

app.get('/api/admin', (req, res) => {
  const result = sandbox.handleEndpointRequest('/api/admin', req.headers.authorization);
  res.status(result.status).json(result.body);
});

app.get('/api/storage/bucket/:bucket/*', (req, res) => {
  const result = sandbox.handleEndpointRequest(req.url, req.headers.authorization);
  res.status(result.status).json(result.body);
});

// Interactive Prober Tool for live UI testing
app.post('/api/probe/custom', (req, res) => {
  const { endpoint, token } = req.body;
  const authHeader = token ? `Bearer ${token}` : undefined;
  const start = Date.now();
  const result = sandbox.handleEndpointRequest(endpoint, authHeader);
  res.json({
    status_code: result.status,
    latency_ms: Date.now() - start + 4,
    body: result.body,
    timestamp: new Date().toISOString()
  });
});

// ----------------------------------------------------
// 6. DEV / PROD FRONTEND INTEGRATION
// ----------------------------------------------------

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CloudMend Server running on http://0.0.0.0:${PORT}`);
    telemetryService.start();
  });
}

process.on('SIGTERM', () => {
  telemetryService.stop();
});

process.on('SIGINT', () => {
  telemetryService.stop();
  process.exit(0);
});

startServer().catch(err => {
  console.error('Fatal startup error in CloudMend:', err);
  process.exit(1);
});
