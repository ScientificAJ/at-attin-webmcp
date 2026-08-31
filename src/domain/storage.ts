import type { BankState } from './models';
import { parseBankState } from './schema';
import { BANK_SCHEMA_VERSION } from './seed';

export const BANK_STORAGE_KEY = 'at-attin.bank.v1';
export const BANK_BACKUP_KEY = 'at-attin.bank.backup';

export type KeyValueStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

export interface StorageLoadResult {
  state: BankState | null;
  recoveryNotice?: string;
  needsSave?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function migratePaymentFloors(value: unknown): boolean {
  if (!isRecord(value)
    || value.schemaVersion !== BANK_SCHEMA_VERSION
    || !Array.isArray(value.accounts)
    || !Array.isArray(value.payments)) {
    return false;
  }
  const accountFloors = new Map<string, number>();
  for (const account of value.accounts) {
    if (isRecord(account)
      && typeof account.id === 'string'
      && Number.isSafeInteger(account.balanceFloor)
      && (account.balanceFloor as number) >= 0) {
      accountFloors.set(account.id, account.balanceFloor as number);
    }
  }
  let migrated = false;
  for (const payment of value.payments) {
    if (!isRecord(payment) || payment.balanceFloor !== undefined) continue;
    const sourceFloor = typeof payment.sourceAccountId === 'string'
      ? accountFloors.get(payment.sourceAccountId)
      : undefined;
    if (sourceFloor !== undefined) {
      payment.balanceFloor = sourceFloor;
      migrated = true;
    }
  }
  return migrated;
}

export class StorageAdapter {
  constructor(private readonly storage: KeyValueStorage) {}

  load(): StorageLoadResult {
    const raw = this.storage.getItem(BANK_STORAGE_KEY);
    if (raw === null) {
      return { state: null };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return this.recover(raw, 'An unreadable saved demo was backed up and reset.');
    }

    if (!isRecord(parsed) || parsed.schemaVersion !== BANK_SCHEMA_VERSION) {
      return this.recover(raw, 'An unsupported saved demo was backed up and reset.');
    }

    try {
      const needsSave = migratePaymentFloors(parsed);
      return { state: parseBankState(parsed), needsSave };
    } catch {
      return this.recover(raw, 'An invalid saved demo was backed up and reset.');
    }
  }

  save(state: BankState): void {
    this.storage.setItem(BANK_STORAGE_KEY, JSON.stringify(state));
  }

  clear(): void {
    this.storage.removeItem(BANK_STORAGE_KEY);
  }

  private recover(raw: string, recoveryNotice: string): StorageLoadResult {
    this.storage.setItem(BANK_BACKUP_KEY, raw);
    this.clear();
    return { state: null, recoveryNotice };
  }
}

export function createStorageAdapter(storage: KeyValueStorage): StorageAdapter {
  return new StorageAdapter(storage);
}
