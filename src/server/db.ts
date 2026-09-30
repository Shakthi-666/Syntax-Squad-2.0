import fs from 'fs';
import path from 'path';
import { RunRecord, TimelineEvent } from '../types';

const STATE_FILE_PATH = path.resolve(process.cwd(), '.cloudmend_state.json');

interface PersistedState {
  runs: RunRecord[];
  events: TimelineEvent[];
}

let inMemoryRuns: RunRecord[] = [];
let inMemoryEvents: TimelineEvent[] = [];

// Load initial state if exists
try {
  if (fs.existsSync(STATE_FILE_PATH)) {
    const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
    const parsed: PersistedState = JSON.parse(raw);
    if (Array.isArray(parsed.runs)) inMemoryRuns = parsed.runs;
    if (Array.isArray(parsed.events)) inMemoryEvents = parsed.events;
  }
} catch (e) {
  console.warn('Could not read persistent state file, using in-memory store:', e);
}

function saveToDisk() {
  try {
    const payload: PersistedState = {
      runs: inMemoryRuns.slice(0, 100),
      events: inMemoryEvents.slice(-500)
    };
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write state to disk:', e);
  }
}

export const CloudMendDB = {
  addRun: (run: RunRecord) => {
    inMemoryRuns.unshift(run);
    if (inMemoryRuns.length > 100) inMemoryRuns.pop();
    saveToDisk();
  },

  updateRun: (runId: string, updates: Partial<RunRecord>) => {
    const idx = inMemoryRuns.findIndex(r => r.run_id === runId);
    if (idx !== -1) {
      inMemoryRuns[idx] = { ...inMemoryRuns[idx], ...updates };
      saveToDisk();
    }
  },

  getRuns: (): RunRecord[] => {
    return [...inMemoryRuns];
  },

  getRunById: (runId: string): RunRecord | undefined => {
    return inMemoryRuns.find(r => r.run_id === runId);
  },

  addEvent: (event: TimelineEvent) => {
    inMemoryEvents.push(event);
    if (inMemoryEvents.length > 1000) inMemoryEvents.shift();
    saveToDisk();
  },

  getEvents: (runId?: string): TimelineEvent[] => {
    if (runId) {
      return inMemoryEvents.filter(e => e.run_id === runId);
    }
    return [...inMemoryEvents];
  },

  getRecentEvents: (limit: number = 50): TimelineEvent[] => {
    return inMemoryEvents.slice(-limit);
  },

  clearEvents: () => {
    inMemoryEvents = [];
    saveToDisk();
  }
};
