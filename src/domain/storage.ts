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

const PAYMENT_SAFEGUARD_NOTICE =
  'Saved payments with an unknown confirmed balance floor need review. Actionable payments were paused or cancelled; a human must explicitly reconfirm a valid floor before they can run.';

function migratePaymentSafeguards(value: unknown): boolean {
  if (!isRecord(value)
    || value.schemaVersion !== BANK_SCHEMA_VERSION
    || !Array.isArray(value.payees)
    || !Array.isArray(value.payments)) {
    return false;
  }

  const payeeNames = new Map<string, string>();
  for (const payee of value.payees) {
    if (isRecord(payee)
      && typeof payee.id === 'string'
      && typeof payee.name === 'string') {
      payeeNames.set(payee.id, payee.name);
    }
  }

  let migrated = false;
  let requiresSafeguardReview = false;
  for (const payment of value.payments) {
    if (!isRecord(payment)) continue;

    const payeeName = typeof payment.payeeId === 'string'
      ? payeeNames.get(payment.payeeId)
      : undefined;
    if (payment.payeeName === undefined && payeeName !== undefined) {
      payment.payeeName = payeeName;
      migrated = true;
    }

    if (payment.balanceFloorStatus !== undefined) continue;

    payment.balanceFloor = null;
    payment.balanceFloorStatus = 'requires-reconfirmation';
    if (payment.status === 'scheduled') {
      payment.status = isRecord(payment.recurrence) ? 'paused' : 'cancelled';
    }
    migrated = true;
    requiresSafeguardReview = true;
  }

  if (requiresSafeguardReview) {
    value.recoveryNotice = PAYMENT_SAFEGUARD_NOTICE;
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
      const needsSave = migratePaymentSafeguards(parsed);
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
