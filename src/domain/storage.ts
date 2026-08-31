import type { BankState } from './models';
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
}

export class StorageAdapter {
  constructor(private readonly storage: KeyValueStorage) {}

  load(): StorageLoadResult {
    const raw = this.storage.getItem(BANK_STORAGE_KEY);
    if (raw === null) {
      return { state: null };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<BankState>;
      if (parsed.schemaVersion !== BANK_SCHEMA_VERSION) {
        return this.recover(raw, 'An unsupported saved demo was backed up and reset.');
      }
      return { state: parsed as BankState };
    } catch {
      return this.recover(raw, 'An unreadable saved demo was backed up and reset.');
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
