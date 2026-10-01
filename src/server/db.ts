import { sqlite } from './sqlite';
import { RunRecord, TimelineEvent } from '../types';

export const CloudMendDB = {
  addRun: (run: RunRecord) => {
    sqlite.insertRun(run);
  },

  updateRun: (runId: string, updates: Partial<RunRecord>) => {
    const existing = sqlite.getRunById(runId);
    if (existing) {
      sqlite.insertRun({ ...existing, ...updates });
    }
  },

  getRuns: (): RunRecord[] => {
    return sqlite.getRuns(100);
  },

  getRunById: (runId: string): RunRecord | undefined => {
    return sqlite.getRunById(runId);
  },

  addEvent: (event: TimelineEvent) => {
    sqlite.insertAuditEvent(event);
    // If it's a security-relevant event, also insert into security_events
    if (event.category === 'SCAN' || event.category === 'EVIDENCE' || event.category === 'PROBE' || event.category === 'REGRESSION') {
      sqlite.insertSecurityEvent({
        timestamp: event.timestamp,
        event_type: event.category,
        severity: event.level === 'error' ? 'CRITICAL' : event.level === 'warning' ? 'HIGH' : 'INFO',
        resource_id: 'cloudmend-gateway',
        message: `${event.title}: ${event.description}`,
        run_id: event.run_id,
        metadata_json: event.metadata ? JSON.stringify(event.metadata) : null
      });
    }
  },

  getEvents: (runId?: string): TimelineEvent[] => {
    return sqlite.getEvents(runId);
  },

  getRecentEvents: (limit: number = 50): TimelineEvent[] => {
    return sqlite.getRecentEvents(limit);
  },

  clearEvents: () => {
    // Audit log retention
  }
};
