import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { sqlite } from '../src/server/sqlite';
import { telemetryService } from '../src/server/telemetry';
import { sandbox } from '../src/server/sandbox';

async function runTelemetryTestSuite() {
  console.log('====================================================');
  console.log('CLOUDMEND SQLITE & SYNTHETIC TELEMETRY TEST SUITE');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function asyncTest(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Verify SQLite Database File Exists
  test('TEST 1: SQLite database file exists on disk', () => {
    const dbPath = path.resolve(process.cwd(), 'data/cloudmend.db');
    assert.ok(fs.existsSync(dbPath), 'data/cloudmend.db should exist');
  });

  // 2. Verify Tables Created
  test('TEST 2: SQLite database has all required tables', () => {
    const status = sqlite.getStatus();
    assert.strictEqual(status.connected, true);
    assert.ok(status.tables.length >= 11, 'Should have at least 11 tables');
    const tableNames = status.tables.map(t => t.name);
    const required = [
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
    for (const req of required) {
      assert.ok(tableNames.includes(req), `Table ${req} must exist`);
    }
  });

  // 3. Verify Seeded Resources
  test('TEST 3: Synthetic resources are seeded into SQLite', () => {
    const resources = sqlite.getResources();
    assert.ok(resources.length >= 5, 'Should have at least 5 synthetic resources');
    const ids = resources.map(r => r.resource_id);
    assert.ok(ids.includes('cloudmend-gateway'), 'Gateway resource exists');
    assert.ok(ids.includes('cloudmend-private-records'), 'Storage bucket resource exists');
  });

  // 4. Verify Synthetic Records
  test('TEST 4: Synthetic patient records are stored in SQLite', () => {
    const records = sqlite.getSyntheticRecords();
    assert.strictEqual(records.length, 3, 'Should have 3 fictional HIPAA records');
    const eleanor = records.find(r => r.record_id === 'SYN-REC-1001');
    assert.ok(eleanor, 'SYN-REC-1001 exists');
    assert.strictEqual(eleanor?.patient_name, 'Eleanor Vance');
    assert.strictEqual(eleanor?.classification, 'CONFIDENTIAL_HIPAA');
  });

  // 5. Verify Telemetry Tick Generates Time-Series Points
  test('TEST 5: Telemetry tick inserts valid metrics into SQLite', () => {
    const initialCount = sqlite.getStatus().tables.find(t => t.name === 'telemetry')?.rowCount || 0;
    telemetryService.generateTick();
    const newCount = sqlite.getStatus().tables.find(t => t.name === 'telemetry')?.rowCount || 0;
    assert.ok(newCount > initialCount, 'Telemetry row count must increase after tick');

    const latest = telemetryService.getLatestMetrics();
    assert.ok(latest.requests_per_min >= 100 && latest.requests_per_min <= 200, 'Requests must be bounded');
    assert.ok(latest.cpu_percent >= 20 && latest.cpu_percent <= 80, 'CPU must be bounded');
    assert.ok(latest.risk_score >= 0 && latest.risk_score <= 100, 'Risk score must be 0-100');
  });

  // 6. Verify Telemetry Variation Across Multiple Ticks
  test('TEST 6: Telemetry values change over time (non-static)', () => {
    const snap1 = telemetryService.getLatestMetrics();
    // Simulate 3 ticks
    telemetryService.generateTick();
    telemetryService.generateTick();
    telemetryService.generateTick();
    const snap2 = telemetryService.getLatestMetrics();
    // Assert that not all numbers are identically static
    const hasVariation =
      snap1.requests_per_min !== snap2.requests_per_min ||
      snap1.latency_ms !== snap2.latency_ms ||
      snap1.cpu_percent !== snap2.cpu_percent ||
      snap1.storage_reads !== snap2.storage_reads;
    assert.ok(hasVariation, 'Telemetry metrics must change across ticks');
  });

  // 7. Verify Scenario-Aware Telemetry Reaction
  test('TEST 7: Telemetry reacts to scenario changes', () => {
    // Load Scenario 2 (Storage Public)
    sandbox.loadScenario(2);
    telemetryService.reset();
    telemetryService.generateTick();
    const snapStorage = telemetryService.getLatestMetrics();
    assert.ok(snapStorage.risk_score >= 70, 'Risk score must be high in vulnerable scenario 2');
    assert.ok(snapStorage.resources.storage.status === 'EXPOSED', 'Storage status must reflect exposed');

    // Reset back to Scenario 3
    sandbox.loadScenario(3);
    telemetryService.reset();
    telemetryService.generateTick();
  });

  // 8. Verify Telemetry Reaction to Overly Restrictive Bad Candidate
  test('TEST 8: Bad remediation causes application health degradation and latency spike', () => {
    // Apply blanket route block
    sandbox.applyGatewayPolicy({
      routes: [
        { path: '/health', allow_anonymous: true, required_roles: [] },
        { path: '/api/records', allow_anonymous: false, required_roles: [], block_all: true }
      ]
    });
    telemetryService.generateTick();
    telemetryService.generateTick();
    const snapBad = telemetryService.getLatestMetrics();
    assert.strictEqual(snapBad.health_status, 'DEGRADED', 'Application health must become DEGRADED');
    assert.ok(snapBad.error_rate > 15, 'Error rate must spike on bad candidate');
    assert.ok(snapBad.latency_ms > 100, 'Latency must increase on bad candidate');

    // Restore safe configuration
    sandbox.reset(3);
    telemetryService.reset();
  });

  // 9. Verify Telemetry History API
  test('TEST 9: Telemetry history retrieves time-series points', () => {
    const history = telemetryService.getHistory(undefined, undefined, 20);
    assert.ok(history.length > 0, 'History should return points');
    const first = history[0];
    assert.ok(first.timestamp, 'Point must have timestamp');
    assert.ok(first.metric_name, 'Point must have metric_name');
    assert.ok(typeof first.metric_value === 'number', 'Point must have numeric value');
  });

  // 10. Verify Database Explorer Read-Only Sample
  test('TEST 10: Database sample returns structured rows for valid tables', () => {
    const sample = sqlite.getTableSample('resources', 5);
    assert.ok(sample.length > 0, 'Sample should return resource rows');
    assert.ok(sample[0].resource_id, 'Row should have resource_id');

    // Injection / invalid table protection
    const invalidSample = sqlite.getTableSample('non_existent_table; DROP TABLE resources;', 5);
    assert.strictEqual(invalidSample.length, 0, 'Invalid or dangerous table names must be rejected');
  });

  console.log('====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTelemetryTestSuite().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
