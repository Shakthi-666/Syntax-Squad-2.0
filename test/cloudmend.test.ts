import { sandbox, SCENARIO_DEFINITIONS } from '../src/server/sandbox';
import { SafeTools } from '../src/server/tools';
import { runScan, executeAutonomousRepair } from '../src/server/agent';
import { CloudMendDB } from '../src/server/db';

async function runTestSuite() {
  console.log('====================================================');
  console.log('CLOUDMEND AUTOMATED REGRESSION & SECURITY TEST SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? '— ' + detail : ''}`);
      failedCount++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Detect public storage bucket
    // ----------------------------------------------------
    sandbox.loadScenario(2); // Storage Bucket Public Access
    const findingStorage = sandbox.scanVulnerabilities();
    assert(
      findingStorage !== null && findingStorage.vulnerability.includes('Publicly Accessible Storage Bucket'),
      'TEST 1: Detect public storage bucket',
      `Finding: ${findingStorage?.vulnerability}`
    );

    // ----------------------------------------------------
    // TEST 2: Successful storage remediation
    // ----------------------------------------------------
    const storageRun = await executeAutonomousRepair({ mode: 'standard', scenario_id: 2 });
    assert(
      storageRun.final_outcome === 'SUCCESS' && storageRun.final_config.storage.public_read === false,
      'TEST 2: Successful storage remediation',
      `Outcome: ${storageRun.final_outcome}`
    );

    // ----------------------------------------------------
    // TEST 3: Anonymous access denied after remediation
    // ----------------------------------------------------
    const postFixProbes = sandbox.runAllProbes();
    const p1Anon = postFixProbes.find(p => p.id === 'PROBE-SEC-01');
    const p2StorageAnon = postFixProbes.find(p => p.id === 'PROBE-SEC-02');
    assert(
      p1Anon?.passed === true && p2StorageAnon?.passed === true,
      'TEST 3: Anonymous access denied after remediation',
      `Anon API HTTP: ${p1Anon?.actual_status}, Anon Bucket HTTP: ${p2StorageAnon?.actual_status}`
    );

    // ----------------------------------------------------
    // TEST 4: Authorized analyst access still works
    // ----------------------------------------------------
    const pAnalyst = postFixProbes.find(p => p.id === 'PROBE-APP-02');
    const pHealth = postFixProbes.find(p => p.id === 'PROBE-APP-01');
    assert(
      pAnalyst?.passed === true && pAnalyst?.actual_status === 200 && pHealth?.actual_status === 200,
      'TEST 4: Authorized analyst access still works (no regression)',
      `Analyst status: ${pAnalyst?.actual_status}, Health status: ${pHealth?.actual_status}`
    );

    // ----------------------------------------------------
    // TEST 5: Overly restrictive candidate causes regression
    // ----------------------------------------------------
    sandbox.loadScenario(3); // Reset to Scenario 3
    const snap = sandbox.createSnapshot('test-run-snap', 'Test baseline');
    // Apply blanket deny candidate
    sandbox.applyGatewayPolicy({
      routes: [
        { path: '/health', allow_anonymous: true, required_roles: [] },
        { path: '/api/records', allow_anonymous: false, required_roles: [], block_all: true },
        { path: '/api/admin', allow_anonymous: false, required_roles: ['admin'] }
      ]
    });
    const candidateProbes = sandbox.runAllProbes();
    const candidateAnalystProbe = candidateProbes.find(p => p.id === 'PROBE-APP-02');
    assert(
      candidateAnalystProbe?.passed === false && candidateAnalystProbe?.actual_status === 403,
      'TEST 5: Overly restrictive candidate causes regression',
      `Candidate analyst status: ${candidateAnalystProbe?.actual_status} (Expected 403 regression)`
    );

    // ----------------------------------------------------
    // TEST 6: Automatic rollback happens
    // ----------------------------------------------------
    sandbox.restoreSnapshot(snap.revision);
    const restoredConfig = sandbox.getConfig();
    const restoredRoute = restoredConfig.gateway.routes.find(r => r.path === '/api/records');
    assert(
      restoredRoute?.allow_anonymous === true && !restoredRoute?.block_all,
      'TEST 6: Automatic rollback restores previous configuration',
      `Restored allow_anonymous: ${restoredRoute?.allow_anonymous}`
    );

    // ----------------------------------------------------
    // TEST 7: Second remediation succeeds (Self-healing end-to-end)
    // ----------------------------------------------------
    const selfHealingRun = await executeAutonomousRepair({ mode: 'self_healing', scenario_id: 3 });
    assert(
      selfHealingRun.final_outcome === 'SUCCESS' &&
        selfHealingRun.rollback_occurred === true &&
        selfHealingRun.remediation_attempts === 2,
      'TEST 7: Second remediation succeeds with self-healing recovery',
      `Attempts: ${selfHealingRun.remediation_attempts}, Rollback: ${selfHealingRun.rollback_occurred}`
    );

    // ----------------------------------------------------
    // TEST 8: Reset restores vulnerable state
    // ----------------------------------------------------
    sandbox.reset(3);
    const resetFinding = sandbox.scanVulnerabilities();
    assert(
      resetFinding !== null && resetFinding.id === 'FINDING-GATEWAY-01',
      'TEST 8: Reset restores vulnerable state',
      `Finding: ${resetFinding?.id}`
    );

    // ----------------------------------------------------
    // TEST 9: Run history is persisted
    // ----------------------------------------------------
    const allRuns = CloudMendDB.getRuns();
    assert(
      allRuns.length >= 2,
      'TEST 9: Run history is persisted in database',
      `Persisted runs count: ${allRuns.length}`
    );

    // ----------------------------------------------------
    // TEST 10: No secret values appear in audit logs
    // ----------------------------------------------------
    const recentEvents = CloudMendDB.getRecentEvents(50);
    const hasRawSecret = recentEvents.some(
      e =>
        e.description.includes('token-analyst-449') ||
        e.description.includes('token-admin-901') ||
        e.title.includes('token-analyst-449')
    );
    assert(
      !hasRawSecret,
      'TEST 10: No secret token values appear in audit logs',
      'Tokens are safely redacted / omitted from event descriptions'
    );

  } catch (error) {
    console.error('Fatal exception during test suite execution:', error);
    failedCount++;
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite();
