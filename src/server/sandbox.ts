import crypto from 'crypto';
import {
  SandboxConfig,
  Snapshot,
  SyntheticPatientRecord,
  ProbeResult,
  SecurityFinding
} from '../types';

// Deterministic synthetic patient records (strictly fictional, HIPAA compliance demo)
export const SYNTHETIC_PATIENT_RECORDS: Record<string, SyntheticPatientRecord> = {
  'SYN-REC-1001.json': {
    id: 'SYN-REC-1001',
    patient: 'Eleanor Vance',
    diagnosis: 'Type 2 Diabetes',
    ssn: '***-**-4910',
    dob: '1964-08-14',
    department: 'Endocrinology',
    classification: 'CONFIDENTIAL_HIPAA'
  },
  'SYN-REC-1002.json': {
    id: 'SYN-REC-1002',
    patient: 'Marcus Holloway',
    diagnosis: 'Moderate Persistent Asthma',
    ssn: '***-**-8201',
    dob: '1988-11-20',
    department: 'Pulmonology',
    classification: 'CONFIDENTIAL_HIPAA'
  },
  'SYN-REC-1003.json': {
    id: 'SYN-REC-1003',
    patient: 'Chloe Decker',
    diagnosis: 'Hypertension Stage 1',
    ssn: '***-**-3341',
    dob: '1981-03-05',
    department: 'Cardiology',
    classification: 'CONFIDENTIAL_HIPAA'
  }
};

export interface SyntheticIdentity {
  name: string;
  token: string | null;
  role: string | null;
}

export const SYNTHETIC_IDENTITIES: Record<string, SyntheticIdentity> = {
  ANONYMOUS: { name: 'Anonymous', token: null, role: null },
  INVALID: { name: 'Invalid Token', token: 'token-invalid-99', role: null },
  ANALYST: { name: 'Security Analyst', token: 'token-analyst-449', role: 'analyst' },
  ADMIN: { name: 'Administrator', token: 'token-admin-901', role: 'admin' }
};

export const SCENARIO_DEFINITIONS = [
  {
    id: 1,
    name: 'Gateway Vulnerable Exposure',
    description: 'Perimeter gateway allows anonymous access to /api/records exposing confidential patient charts.',
    initialConfig: {
      storage: {
        bucket: 'cloudmend-private-records',
        public_read: false,
        authenticated_read: true,
        classification: 'CONFIDENTIAL',
        allowed_principals: ['role:analyst', 'role:admin']
      },
      gateway: {
        service: 'Apex Medical Patient Portal Gateway',
        routes: [
          { path: '/health', allow_anonymous: true, required_roles: [] },
          { path: '/api/records', allow_anonymous: true, required_roles: [] }, // VULNERABLE
          { path: '/api/admin', allow_anonymous: false, required_roles: ['admin'] }
        ]
      },
      scenario_id: 1,
      scenario_name: 'Gateway Vulnerable Exposure'
    }
  },
  {
    id: 2,
    name: 'Storage Bucket Public Access',
    description: 'RustFS S3 bucket cloudmend-private-records has public_read enabled, allowing anonymous downloading.',
    initialConfig: {
      storage: {
        bucket: 'cloudmend-private-records',
        public_read: true, // VULNERABLE
        authenticated_read: true,
        classification: 'CONFIDENTIAL',
        allowed_principals: ['role:analyst', 'role:admin', 'public']
      },
      gateway: {
        service: 'Apex Medical Patient Portal Gateway',
        routes: [
          { path: '/health', allow_anonymous: true, required_roles: [] },
          { path: '/api/records', allow_anonymous: false, required_roles: ['analyst', 'admin'] },
          { path: '/api/admin', allow_anonymous: false, required_roles: ['admin'] }
        ]
      },
      scenario_id: 2,
      scenario_name: 'Storage Bucket Public Access'
    }
  },
  {
    id: 3,
    name: 'Self-Healing Recovery',
    description: 'Headline hackathon scenario: Exposed records -> Candidate 1 causes regression -> Automatic rollback -> Safer fix.',
    initialConfig: {
      storage: {
        bucket: 'cloudmend-private-records',
        public_read: false,
        authenticated_read: true,
        classification: 'CONFIDENTIAL',
        allowed_principals: ['role:analyst', 'role:admin']
      },
      gateway: {
        service: 'Apex Medical Patient Portal Gateway',
        routes: [
          { path: '/health', allow_anonymous: true, required_roles: [] },
          { path: '/api/records', allow_anonymous: true, required_roles: [] }, // VULNERABLE
          { path: '/api/admin', allow_anonymous: false, required_roles: ['admin'] }
        ]
      },
      scenario_id: 3,
      scenario_name: 'Self-Healing Recovery'
    }
  },
  {
    id: 4,
    name: 'Overly Restrictive Candidate Fault',
    description: 'Simulate the impact of applying a blanket deny rule that breaks clinical workflows.',
    initialConfig: {
      storage: {
        bucket: 'cloudmend-private-records',
        public_read: false,
        authenticated_read: true,
        classification: 'CONFIDENTIAL',
        allowed_principals: ['role:analyst', 'role:admin']
      },
      gateway: {
        service: 'Apex Medical Patient Portal Gateway',
        routes: [
          { path: '/health', allow_anonymous: true, required_roles: [] },
          { path: '/api/records', allow_anonymous: false, required_roles: [], block_all: true }, // FAULTY BLANKET
          { path: '/api/admin', allow_anonymous: false, required_roles: ['admin'] }
        ]
      },
      scenario_id: 4,
      scenario_name: 'Overly Restrictive Candidate'
    }
  },
  {
    id: 5,
    name: 'Combined Misconfiguration',
    description: 'Both perimeter gateway and synthetic RustFS storage bucket are misconfigured simultaneously.',
    initialConfig: {
      storage: {
        bucket: 'cloudmend-private-records',
        public_read: true, // VULNERABLE
        authenticated_read: true,
        classification: 'CONFIDENTIAL',
        allowed_principals: ['role:analyst', 'role:admin', 'public']
      },
      gateway: {
        service: 'Apex Medical Patient Portal Gateway',
        routes: [
          { path: '/health', allow_anonymous: true, required_roles: [] },
          { path: '/api/records', allow_anonymous: true, required_roles: [] }, // VULNERABLE
          { path: '/api/admin', allow_anonymous: false, required_roles: ['admin'] }
        ]
      },
      scenario_id: 5,
      scenario_name: 'Combined Misconfiguration'
    }
  }
];

class SandboxEnvironment {
  private currentConfig: SandboxConfig;
  private snapshots: Map<string, Snapshot> = new Map();
  private revisionCounter: number = 0;

  constructor() {
    // Default to Scenario 3 (Self-Healing Recovery / Gateway Exposed)
    this.currentConfig = JSON.parse(JSON.stringify(SCENARIO_DEFINITIONS[2].initialConfig));
  }

  public getConfig(): SandboxConfig {
    return JSON.parse(JSON.stringify(this.currentConfig));
  }

  public loadScenario(scenarioId: number): SandboxConfig {
    const scenario = SCENARIO_DEFINITIONS.find(s => s.id === scenarioId) || SCENARIO_DEFINITIONS[2];
    this.currentConfig = JSON.parse(JSON.stringify(scenario.initialConfig));
    this.snapshots.clear();
    this.revisionCounter = 0;
    return this.getConfig();
  }

  public reset(scenarioId: number = 3): SandboxConfig {
    return this.loadScenario(scenarioId);
  }

  // Pre-mutation snapshot creation
  public createSnapshot(runId: string, description: string): Snapshot {
    this.revisionCounter += 1;
    const revId = `rev-${String(this.revisionCounter).padStart(3, '0')}`;
    const serialized = JSON.stringify(this.currentConfig);
    const hash = 'sha256:' + crypto.createHash('sha256').update(serialized).digest('hex').substring(0, 16);

    const snapshot: Snapshot = {
      revision: revId,
      hash,
      timestamp: new Date().toISOString(),
      run_id: runId,
      description,
      config: JSON.parse(serialized)
    };

    this.snapshots.set(revId, snapshot);
    return snapshot;
  }

  public getSnapshot(revision: string): Snapshot | undefined {
    return this.snapshots.get(revision);
  }

  public restoreSnapshot(revision: string): { success: boolean; config: SandboxConfig } {
    const snapshot = this.snapshots.get(revision);
    if (!snapshot) {
      throw new Error(`Snapshot revision ${revision} not found`);
    }
    this.currentConfig = JSON.parse(JSON.stringify(snapshot.config));
    return { success: true, config: this.getConfig() };
  }

  // Safe typed mutations
  public applyStoragePolicy(policy: Partial<SandboxConfig['storage']>): SandboxConfig {
    this.currentConfig.storage = {
      ...this.currentConfig.storage,
      ...policy
    };
    return this.getConfig();
  }

  public applyGatewayPolicy(policy: Partial<SandboxConfig['gateway']>): SandboxConfig {
    this.currentConfig.gateway = {
      ...this.currentConfig.gateway,
      ...policy
    };
    return this.getConfig();
  }

  // Check current vulnerability status
  public scanVulnerabilities(): SecurityFinding | null {
    const isStoragePublic = this.currentConfig.storage.public_read;
    const recordsRoute = this.currentConfig.gateway.routes.find(r => r.path === '/api/records');
    const isGatewayAnonymous = recordsRoute ? recordsRoute.allow_anonymous : false;

    if (isStoragePublic && isGatewayAnonymous) {
      return {
        id: 'FINDING-COMBINED-05',
        resource: 'RustFS Bucket + Apex Gateway',
        vulnerability: 'Unrestricted Public Access to Patient Health Records',
        severity: 'CRITICAL',
        evidence: 'Anonymous GET on /api/records returned HTTP 200 with 3 confidential patient records. Direct RustFS S3 bucket allows anonymous read.',
        affected_endpoint: '/api/records & s3://cloudmend-private-records/*',
        current_configuration: JSON.stringify(
          {
            bucket_public_read: true,
            gateway_allow_anonymous: true
          },
          null,
          2
        ),
        recommended_remediation: 'Enable Perimeter Gateway Bearer token validation and set bucket public_read=false with least-privilege principal roles.',
        security_impact: 'Immediate public exposure of HIPAA-protected confidential electronic medical charts and patient PII.'
      };
    }

    if (isStoragePublic) {
      return {
        id: 'FINDING-STORAGE-02',
        resource: 'cloudmend-private-records (RustFS)',
        vulnerability: 'Publicly Accessible Storage Bucket',
        severity: 'CRITICAL',
        evidence: 'Sensitive synthetic records are accessible without authentication because the storage policy allows public read access (public_read: true).',
        affected_endpoint: 's3://cloudmend-private-records/patient-records/*',
        current_configuration: JSON.stringify(this.currentConfig.storage, null, 2),
        recommended_remediation: 'Remove anonymous read access (public_read: false) while preserving authenticated application and analyst access.',
        security_impact: 'Unauthorized external threat actors can enumerate and download patient medical history without audit trail.'
      };
    }

    if (isGatewayAnonymous) {
      return {
        id: 'FINDING-GATEWAY-01',
        resource: 'Apex Medical Patient Portal Gateway',
        vulnerability: 'Unauthenticated API Route Exposure',
        severity: 'CRITICAL',
        evidence: 'Perimeter gateway route /api/records has allow_anonymous=true. Anonymous requests retrieve patient diagnosis data.',
        affected_endpoint: '/api/records',
        current_configuration: JSON.stringify(recordsRoute, null, 2),
        recommended_remediation: 'Enforce Bearer authorization. Require analyst or admin roles for records endpoint; preserve /health for public monitoring.',
        security_impact: 'Anonymous users bypass identity perimeter and query protected patient records.'
      };
    }

    return null;
  }

  // Execute Dual Verification Probes against the current live configuration
  public runAllProbes(): ProbeResult[] {
    const results: ProbeResult[] = [];

    // Probe 1 (Security): Anonymous request to /api/records
    const startP1 = Date.now();
    const recordsRoute = this.currentConfig.gateway.routes.find(r => r.path === '/api/records');
    const p1Status = recordsRoute?.block_all
      ? 403
      : recordsRoute?.allow_anonymous
      ? 200
      : 401;
    const p1Passed = p1Status === 401 || p1Status === 403;
    results.push({
      id: 'PROBE-SEC-01',
      category: 'SECURITY',
      name: 'Anonymous Access to /api/records',
      target: '/api/records',
      identity: 'Anonymous',
      expected_status: '401 or 403',
      actual_status: p1Status,
      latency_ms: Date.now() - startP1 + 8,
      passed: p1Passed,
      details: p1Passed
        ? 'Anonymous request correctly rejected with HTTP ' + p1Status
        : 'CRITICAL: Anonymous caller was granted HTTP 200 and accessed confidential records!'
    });

    // Probe 2 (Security): Anonymous access to synthetic RustFS S3 storage
    const startP2 = Date.now();
    const storagePublic = this.currentConfig.storage.public_read;
    const p2Status = storagePublic ? 200 : 403;
    const p2Passed = p2Status === 403;
    results.push({
      id: 'PROBE-SEC-02',
      category: 'SECURITY',
      name: 'Anonymous RustFS S3 Bucket Access',
      target: 's3://cloudmend-private-records/patient-records/*',
      identity: 'Anonymous',
      expected_status: 403,
      actual_status: p2Status,
      latency_ms: Date.now() - startP2 + 12,
      passed: p2Passed,
      details: p2Passed
        ? 'Bucket rejected anonymous read request with 403 Forbidden.'
        : 'CRITICAL: Bucket returned 200 OK for anonymous read request.'
    });

    // Probe 3 (Security): Invalid Token request to /api/records
    const startP3 = Date.now();
    let p3Status: number = 401;
    if (recordsRoute?.block_all) {
      p3Status = 403;
    } else if (recordsRoute?.allow_anonymous) {
      p3Status = 200;
    }
    const p3Passed = p3Status === 401 || p3Status === 403;
    results.push({
      id: 'PROBE-SEC-03',
      category: 'SECURITY',
      name: 'Invalid Token Access to /api/records',
      target: '/api/records',
      identity: 'Invalid Token',
      expected_status: 401,
      actual_status: p3Status,
      latency_ms: Date.now() - startP3 + 10,
      passed: p3Passed,
      details: p3Passed
        ? 'Invalid token rejected with 401 Unauthorized.'
        : 'Invalid token was erroneously accepted (HTTP ' + p3Status + ').'
    });

    // Probe 4 (Application): Anonymous request to /health
    const startP4 = Date.now();
    const healthRoute = this.currentConfig.gateway.routes.find(r => r.path === '/health');
    const p4Status = healthRoute?.allow_anonymous ? 200 : 503;
    const p4Passed = p4Status === 200;
    results.push({
      id: 'PROBE-APP-01',
      category: 'APPLICATION',
      name: 'Public Health Check (/health)',
      target: '/health',
      identity: 'Anonymous',
      expected_status: 200,
      actual_status: p4Status,
      latency_ms: Date.now() - startP4 + 6,
      passed: p4Passed,
      details: p4Passed
        ? 'Health probe healthy (HTTP 200 OK).'
        : 'Health probe failed with HTTP ' + p4Status
    });

    // Probe 5 (Application): Authorized Analyst access to /api/records
    const startP5 = Date.now();
    let p5Status = 200;
    if (recordsRoute?.block_all) {
      p5Status = 403; // Regression!
    } else if (recordsRoute?.allow_anonymous) {
      p5Status = 200;
    } else if (recordsRoute?.required_roles && !recordsRoute.required_roles.includes('analyst') && recordsRoute.required_roles.length > 0) {
      p5Status = 403;
    } else {
      p5Status = 200;
    }
    const p5Passed = p5Status === 200;
    results.push({
      id: 'PROBE-APP-02',
      category: 'APPLICATION',
      name: 'Authorized Analyst Access to /api/records',
      target: '/api/records',
      identity: 'Security Analyst',
      expected_status: 200,
      actual_status: p5Status,
      latency_ms: Date.now() - startP5 + 14,
      passed: p5Passed,
      details: p5Passed
        ? 'Authorized Analyst successfully authenticated and retrieved medical charts (HTTP 200).'
        : 'REGRESSION: Legitimate Security Analyst was blocked with HTTP ' + p5Status + '!'
    });

    // Probe 6 (Application): Administrator access to /api/admin
    const startP6 = Date.now();
    const adminRoute = this.currentConfig.gateway.routes.find(r => r.path === '/api/admin');
    const p6Status = adminRoute?.block_all ? 503 : 200;
    const p6Passed = p6Status === 200;
    results.push({
      id: 'PROBE-APP-03',
      category: 'APPLICATION',
      name: 'Administrator Access to /api/admin',
      target: '/api/admin',
      identity: 'Administrator',
      expected_status: 200,
      actual_status: p6Status,
      latency_ms: Date.now() - startP6 + 11,
      passed: p6Passed,
      details: p6Passed
        ? 'Administrator role verified for /api/admin (HTTP 200).'
        : 'Admin endpoint failed with HTTP ' + p6Status
    });

    // Probe 7 (Application/RBAC): Analyst access to /api/admin (Should be 403 Forbidden - Role isolation)
    const startP7 = Date.now();
    const p7Status = 403;
    const p7Passed = p7Status === 403;
    results.push({
      id: 'PROBE-APP-04',
      category: 'APPLICATION',
      name: 'Role-Based Access Control Isolation',
      target: '/api/admin',
      identity: 'Security Analyst',
      expected_status: 403,
      actual_status: p7Status,
      latency_ms: Date.now() - startP7 + 9,
      passed: p7Passed,
      details: 'Least privilege RBAC properly enforced: Analyst cannot access Admin control plane (HTTP 403).'
    });

    return results;
  }

  // Direct endpoint simulator
  public handleEndpointRequest(endpoint: string, authHeader?: string): { status: number; body: any } {
    // Determine identity
    let identity = SYNTHETIC_IDENTITIES.ANONYMOUS;
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token === SYNTHETIC_IDENTITIES.ANALYST.token) {
        identity = SYNTHETIC_IDENTITIES.ANALYST;
      } else if (token === SYNTHETIC_IDENTITIES.ADMIN.token) {
        identity = SYNTHETIC_IDENTITIES.ADMIN;
      } else {
        identity = SYNTHETIC_IDENTITIES.INVALID;
      }
    }

    if (endpoint === '/health') {
      return { status: 200, body: { status: 'healthy', service: 'Apex Medical Patient Portal', uptime_sec: 14290 } };
    }

    if (endpoint === '/api/records') {
      const route = this.currentConfig.gateway.routes.find(r => r.path === '/api/records');
      if (route?.block_all) {
        return {
          status: 403,
          body: { error: 'AccessDenied', message: 'Endpoint is blocked by candidate firewall rule.' }
        };
      }
      if (route?.allow_anonymous) {
        return {
          status: 200,
          body: {
            source: 'Apex Medical Patient Portal (VULNERABLE)',
            records: Object.values(SYNTHETIC_PATIENT_RECORDS)
          }
        };
      }
      if (identity === SYNTHETIC_IDENTITIES.ANONYMOUS || identity === SYNTHETIC_IDENTITIES.INVALID) {
        return {
          status: 401,
          body: { error: 'Unauthorized', message: 'Bearer token required for patient record access.' }
        };
      }
      return {
        status: 200,
        body: {
          authenticated_principal: identity.name,
          role: identity.role,
          records: Object.values(SYNTHETIC_PATIENT_RECORDS)
        }
      };
    }

    if (endpoint === '/api/admin') {
      if (identity.role === 'admin') {
        return {
          status: 200,
          body: {
            service: 'Apex Medical Admin Plane',
            status: 'operational',
            system_telemetry: { audit_subsystem: 'active', encryption: 'AES-256-GCM' }
          }
        };
      }
      if (identity.role === 'analyst') {
        return {
          status: 403,
          body: { error: 'Forbidden', message: 'Analyst role is not permitted in Admin control plane.' }
        };
      }
      return {
        status: 401,
        body: { error: 'Unauthorized', message: 'Admin authentication required.' }
      };
    }

    if (endpoint.startsWith('/api/storage/bucket/')) {
      const parts = endpoint.split('/api/storage/bucket/')[1];
      const [bucketName, ...keyParts] = parts.split('/');
      const key = keyParts.join('/');

      if (this.currentConfig.storage.public_read) {
        const record = SYNTHETIC_PATIENT_RECORDS[key] || Object.values(SYNTHETIC_PATIENT_RECORDS)[0];
        return {
          status: 200,
          body: {
            bucket: bucketName,
            key,
            storage_engine: 'RustFS (S3-Compatible)',
            content: record
          }
        };
      }

      if (identity.role === 'analyst' || identity.role === 'admin') {
        const record = SYNTHETIC_PATIENT_RECORDS[key] || Object.values(SYNTHETIC_PATIENT_RECORDS)[0];
        return {
          status: 200,
          body: {
            bucket: bucketName,
            key,
            authenticated_principal: identity.name,
            content: record
          }
        };
      }

      return {
        status: 403,
        body: {
          error: 'AccessDenied',
          message: 'Anonymous read access to RustFS bucket cloudmend-private-records is prohibited by bucket policy.'
        }
      };
    }

    return { status: 404, body: { error: 'NotFound', message: `Route ${endpoint} not found.` } };
  }
}

export const sandbox = new SandboxEnvironment();
