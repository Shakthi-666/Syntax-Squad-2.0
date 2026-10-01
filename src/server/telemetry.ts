import { sqlite, TelemetryRow } from './sqlite';
import { sandbox } from './sandbox';
import { getCurrentState } from './agent';

export interface TelemetrySnapshot {
  timestamp: string;
  requests_per_min: number;
  latency_ms: number;
  cpu_percent: number;
  memory_percent: number;
  error_rate: number;
  blocked_requests: number;
  security_events: number;
  storage_reads: number;
  unauthorized_attempts: number;
  risk_score: number;
  health_status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  resources: {
    gateway: { status: string; requests: number; latency: number; blocked: number; unauthorized: number };
    api: { status: string; requests: number; errors: number; responseTime: number };
    storage: { status: string; reads: number; publicReads: number; denied: number };
    database: { status: string; connections: number; latency: number };
    worker: { status: string; cpu: number; memory: number; tasks: number };
  };
}

class TelemetryService {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number = 2000;
  private isRunning: boolean = false;

  // Internal state tracking for realistic random-walk variation
  private state = {
    requests_per_min: 135,
    latency_ms: 46,
    cpu_percent: 36,
    memory_percent: 59,
    error_rate: 1.2,
    blocked_requests: 18,
    security_events: 4,
    storage_reads: 58,
    unauthorized_attempts: 6,
    risk_score: 78,
    health_status: 'HEALTHY' as 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY',
    // Subsystem metrics
    api_requests: 120,
    api_errors: 2,
    storage_public_reads: 0,
    storage_denied: 4,
    db_connections: 14,
    db_latency: 8,
    worker_tasks: 22
  };

  constructor() {
    this.seedInitialTelemetry();
  }

  private seedInitialTelemetry() {
    // Generate initial history if empty
    const existing = sqlite.getLatestTelemetry();
    if (existing.length === 0) {
      const now = Date.now();
      for (let i = 25; i >= 0; i--) {
        const timeIso = new Date(now - i * 2000).toISOString();
        this.generateTickForTime(timeIso);
      }
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => {
      try {
        this.generateTick();
      } catch (err) {
        console.error('Error in telemetry tick:', err);
      }
    }, this.intervalMs);
    // Unref so process can cleanly exit if needed
    if (this.timer.unref) this.timer.unref();
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  public reset() {
    const config = sandbox.getConfig();
    const scenarioId = config.scenario_id || 3;
    this.applyScenarioBaseline(scenarioId);
  }

  private applyScenarioBaseline(scenarioId: number) {
    if (scenarioId === 1) {
      // Gateway Vulnerable
      this.state.risk_score = 82;
      this.state.unauthorized_attempts = 14;
      this.state.blocked_requests = 3;
      this.state.error_rate = 1.4;
      this.state.storage_public_reads = 0;
      this.state.health_status = 'HEALTHY';
    } else if (scenarioId === 2) {
      // Storage Public
      this.state.risk_score = 88;
      this.state.storage_public_reads = 42;
      this.state.security_events = 6;
      this.state.unauthorized_attempts = 3;
      this.state.health_status = 'HEALTHY';
    } else if (scenarioId === 3) {
      // Self-Healing
      this.state.risk_score = 84;
      this.state.unauthorized_attempts = 12;
      this.state.health_status = 'HEALTHY';
      this.state.error_rate = 1.1;
      this.state.latency_ms = 46;
    } else if (scenarioId === 4) {
      // Overly Restrictive Fault
      this.state.risk_score = 25;
      this.state.health_status = 'DEGRADED';
      this.state.error_rate = 38.5;
      this.state.latency_ms = 295;
    } else if (scenarioId === 5) {
      // Combined
      this.state.risk_score = 92;
      this.state.unauthorized_attempts = 16;
      this.state.storage_public_reads = 48;
      this.state.security_events = 8;
      this.state.health_status = 'HEALTHY';
    }
  }

  public generateTick() {
    this.generateTickForTime(new Date().toISOString());
  }

  public generateTickForTime(timestamp: string) {
    const config = sandbox.getConfig();
    const scenarioId = config.scenario_id || 3;
    const agentState = getCurrentState();

    // 1. Determine state-based modifier
    let targetRisk = 75;
    let targetHealth: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
    let targetErrorRate = 1.2;
    let targetLatency = 45;
    let targetUnauthorized = 10;
    let targetPublicReads = 0;

    // Check sandbox config directly
    const isGatewayVulnerable = config.gateway?.routes?.some(r => r.path === '/api/records' && r.allow_anonymous && !r.block_all);
    const isGatewayBlanketBlocked = config.gateway?.routes?.some(r => r.path === '/api/records' && r.block_all);
    const isStoragePublic = config.storage?.public_read === true;

    if (isGatewayBlanketBlocked) {
      // BAD CANDIDATE APPLIED (Overly Restrictive)
      targetRisk = 18;
      targetHealth = 'DEGRADED';
      targetErrorRate = 39.2;
      targetLatency = 310;
      targetUnauthorized = 1;
    } else if (isGatewayVulnerable || isStoragePublic) {
      // VULNERABLE BASELINE
      targetRisk = isStoragePublic && isGatewayVulnerable ? 94 : isStoragePublic ? 88 : 84;
      targetHealth = 'HEALTHY';
      targetErrorRate = 1.2;
      targetLatency = 46;
      targetUnauthorized = isGatewayVulnerable ? 12 : 2;
      targetPublicReads = isStoragePublic ? 45 : 0;
    } else {
      // REMEDIATED LEAST-PRIVILEGE SAFE STATE
      targetRisk = 12;
      targetHealth = 'HEALTHY';
      targetErrorRate = 0.8;
      targetLatency = 42;
      targetUnauthorized = 0;
      targetPublicReads = 0;
    }

    // Agent state lifecycle overrides
    if (agentState === 'ROLLING_BACK') {
      targetLatency = 65;
      targetHealth = 'HEALTHY';
    } else if (agentState === 'REFLECTING') {
      targetLatency = 52;
    }

    // 2. Realistic Bounded Random Walk: next = prev + 0.2*(target - prev) + noise
    const noise = (Math.random() - 0.5) * 4;
    this.state.requests_per_min = Math.round(clamp(this.state.requests_per_min + (Math.random() - 0.5) * 8, 100, 180));
    this.state.latency_ms = Math.round(clamp(this.state.latency_ms + 0.3 * (targetLatency - this.state.latency_ms) + noise, 30, 450));
    this.state.cpu_percent = Math.round(clamp(this.state.cpu_percent + (Math.random() - 0.5) * 5, 25, 75));
    this.state.memory_percent = Math.round(clamp(this.state.memory_percent + (Math.random() - 0.5) * 2, 52, 74));
    this.state.error_rate = parseFloat(clamp(this.state.error_rate + 0.25 * (targetErrorRate - this.state.error_rate) + (Math.random() - 0.5) * 0.4, 0.2, 55).toFixed(1));
    this.state.risk_score = Math.round(clamp(this.state.risk_score + 0.25 * (targetRisk - this.state.risk_score) + (Math.random() - 0.5) * 2, 5, 98));
    this.state.unauthorized_attempts = Math.round(clamp(this.state.unauthorized_attempts + 0.3 * (targetUnauthorized - this.state.unauthorized_attempts) + (Math.random() - 0.5) * 2, 0, 30));
    this.state.storage_public_reads = Math.round(clamp(this.state.storage_public_reads + 0.3 * (targetPublicReads - this.state.storage_public_reads) + (Math.random() - 0.5) * 3, 0, 80));
    this.state.storage_reads = Math.round(clamp(this.state.storage_reads + (Math.random() - 0.5) * 6, 40, 90));
    this.state.blocked_requests = Math.round(clamp(this.state.blocked_requests + (this.state.risk_score < 30 ? 0.2 : 0) + (Math.random() - 0.5) * 3, 5, 45));
    this.state.security_events = Math.round(clamp(this.state.risk_score > 60 ? 4 + Math.random() * 3 : 1 + Math.random() * 2, 1, 15));
    this.state.health_status = targetHealth;

    // Subsystem values
    this.state.api_requests = Math.round(this.state.requests_per_min * 0.85);
    this.state.api_errors = Math.round((this.state.error_rate / 100) * this.state.api_requests);
    this.state.db_connections = Math.round(clamp(this.state.db_connections + (Math.random() - 0.5) * 2, 8, 24));
    this.state.db_latency = Math.round(clamp(this.state.db_latency + (Math.random() - 0.5), 5, 15));
    this.state.worker_tasks = Math.round(clamp(this.state.worker_tasks + (Math.random() - 0.5) * 4, 12, 35));

    // 3. Batch insert into SQLite telemetry
    const batch: Array<Omit<TelemetryRow, 'id'>> = [
      // Gateway metrics
      { timestamp, resource_id: 'cloudmend-gateway', metric_name: 'request_count', metric_value: this.state.requests_per_min, unit: 'req/min', status: targetHealth, scenario_id: scenarioId },
      { timestamp, resource_id: 'cloudmend-gateway', metric_name: 'latency_ms', metric_value: this.state.latency_ms, unit: 'ms', status: targetHealth, scenario_id: scenarioId },
      { timestamp, resource_id: 'cloudmend-gateway', metric_name: 'blocked_requests', metric_value: this.state.blocked_requests, unit: 'count', status: targetHealth, scenario_id: scenarioId },
      { timestamp, resource_id: 'cloudmend-gateway', metric_name: 'unauthorized_attempts', metric_value: this.state.unauthorized_attempts, unit: 'count', status: targetHealth, scenario_id: scenarioId },
      // API metrics
      { timestamp, resource_id: 'cloudmend-api', metric_name: 'error_rate', metric_value: this.state.error_rate, unit: '%', status: targetHealth, scenario_id: scenarioId },
      { timestamp, resource_id: 'cloudmend-api', metric_name: 'response_time', metric_value: this.state.latency_ms, unit: 'ms', status: targetHealth, scenario_id: scenarioId },
      // Storage metrics
      { timestamp, resource_id: 'cloudmend-private-records', metric_name: 'storage_reads', metric_value: this.state.storage_reads, unit: 'reads/min', status: isStoragePublic ? 'exposed' : 'healthy', scenario_id: scenarioId },
      { timestamp, resource_id: 'cloudmend-private-records', metric_name: 'public_reads', metric_value: this.state.storage_public_reads, unit: 'reads/min', status: isStoragePublic ? 'exposed' : 'healthy', scenario_id: scenarioId },
      // System & App metrics
      { timestamp, resource_id: 'cloudmend-application', metric_name: 'risk_score', metric_value: this.state.risk_score, unit: 'score', status: this.state.risk_score > 60 ? 'vulnerable' : 'safe', scenario_id: scenarioId },
      { timestamp, resource_id: 'cloudmend-application', metric_name: 'health_status', metric_value: targetHealth === 'HEALTHY' ? 98 : targetHealth === 'DEGRADED' ? 42 : 10, unit: '%', status: targetHealth, scenario_id: scenarioId },
      { timestamp, resource_id: 'cloudmend-worker', metric_name: 'cpu_percent', metric_value: this.state.cpu_percent, unit: '%', status: 'healthy', scenario_id: scenarioId },
      { timestamp, resource_id: 'cloudmend-worker', metric_name: 'memory_percent', metric_value: this.state.memory_percent, unit: '%', status: 'healthy', scenario_id: scenarioId },
      { timestamp, resource_id: 'cloudmend-application', metric_name: 'security_events', metric_value: this.state.security_events, unit: 'count', status: 'info', scenario_id: scenarioId }
    ];

    sqlite.insertTelemetryBatch(batch);

    // Update resource status in resources table
    sqlite.updateResourceStatus('cloudmend-gateway', isGatewayBlanketBlocked ? 'degraded' : isGatewayVulnerable ? 'exposed' : 'healthy');
    sqlite.updateResourceStatus('cloudmend-private-records', isStoragePublic ? 'exposed' : 'healthy');
    sqlite.updateResourceStatus('cloudmend-application', targetHealth.toLowerCase());

    // Clean up periodically (every 50 ticks)
    if (Math.random() < 0.02) {
      sqlite.cleanupTelemetry(3000);
    }
  }

  public getLatestMetrics(): TelemetrySnapshot {
    const config = sandbox.getConfig();
    const isGatewayVulnerable = config.gateway?.routes?.some(r => r.path === '/api/records' && r.allow_anonymous && !r.block_all);
    const isGatewayBlanketBlocked = config.gateway?.routes?.some(r => r.path === '/api/records' && r.block_all);
    const isStoragePublic = config.storage?.public_read === true;

    return {
      timestamp: new Date().toISOString(),
      requests_per_min: this.state.requests_per_min,
      latency_ms: this.state.latency_ms,
      cpu_percent: this.state.cpu_percent,
      memory_percent: this.state.memory_percent,
      error_rate: this.state.error_rate,
      blocked_requests: this.state.blocked_requests,
      security_events: this.state.security_events,
      storage_reads: this.state.storage_reads,
      unauthorized_attempts: this.state.unauthorized_attempts,
      risk_score: this.state.risk_score,
      health_status: this.state.health_status,
      resources: {
        gateway: {
          status: isGatewayBlanketBlocked ? 'DEGRADED' : isGatewayVulnerable ? 'EXPOSED' : 'HEALTHY',
          requests: this.state.requests_per_min,
          latency: this.state.latency_ms,
          blocked: this.state.blocked_requests,
          unauthorized: this.state.unauthorized_attempts
        },
        api: {
          status: this.state.health_status,
          requests: this.state.api_requests,
          errors: this.state.api_errors,
          responseTime: this.state.latency_ms
        },
        storage: {
          status: isStoragePublic ? 'EXPOSED' : 'HEALTHY',
          reads: this.state.storage_reads,
          publicReads: this.state.storage_public_reads,
          denied: this.state.storage_denied
        },
        database: {
          status: 'HEALTHY',
          connections: this.state.db_connections,
          latency: this.state.db_latency
        },
        worker: {
          status: 'HEALTHY',
          cpu: this.state.cpu_percent,
          memory: this.state.memory_percent,
          tasks: this.state.worker_tasks
        }
      }
    };
  }

  public getHistory(metricName?: string, resourceId?: string, limit: number = 30) {
    return sqlite.getTelemetryHistory(metricName, resourceId, limit);
  }

  public getAggregatedMetrics() {
    const latest = this.getLatestMetrics();
    const history = this.getHistory(undefined, undefined, 60);

    return {
      latest,
      historyCount: history.length,
      averages: {
        requests_per_min: this.state.requests_per_min,
        latency_ms: this.state.latency_ms,
        cpu_percent: this.state.cpu_percent,
        memory_percent: this.state.memory_percent,
        error_rate: this.state.error_rate,
        risk_score: this.state.risk_score
      }
    };
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export const telemetryService = new TelemetryService();
