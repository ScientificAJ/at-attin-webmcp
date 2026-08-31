import type { AuditEvent, BankState } from './models';
import { createSeedState } from './seed';
import {
  createStorageAdapter,
  type KeyValueStorage,
  type StorageAdapter,
} from './storage';

export type BankReducer = (draft: BankState) => BankState | void;

export type TransactionFailure =
  | { ok: false; code: 'duplicate' }
  | { ok: false; code: 'stale' }
  | { ok: false; code: 'persistence' };

export type TransactionSuccess = { ok: true; state: Readonly<BankState> };
export type TransactionResult = TransactionSuccess | TransactionFailure;

export interface BankStore {
  getState(): Readonly<BankState>;
  transact(
    expectedVersion: number,
    idempotencyKey: string,
    reducer: BankReducer,
  ): TransactionResult;
  subscribe(listener: () => void): () => void;
  reset(): TransactionResult;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
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

export function createBankStore(
  storage: KeyValueStorage | StorageAdapter = defaultStorage(),
  clock: () => Date = () => new Date(),
): BankStore {
  const adapter = storage instanceof Object && 'load' in storage
    ? storage as StorageAdapter
    : createStorageAdapter(storage as KeyValueStorage);
  const loaded = adapter.load();
  let state = deepFreeze(
    loaded.state ?? {
      ...createSeedState(clock()),
      ...(loaded.recoveryNotice ? { recoveryNotice: loaded.recoveryNotice } : {}),
    },
  );
  const listeners = new Set<() => void>();

  if (!loaded.state) {
    adapter.save(state);
  }

  function publish(next: BankState): TransactionSuccess {
    state = deepFreeze(next);
    for (const listener of listeners) {
      listener();
    }
    return { ok: true, state };
  }

  return {
    getState: () => state,
    transact(expectedVersion, idempotencyKey, reducer) {
      if (state.usedIdempotencyKeys.includes(idempotencyKey)) {
        return { ok: false, code: 'duplicate' };
      }
      if (state.stateVersion !== expectedVersion) {
        return { ok: false, code: 'stale' };
      }

      const draft = structuredClone(state) as BankState;
      const reduced = reducer(draft);
      const next = reduced ?? draft;
      next.schemaVersion = 1;
      next.stateVersion = state.stateVersion + 1;
      next.usedIdempotencyKeys = [...next.usedIdempotencyKeys, idempotencyKey];

      try {
        adapter.save(next);
      } catch {
        return { ok: false, code: 'persistence' };
      }
      return publish(next);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset() {
      const seeded = createSeedState(clock());
      const resetAudit: AuditEvent = {
        id: `audit-reset-${clock().getTime()}`,
        actor: 'user',
        eventType: 'demo_reset',
        target: 'bank-state',
        outcome: 'success',
        timestamp: clock().toISOString(),
        safeDetail: 'Canonical fictional banking state restored.',
      };
      seeded.audit.push(resetAudit);
      try {
        adapter.save(seeded);
      } catch {
        return { ok: false, code: 'persistence' };
      }
      return publish(seeded);
    },
  };
}
