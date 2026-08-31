import { atc, formatATC, subtractATC } from '../money';
import type {
  Account,
  AuditEvent,
  BankState,
  Card,
  Dispute,
  Goal,
  MinorATC,
  Payee,
  Payment,
  Transaction,
} from '../models';
import type { OperationContext } from './types';

export const MAX_OPERATION_AMOUNT = atc(1_000_000);

export function requiredString(
  args: Record<string, unknown>,
  name: string,
  maximumLength = 120,
): string {
  const value = args[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required`);
  }
  const normalized = value.trim();
  if (normalized.length > maximumLength) {
    throw new Error(`${name} must be ${maximumLength} characters or fewer`);
  }
  return normalized;
}

export function optionalString(
  args: Record<string, unknown>,
  name: string,
  maximumLength = 240,
): string | undefined {
  const value = args[name];
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`${name} must be text`);
  }
  const normalized = value.trim();
  if (normalized.length > maximumLength) {
    throw new Error(`${name} must be ${maximumLength} characters or fewer`);
  }
  return normalized;
}

export function requiredBoolean(args: Record<string, unknown>, name: string): boolean {
  const value = args[name];
  if (typeof value !== 'boolean') {
    throw new Error(`${name} must be true or false`);
  }
  return value;
}

export function optionalBoolean(
  args: Record<string, unknown>,
  name: string,
): boolean | undefined {
  const value = args[name];
  if (value === undefined) {
    return undefined;
  }
  return requiredBoolean(args, name);
}

export function requiredMinor(
  args: Record<string, unknown>,
  name: string,
  options: { allowZero?: boolean; maximum?: MinorATC } = {},
): MinorATC {
  const value = args[name];
  const minimum = options.allowZero ? 0 : 1;
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new Error(`${name} must be a positive integer number of ATC minor units`);
  }
  const maximum = options.maximum ?? MAX_OPERATION_AMOUNT;
  if ((value as number) > maximum) {
    throw new Error(`${name} must not exceed ${formatATC(maximum)}`);
  }
  return value as MinorATC;
}

export function optionalMinor(
  args: Record<string, unknown>,
  name: string,
  options: { allowZero?: boolean; maximum?: MinorATC } = {},
): MinorATC | undefined {
  if (args[name] === undefined) {
    return undefined;
  }
  return requiredMinor(args, name, options);
}

export function requiredDate(
  args: Record<string, unknown>,
  name: string,
  now?: Date,
): string {
  const value = requiredString(args, name, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${name} must use YYYY-MM-DD`);
  }
  if (now && value < now.toISOString().slice(0, 10)) {
    throw new Error(`${name} must not be in the past`);
  }
  return value;
}

export function displayDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

export function findAccount(state: Readonly<BankState>, id: string): Account {
  const account = state.accounts.find((item) => item.id === id);
  if (!account) {
    throw new Error('Account was not found');
  }
  if (account.status !== 'active') {
    throw new Error(`${account.name} is not active`);
  }
  return account;
}

export function findPayee(state: Readonly<BankState>, id: string): Payee {
  const payee = state.payees.find((item) => item.id === id);
  if (!payee) {
    throw new Error('Payee was not found');
  }
  return payee;
}

export function findPayment(state: Readonly<BankState>, id: string): Payment {
  const payment = state.payments.find((item) => item.id === id);
  if (!payment) {
    throw new Error('Payment was not found');
  }
  return payment;
}

export function findCard(state: Readonly<BankState>, id: string): Card {
  const card = state.cards.find((item) => item.id === id);
  if (!card) {
    throw new Error('Card was not found');
  }
  return card;
}

export function findGoal(state: Readonly<BankState>, id: string): Goal {
  const goal = state.goals.find((item) => item.id === id);
  if (!goal) {
    throw new Error('Savings goal was not found');
  }
  return goal;
}

export function findTransaction(state: Readonly<BankState>, id: string): Transaction {
  const transaction = state.transactions.find((item) => item.id === id);
  if (!transaction) {
    throw new Error('Transaction was not found');
  }
  return transaction;
}

export function findDispute(state: Readonly<BankState>, id: string): Dispute {
  const dispute = state.disputes.find((item) => item.id === id);
  if (!dispute) {
    throw new Error('Dispute was not found');
  }
  return dispute;
}

export function floorAfter(
  account: Account,
  amount: MinorATC,
  requestedFloor?: MinorATC,
): { after: MinorATC; floor: MinorATC } {
  const floor = requestedFloor ?? account.balanceFloor;
  const after = subtractATC(account.availableBalance, amount);
  if (after < floor) {
    throw new Error(`Payment would cross your ${formatATC(floor)} balance floor`);
  }
  return { after, floor };
}

export function mutableAccount(state: BankState, id: string): Account {
  const account = state.accounts.find((item) => item.id === id);
  if (!account) {
    throw new Error('Prepared account is no longer available');
  }
  return account;
}

export function mutablePayment(state: BankState, id: string): Payment {
  const payment = state.payments.find((item) => item.id === id);
  if (!payment) {
    throw new Error('Prepared payment is no longer available');
  }
  return payment;
}

export function mutableCard(state: BankState, id: string): Card {
  const card = state.cards.find((item) => item.id === id);
  if (!card) {
    throw new Error('Prepared card is no longer available');
  }
  return card;
}

export function mutableGoal(state: BankState, id: string): Goal {
  const goal = state.goals.find((item) => item.id === id);
  if (!goal) {
    throw new Error('Prepared savings goal is no longer available');
  }
  return goal;
}

export function mutableTransaction(state: BankState, id: string): Transaction {
  const transaction = state.transactions.find((item) => item.id === id);
  if (!transaction) {
    throw new Error('Prepared transaction is no longer available');
  }
  return transaction;
}

export function appendAudit(
  state: BankState,
  context: OperationContext,
  target: string,
  safeDetail: string,
): AuditEvent {
  const audit: AuditEvent = {
    id: `audit-${context.operationId}`,
    actor: 'system',
    eventType: context.operation,
    target,
    outcome: 'success',
    timestamp: context.now.toISOString(),
    safeDetail,
  };
  state.audit.push(audit);
  return audit;
}

export function slug(value: string): string {
  const normalized = value
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return normalized || 'record';
}
