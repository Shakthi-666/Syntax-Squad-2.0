import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import {
  RunRecord,
  TimelineEvent,
  SandboxConfig,
  Snapshot,
  ProbeResult,
  SecurityFinding,
  SyntheticPatientRecord
} from '../types';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.resolve(DB_DIR, 'cloudmend.db');

export interface ResourceRow {
  id: number;
  resource_id: string;
  name: string;
  resource_type: string;
  environment: string;
  status: string;
  classification: string;
  created_at: string;
  updated_at: string;
}

export interface ConfigurationRow {
  id: number;
  resource_id: string;
  config_type: string;
  config_json: string;
  revision: string;
  config_hash: string;
  created_at: string;
  updated_at: string;
}

export interface SyntheticRecordRow {
  id: number;
  record_id: string;
  patient_name: string;
  diagnosis: string;
  department: string;
  classification: string;
  created_at: string;
}

export interface TelemetryRow {
  id: number;
  timestamp: string;
  resource_id: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  status: string;
  scenario_id: number;
}

export interface SecurityEventRow {
  id: number;
  timestamp: string;
  event_type: string;
  severity: string;
  resource_id: string;
  message: string;
  run_id: string | null;
  metadata_json: string | null;
}

export interface FindingRow {
  id: number;
  finding_id: string;
  resource: string;
  vulnerability: string;
  severity: string;
  evidence: string;
  security_impact: string;
  recommended_remediation: string;
  status: string;
  created_at: string;
}

export interface TableStatus {
  name: string;
  rowCount: number;
  lastUpdated: string | null;
}

export interface DatabaseStatus {
  dbPath: string;
  connected: boolean;
  sizeBytes: number;
  tables: TableStatus[];
}

class SQLiteDatabase {
  private db: DatabaseSync;

  constructor() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    this.db = new DatabaseSync(DB_PATH);
    this.initPragmas();
    this.createTables();
    this.seedDefaults();
  }

  private initPragmas() {
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA synchronous = NORMAL;');
  }

  private createTables() {
    // 1. resources
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        environment TEXT NOT NULL,
        status TEXT NOT NULL,
        classification TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 2. configurations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS configurations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id TEXT NOT NULL,
        config_type TEXT NOT NULL,
        config_json TEXT NOT NULL,
        revision TEXT NOT NULL,
        config_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 3. synthetic_records
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS synthetic_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id TEXT UNIQUE NOT NULL,
        patient_name TEXT NOT NULL,
        diagnosis TEXT NOT NULL,
        department TEXT NOT NULL,
        classification TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // 4. telemetry
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        unit TEXT NOT NULL,
        status TEXT NOT NULL,
        scenario_id INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_telemetry_resource ON telemetry(resource_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_telemetry_metric ON telemetry(metric_name, timestamp);
    `);

    // 5. security_events
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        message TEXT NOT NULL,
        run_id TEXT,
        metadata_json TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_security_events_time ON security_events(timestamp);
    `);

    // 6. findings
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS findings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        finding_id TEXT NOT NULL,
        resource TEXT NOT NULL,
        vulnerability TEXT NOT NULL,
        severity TEXT NOT NULL,
        evidence TEXT NOT NULL,
        security_impact TEXT,
        recommended_remediation TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // 7. remediation_runs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS remediation_runs (
        run_id TEXT PRIMARY KEY,
        scenario_name TEXT NOT NULL,
        scenario_id INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        mode TEXT NOT NULL,
        finding_json TEXT,
        initial_config_json TEXT NOT NULL,
        candidate_config_json TEXT,
        final_config_json TEXT NOT NULL,
        diff_json TEXT,
        rollback_occurred INTEGER NOT NULL,
        rollback_reason TEXT,
        final_outcome TEXT NOT NULL,
        elapsed_ms INTEGER NOT NULL,
        model_used TEXT NOT NULL,
        attempts INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_runs_timestamp ON remediation_runs(timestamp);
    `);

    // 8. remediation_attempts
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS remediation_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        candidate_number INTEGER NOT NULL,
        policy_type TEXT NOT NULL,
        description TEXT NOT NULL,
        applied_config_json TEXT NOT NULL,
        outcome TEXT NOT NULL,
        error_reason TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // 9. snapshots
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        revision TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        hash TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        config_json TEXT NOT NULL
      );
    `);

    // 10. verification_results
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS verification_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        probe_id TEXT NOT NULL,
        run_id TEXT,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        identity TEXT NOT NULL,
        target TEXT NOT NULL,
        expected_status TEXT NOT NULL,
        actual_status INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        latency_ms INTEGER NOT NULL,
        details TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
    `);

    // 11. audit_events
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        category TEXT NOT NULL,
        level TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata_json TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_audit_events_time ON audit_events(timestamp);
    `);
  }

  private seedDefaults() {
    const now = new Date().toISOString();

    // Seed resources idempotently
    const resourceCount = this.db.prepare('SELECT count(*) as cnt FROM resources').get() as { cnt: number };
    if (resourceCount.cnt === 0) {
      const insertResource = this.db.prepare(`
        INSERT INTO resources (resource_id, name, resource_type, environment, status, classification, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertResource.run('cloudmend-gateway', 'Apex Medical Patient Portal Gateway', 'api_gateway', 'synthetic-production', 'healthy', 'PUBLIC_EDGE', now, now);
      insertResource.run('cloudmend-api', 'Apex Medical Clinical API Service', 'service', 'synthetic-production', 'healthy', 'RESTRICTED', now, now);
      insertResource.run('cloudmend-private-records', 'CloudMend Private Records Bucket', 'storage_bucket', 'synthetic-production', 'exposed', 'CONFIDENTIAL_HIPAA', now, now);
      insertResource.run('cloudmend-database', 'Apex Medical Synthetic SQLite Database', 'database', 'synthetic-production', 'healthy', 'INTERNAL_CONFIDENTIAL', now, now);
      insertResource.run('cloudmend-worker', 'CloudMend Autonomous Defense Worker', 'agent_worker', 'synthetic-production', 'healthy', 'SYSTEM_AGENT', now, now);
      insertResource.run('cloudmend-application', 'Apex Medical Web App & Patient Charts', 'application', 'synthetic-production', 'healthy', 'CLINICAL_WORKFLOW', now, now);
    }

    // Seed synthetic patient records idempotently
    const recordCount = this.db.prepare('SELECT count(*) as cnt FROM synthetic_records').get() as { cnt: number };
    if (recordCount.cnt === 0) {
      const insertRecord = this.db.prepare(`
        INSERT INTO synthetic_records (record_id, patient_name, diagnosis, department, classification, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      insertRecord.run('SYN-REC-1001', 'Eleanor Vance', 'Type 2 Diabetes', 'Endocrinology', 'CONFIDENTIAL_HIPAA', now);
      insertRecord.run('SYN-REC-1002', 'Marcus Holloway', 'Moderate Persistent Asthma', 'Pulmonology', 'CONFIDENTIAL_HIPAA', now);
      insertRecord.run('SYN-REC-1003', 'Chloe Decker', 'Hypertension Stage 1', 'Cardiology', 'CONFIDENTIAL_HIPAA', now);
    }
  }

  // --- Resources API ---
  public getResources(): ResourceRow[] {
    return this.db.prepare('SELECT * FROM resources ORDER BY id ASC').all() as unknown as ResourceRow[];
  }

  public updateResourceStatus(resourceId: string, status: string) {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE resources SET status = ?, updated_at = ? WHERE resource_id = ?
    `).run(status, now, resourceId);
  }

  // --- Synthetic Records API ---
  public getSyntheticRecords(): SyntheticRecordRow[] {
    return this.db.prepare('SELECT * FROM synthetic_records ORDER BY id ASC').all() as unknown as SyntheticRecordRow[];
  }

  public getSyntheticRecord(recordId: string): SyntheticRecordRow | undefined {
    return this.db.prepare('SELECT * FROM synthetic_records WHERE record_id = ?').get(recordId) as unknown as SyntheticRecordRow | undefined;
  }

  // --- Configurations API ---
  public saveConfiguration(resourceId: string, configType: string, configJson: string, revision: string, hash: string) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO configurations (resource_id, config_type, config_json, revision, config_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(resourceId, configType, configJson, revision, hash, now, now);
  }

  public getLatestConfiguration(resourceId?: string): ConfigurationRow | undefined {
    if (resourceId) {
      return this.db.prepare('SELECT * FROM configurations WHERE resource_id = ? ORDER BY id DESC LIMIT 1').get(resourceId) as unknown as ConfigurationRow | undefined;
    }
    return this.db.prepare('SELECT * FROM configurations ORDER BY id DESC LIMIT 1').get() as unknown as ConfigurationRow | undefined;
  }

  // --- Telemetry API ---
  public insertTelemetry(item: Omit<TelemetryRow, 'id'>) {
    this.db.prepare(`
      INSERT INTO telemetry (timestamp, resource_id, metric_name, metric_value, unit, status, scenario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(item.timestamp, item.resource_id, item.metric_name, item.metric_value, item.unit, item.status, item.scenario_id);
  }

  public insertTelemetryBatch(items: Array<Omit<TelemetryRow, 'id'>>) {
    const stmt = this.db.prepare(`
      INSERT INTO telemetry (timestamp, resource_id, metric_name, metric_value, unit, status, scenario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of items) {
      stmt.run(item.timestamp, item.resource_id, item.metric_name, item.metric_value, item.unit, item.status, item.scenario_id);
    }
  }

  public getLatestTelemetry(): TelemetryRow[] {
    const sql = `
      SELECT t.* FROM telemetry t
      INNER JOIN (
        SELECT resource_id, metric_name, MAX(id) as max_id
        FROM telemetry
        GROUP BY resource_id, metric_name
      ) latest ON t.id = latest.max_id
      ORDER BY t.resource_id, t.metric_name
    `;
    return this.db.prepare(sql).all() as unknown as TelemetryRow[];
  }

  public getTelemetryHistory(metricName?: string, resourceId?: string, limit: number = 30): TelemetryRow[] {
    if (metricName && resourceId) {
      const rows = this.db.prepare(`
        SELECT * FROM telemetry
        WHERE metric_name = ? AND resource_id = ?
        ORDER BY id DESC LIMIT ?
      `).all(metricName, resourceId, limit) as unknown as TelemetryRow[];
      return rows.reverse();
    } else if (metricName) {
      const rows = this.db.prepare(`
        SELECT * FROM telemetry
        WHERE metric_name = ?
        ORDER BY id DESC LIMIT ?
      `).all(metricName, limit) as unknown as TelemetryRow[];
      return rows.reverse();
    } else if (resourceId) {
      const rows = this.db.prepare(`
        SELECT * FROM telemetry
        WHERE resource_id = ?
        ORDER BY id DESC LIMIT ?
      `).all(resourceId, limit) as unknown as TelemetryRow[];
      return rows.reverse();
    }
    const rows = this.db.prepare(`
      SELECT * FROM telemetry
      ORDER BY id DESC LIMIT ?
    `).all(limit) as unknown as TelemetryRow[];
    return rows.reverse();
  }

  public cleanupTelemetry(keepCountPerResource: number = 5000) {
    try {
      this.db.exec(`
        DELETE FROM telemetry WHERE id NOT IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY resource_id ORDER BY id DESC) as rn
            FROM telemetry
          ) WHERE rn <= ${keepCountPerResource}
        );
      `);
    } catch (_) {}
  }

  // --- Security Events API ---
  public insertSecurityEvent(event: Omit<SecurityEventRow, 'id'>) {
    this.db.prepare(`
      INSERT INTO security_events (timestamp, event_type, severity, resource_id, message, run_id, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(event.timestamp, event.event_type, event.severity, event.resource_id, event.message, event.run_id, event.metadata_json);
  }

  public getSecurityEvents(limit: number = 50): SecurityEventRow[] {
    return this.db.prepare('SELECT * FROM security_events ORDER BY id DESC LIMIT ?').all(limit) as unknown as SecurityEventRow[];
  }

  // --- Findings API ---
  public saveFinding(finding: SecurityFinding, status: string = 'ACTIVE') {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO findings (finding_id, resource, vulnerability, severity, evidence, security_impact, recommended_remediation, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      finding.id,
      finding.resource,
      finding.vulnerability,
      finding.severity,
      finding.evidence,
      finding.security_impact || '',
      finding.recommended_remediation || '',
      status,
      now
    );
  }

  public getFindings(limit: number = 20): FindingRow[] {
    return this.db.prepare('SELECT * FROM findings ORDER BY id DESC LIMIT ?').all(limit) as unknown as FindingRow[];
  }

  // --- Remediation Runs API ---
  public insertRun(run: RunRecord) {
    const scenarioId = run.initial_config?.scenario_id || 3;
    this.db.prepare(`
      INSERT OR REPLACE INTO remediation_runs (
        run_id, scenario_name, scenario_id, timestamp, mode, finding_json, initial_config_json,
        candidate_config_json, final_config_json, diff_json, rollback_occurred, rollback_reason,
        final_outcome, elapsed_ms, model_used, attempts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.run_id,
      run.scenario_name,
      scenarioId,
      run.timestamp,
      run.mode,
      run.finding ? JSON.stringify(run.finding) : null,
      JSON.stringify(run.initial_config),
      run.candidate_config ? JSON.stringify(run.candidate_config) : null,
      JSON.stringify(run.final_config),
      JSON.stringify(run.diff),
      run.rollback_occurred ? 1 : 0,
      run.rollback_reason || null,
      run.final_outcome,
      run.elapsed_ms,
      run.model_used,
      run.remediation_attempts
    );

    // Save verification results
    if (run.verification_results && run.verification_results.length > 0) {
      const probeStmt = this.db.prepare(`
        INSERT INTO verification_results (probe_id, run_id, category, name, identity, target, expected_status, actual_status, passed, latency_ms, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const now = new Date().toISOString();
      for (const p of run.verification_results) {
        probeStmt.run(p.id, run.run_id, p.category, p.name, p.identity, p.target, String(p.expected_status), p.actual_status, p.passed ? 1 : 0, p.latency_ms, p.details, now);
      }
    }

    // Save snapshots
    if (run.snapshots && run.snapshots.length > 0) {
      const snapStmt = this.db.prepare(`
        INSERT OR REPLACE INTO snapshots (revision, run_id, hash, description, timestamp, config_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const s of run.snapshots) {
        snapStmt.run(s.revision, run.run_id, s.hash, s.description, s.timestamp, JSON.stringify(s.config));
      }
    }
  }

  public getRuns(limit: number = 100): RunRecord[] {
    const rows = this.db.prepare('SELECT * FROM remediation_runs ORDER BY timestamp DESC LIMIT ?').all(limit) as unknown as any[];
    return rows.map(r => ({
      run_id: r.run_id,
      scenario_name: r.scenario_name,
      timestamp: r.timestamp,
      mode: (r.mode || 'standard') as 'standard' | 'self_healing',
      finding: r.finding_json ? JSON.parse(r.finding_json) : null,
      initial_config: JSON.parse(r.initial_config_json),
      candidate_config: r.candidate_config_json ? JSON.parse(r.candidate_config_json) : undefined,
      final_config: JSON.parse(r.final_config_json),
      diff: r.diff_json ? JSON.parse(r.diff_json) : { before_json: '', after_json: '' },
      snapshots: this.getSnapshotsForRun(r.run_id),
      remediation_attempts: r.attempts,
      verification_results: this.getVerificationResultsForRun(r.run_id),
      rollback_occurred: r.rollback_occurred === 1,
      rollback_reason: r.rollback_reason || undefined,
      final_outcome: r.final_outcome as 'SUCCESS' | 'FAILED',
      elapsed_ms: r.elapsed_ms,
      model_used: r.model_used,
      events: this.getEvents(r.run_id)
    }));
  }

  public getRunById(runId: string): RunRecord | undefined {
    const r = this.db.prepare('SELECT * FROM remediation_runs WHERE run_id = ?').get(runId) as unknown as any;
    if (!r) return undefined;
    return {
      run_id: r.run_id,
      scenario_name: r.scenario_name,
      timestamp: r.timestamp,
      mode: (r.mode || 'standard') as 'standard' | 'self_healing',
      finding: r.finding_json ? JSON.parse(r.finding_json) : null,
      initial_config: JSON.parse(r.initial_config_json),
      candidate_config: r.candidate_config_json ? JSON.parse(r.candidate_config_json) : undefined,
      final_config: JSON.parse(r.final_config_json),
      diff: r.diff_json ? JSON.parse(r.diff_json) : { before_json: '', after_json: '' },
      snapshots: this.getSnapshotsForRun(r.run_id),
      remediation_attempts: r.attempts,
      verification_results: this.getVerificationResultsForRun(r.run_id),
      rollback_occurred: r.rollback_occurred === 1,
      rollback_reason: r.rollback_reason || undefined,
      final_outcome: r.final_outcome as 'SUCCESS' | 'FAILED',
      elapsed_ms: r.elapsed_ms,
      model_used: r.model_used,
      events: this.getEvents(r.run_id)
    };
  }

  // --- Snapshots API ---
  public insertSnapshot(snapshot: Snapshot) {
    this.db.prepare(`
      INSERT OR REPLACE INTO snapshots (revision, run_id, hash, description, timestamp, config_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(snapshot.revision, snapshot.run_id || 'manual', snapshot.hash, snapshot.description, snapshot.timestamp, JSON.stringify(snapshot.config));
  }

  public getSnapshots(limit: number = 20): Snapshot[] {
    const rows = this.db.prepare('SELECT * FROM snapshots ORDER BY timestamp DESC LIMIT ?').all(limit) as unknown as any[];
    return rows.map(r => ({
      revision: r.revision,
      hash: r.hash,
      run_id: r.run_id,
      description: r.description,
      timestamp: r.timestamp,
      config: JSON.parse(r.config_json)
    }));
  }

  public getSnapshotsForRun(runId: string): Snapshot[] {
    const rows = this.db.prepare('SELECT * FROM snapshots WHERE run_id = ? ORDER BY revision ASC').all(runId) as unknown as any[];
    if (rows.length > 0) {
      return rows.map(r => ({
        revision: r.revision,
        hash: r.hash,
        run_id: r.run_id,
        description: r.description,
        timestamp: r.timestamp,
        config: JSON.parse(r.config_json)
      }));
    }
    return this.getSnapshots(3);
  }

  // --- Verification Results API ---
  public insertVerificationResult(result: ProbeResult, runId?: string) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO verification_results (probe_id, run_id, category, name, identity, target, expected_status, actual_status, passed, latency_ms, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(result.id, runId || null, result.category, result.name, result.identity, result.target, String(result.expected_status), result.actual_status, result.passed ? 1 : 0, result.latency_ms, result.details, now);
  }

  public getVerificationResultsForRun(runId?: string): ProbeResult[] {
    let rows: any[];
    if (runId) {
      rows = this.db.prepare('SELECT * FROM verification_results WHERE run_id = ? ORDER BY id ASC').all(runId) as unknown as any[];
    } else {
      rows = this.db.prepare('SELECT * FROM verification_results ORDER BY id DESC LIMIT 20').all() as unknown as any[];
    }
    return rows.map(r => ({
      id: r.probe_id || `probe-${r.id}`,
      name: r.name,
      category: r.category as 'SECURITY' | 'APPLICATION',
      identity: r.identity as any,
      target: r.target,
      expected_status: r.expected_status,
      actual_status: r.actual_status,
      passed: r.passed === 1,
      latency_ms: r.latency_ms,
      details: r.details || ''
    }));
  }

  // --- Audit Events API ---
  public insertAuditEvent(event: TimelineEvent) {
    this.db.prepare(`
      INSERT OR REPLACE INTO audit_events (id, run_id, timestamp, category, level, title, description, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.id,
      event.run_id,
      event.timestamp,
      event.category,
      event.level,
      event.title,
      event.description,
      event.metadata ? JSON.stringify(event.metadata) : null
    );
  }

  public getEvents(runId?: string, limit: number = 200): TimelineEvent[] {
    let rows: any[];
    if (runId) {
      rows = this.db.prepare('SELECT * FROM audit_events WHERE run_id = ? ORDER BY timestamp ASC').all(runId) as unknown as any[];
    } else {
      rows = this.db.prepare('SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT ?').all(limit) as unknown as any[];
      rows = rows.reverse();
    }
    return rows.map(r => ({
      id: r.id,
      run_id: r.run_id,
      timestamp: r.timestamp,
      category: r.category as any,
      level: r.level as any,
      title: r.title,
      description: r.description,
      metadata: r.metadata_json ? JSON.parse(r.metadata_json) : undefined
    }));
  }

  public getRecentEvents(limit: number = 50): TimelineEvent[] {
    return this.getEvents(undefined, limit);
  }

  // --- Database Status API ---
  public getStatus(): DatabaseStatus {
    const tableNames = [
      'resources',
      'configurations',
      'synthetic_records',
      'telemetry',
      'security_events',
      'findings',
      'remediation_runs',
      'remediation_attempts',
      'snapshots',
      'verification_results',
      'audit_events'
    ];

    const tables: TableStatus[] = [];
    for (const name of tableNames) {
      try {
        const countRow = this.db.prepare(`SELECT count(*) as cnt FROM ${name}`).get() as { cnt: number };
        let lastUpdated: string | null = null;
        try {
          if (name === 'telemetry' || name === 'security_events' || name === 'audit_events') {
            const lastRow = this.db.prepare(`SELECT timestamp FROM ${name} ORDER BY id DESC LIMIT 1`).get() as { timestamp: string } | undefined;
            if (lastRow) lastUpdated = lastRow.timestamp;
          } else if (name === 'resources' || name === 'configurations') {
            const lastRow = this.db.prepare(`SELECT updated_at FROM ${name} ORDER BY id DESC LIMIT 1`).get() as { updated_at: string } | undefined;
            if (lastRow) lastUpdated = lastRow.updated_at;
          } else if (name === 'remediation_runs' || name === 'snapshots' || name === 'verification_results') {
            const lastRow = this.db.prepare(`SELECT timestamp FROM ${name} ORDER BY ROWID DESC LIMIT 1`).get() as { timestamp: string } | undefined;
            if (lastRow) lastUpdated = lastRow.timestamp;
          }
        } catch (_) {}

        tables.push({
          name,
          rowCount: countRow.cnt,
          lastUpdated
        });
      } catch (e) {
        tables.push({ name, rowCount: 0, lastUpdated: null });
      }
    }

    let sizeBytes = 0;
    try {
      if (fs.existsSync(DB_PATH)) {
        sizeBytes = fs.statSync(DB_PATH).size;
      }
    } catch (_) {}

    return {
      dbPath: DB_PATH,
      connected: true,
      sizeBytes,
      tables
    };
  }

  public getTableSample(tableName: string, limit: number = 25): any[] {
    const validTables = [
      'resources',
      'configurations',
      'synthetic_records',
      'telemetry',
      'security_events',
      'findings',
      'remediation_runs',
      'remediation_attempts',
      'snapshots',
      'verification_results',
      'audit_events'
    ];
    if (!validTables.includes(tableName)) return [];
    try {
      return this.db.prepare(`SELECT * FROM ${tableName} ORDER BY ROWID DESC LIMIT ?`).all(limit) as any[];
    } catch (e) {
      return [];
    }
  }

  public resetDatabase() {
    this.db.exec('DELETE FROM telemetry;');
    this.db.exec('DELETE FROM security_events;');
    this.db.exec('DELETE FROM findings;');
    this.db.exec('DELETE FROM verification_results;');
    this.db.exec('DELETE FROM configurations;');
    this.db.exec('DELETE FROM snapshots;');
    this.db.exec('DELETE FROM remediation_attempts;');
  }
}

export const sqlite = new SQLiteDatabase();
