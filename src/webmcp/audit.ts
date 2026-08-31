import type {
  AgentAction,
  AuditEvent,
} from '../domain/models';
import type { KeyValueStorage } from '../domain/storage';
import type { ConfirmableAction } from './contracts';

export const AGENT_AUDIT_STORAGE_KEY = 'at-attin.webmcp-audit.v1';
export const AGENT_AUDIT_BACKUP_KEY = 'at-attin.webmcp-audit.backup';

type JournalPhase = 'pending' | 'final';

interface JournalRecord {
  id: string;
  attemptId: string;
  phase: JournalPhase;
  tool: string;
  argumentsDigest: string;
  riskLevel: AgentAction['riskLevel'];
  preview: string[];
  status: AgentAction['status'];
  outcome: AuditEvent['outcome'] | null;
  createdAt: string;
  finalizedAt: string | null;
  safeDetail: string;
}

interface JournalEnvelope {
  schemaVersion: 1;
  records: JournalRecord[];
}

export interface AgentAuditJournal {
  begin(action: ConfirmableAction, createdAt: string): string;
  finish(
    attemptId: string,
    status: AgentAction['status'],
    outcome: AuditEvent['outcome'],
    finalizedAt: string,
  ): boolean;
  recordRejected(tool: string, safeDetail: string, createdAt: string): void;
  getActions(): readonly AgentAction[];
  getEvents(): readonly AuditEvent[];
  subscribe(listener: () => void): () => void;
}

function defaultStorage(): KeyValueStorage {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isJournalRecord(value: unknown): value is JournalRecord {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.attemptId === 'string'
    && ['pending', 'final'].includes(String(value.phase))
    && typeof value.tool === 'string'
    && typeof value.argumentsDigest === 'string'
    && ['read', 'low', 'medium', 'high', 'critical'].includes(String(value.riskLevel))
    && isStringArray(value.preview)
    && ['pending', 'confirmed', 'completed', 'cancelled', 'expired'].includes(String(value.status))
    && (value.outcome === null || ['success', 'cancelled', 'rejected', 'recovered'].includes(String(value.outcome)))
    && typeof value.createdAt === 'string'
    && (value.finalizedAt === null || typeof value.finalizedAt === 'string')
    && typeof value.safeDetail === 'string';
}

function readEnvelope(storage: KeyValueStorage): JournalEnvelope {
  const raw = storage.getItem(AGENT_AUDIT_STORAGE_KEY);
  if (raw === null) return { schemaVersion: 1, records: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)
      || parsed.schemaVersion !== 1
      || !Array.isArray(parsed.records)
      || !parsed.records.every(isJournalRecord)) {
      throw new Error('invalid-agent-audit');
    }
    return { schemaVersion: 1, records: parsed.records };
  } catch {
    try {
      storage.setItem(AGENT_AUDIT_BACKUP_KEY, raw);
      storage.removeItem(AGENT_AUDIT_STORAGE_KEY);
    } catch {
      throw new Error('agent-audit-unavailable');
    }
    return { schemaVersion: 1, records: [] };
  }
}

export function createAgentAuditJournal(
  storage: KeyValueStorage = defaultStorage(),
): AgentAuditJournal {
  let envelope = readEnvelope(storage);
  let sequence = envelope.records.length;
  const listeners = new Set<() => void>();

  const append = (record: JournalRecord): void => {
    const next: JournalEnvelope = {
      schemaVersion: 1,
      records: [...envelope.records, record],
    };
    try {
      storage.setItem(AGENT_AUDIT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw new Error('agent-audit-unavailable');
    }
    envelope = next;
    for (const listener of listeners) listener();
  };

  return {
    begin(action, createdAt) {
      sequence += 1;
      const attemptId = `${action.id}-${sequence}`;
      append({
        id: `${attemptId}-pending`,
        attemptId,
        phase: 'pending',
        tool: action.operation,
        argumentsDigest: action.id.replace(/^prepared-/, ''),
        riskLevel: action.risk,
        preview: [...action.disclosure, ...action.consequences],
        status: 'pending',
        outcome: null,
        createdAt,
        finalizedAt: null,
        safeDetail: 'Prepared action is waiting at the At Attin confirmation boundary.',
      });
      return attemptId;
    },
    finish(attemptId, status, outcome, finalizedAt) {
      const pending = envelope.records.find((record) => (
        record.attemptId === attemptId && record.phase === 'pending'
      ));
      if (!pending) return false;
      try {
        append({
          ...pending,
          id: `${attemptId}-${status}-${envelope.records.length + 1}`,
          phase: 'final',
          status,
          outcome,
          finalizedAt,
          safeDetail: outcome === 'success'
            ? 'At Attin confirmation completed the prepared action.'
            : `Prepared action ended: ${status}.`,
        });
        return true;
      } catch {
        return false;
      }
    },
    recordRejected(tool, safeDetail, createdAt) {
      sequence += 1;
      const attemptId = `rejected-${sequence}-${createdAt}`;
      append({
        id: `${attemptId}-rejected`,
        attemptId,
        phase: 'final',
        tool,
        argumentsDigest: 'rejected-before-preparation',
        riskLevel: 'read',
        preview: [],
        status: 'cancelled',
        outcome: 'rejected',
        createdAt,
        finalizedAt: createdAt,
        safeDetail,
      });
    },
    getActions() {
      const latest = new Map<string, JournalRecord>();
      for (const record of envelope.records) latest.set(record.attemptId, record);
      return Array.from(latest.values()).map((record): AgentAction => ({
        id: `agent-${record.attemptId}`,
        tool: record.tool,
        argumentsDigest: record.argumentsDigest,
        riskLevel: record.riskLevel,
        preview: [...record.preview],
        status: record.status,
        createdAt: record.createdAt,
        confirmedAt: record.status === 'completed' ? record.finalizedAt : null,
        completedAt: record.status === 'completed' ? record.finalizedAt : null,
      }));
    },
    getEvents() {
      return envelope.records
        .filter((record): record is JournalRecord & {
          outcome: AuditEvent['outcome'];
          finalizedAt: string;
        } => record.phase === 'final'
          && record.outcome !== null
          && record.finalizedAt !== null)
        .map((record): AuditEvent => ({
          id: `audit-${record.id}`,
          actor: 'agent',
          eventType: record.tool,
          target: record.attemptId,
          outcome: record.outcome,
          timestamp: record.finalizedAt,
          safeDetail: record.safeDetail,
        }));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
