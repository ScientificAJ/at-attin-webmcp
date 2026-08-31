import { z } from 'zod';
import type { BankState, MinorATC } from './models';

const boundedText = (maximum: number) => z.string().max(maximum);
const namedText = (maximum: number) => boundedText(maximum).refine(
  (value) => value.trim().length > 0,
  'Named values must not be blank',
);
const stableId = namedText(160).regex(
  /^[A-Za-z0-9][A-Za-z0-9:_-]*$/,
  'Identifiers must be stable alphanumeric values',
);
const safeInteger = z.number().refine(Number.isSafeInteger, 'Expected a safe integer');
const nonNegativeMinor = safeInteger.refine((value) => value >= 0, 'Money cannot be negative');
const positiveMinor = safeInteger.refine((value) => value > 0, 'Money must be positive');
const calendarDate = z.string().refine(isCalendarDate, 'Expected a real YYYY-MM-DD date');
const timestamp = z.string().refine((value) => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}, 'Expected an ISO timestamp');

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const accessibilitySchema = z.object({
  largeText: z.boolean(),
  highContrast: z.boolean(),
  reducedMotion: z.boolean(),
  plainLanguage: z.boolean(),
}).strict();

const trustedContactSchema = z.object({
  name: namedText(80),
  relationship: namedText(60),
  contact: namedText(120),
}).strict();

const userSchema = z.object({
  id: stableId,
  displayName: namedText(80),
  username: namedText(80),
  preferences: z.object({
    agentAccessUnlocked: z.boolean(),
    accessibility: accessibilitySchema,
    trustedContact: trustedContactSchema.nullable(),
  }).strict(),
}).strict();

const accountSchema = z.object({
  id: stableId,
  name: namedText(80),
  type: z.enum(['current', 'savings', 'vault']),
  balance: nonNegativeMinor,
  availableBalance: nonNegativeMinor,
  currency: z.literal('ATC'),
  status: z.enum(['active', 'frozen', 'closed']),
  maskedIdentifier: namedText(40),
  balanceFloor: nonNegativeMinor,
}).strict();

const transactionSchema = z.object({
  id: stableId,
  accountId: stableId,
  cardId: stableId.optional(),
  direction: z.enum(['credit', 'debit']),
  amount: positiveMinor,
  merchant: namedText(120),
  category: namedText(80),
  date: timestamp,
  status: z.enum(['pending', 'posted', 'declined']),
  memo: boundedText(500),
  disputeStatus: z.enum(['eligible', 'open', 'resolved', 'ineligible']),
}).strict();

const payeeSchema = z.object({
  id: stableId,
  name: namedText(80),
  accountAlias: namedText(80),
  trusted: z.boolean(),
  lastPaidDate: timestamp.nullable(),
}).strict();

const recurrenceSchema = z.object({
  frequency: z.enum(['weekly', 'fortnightly', 'monthly']),
  nextDate: calendarDate,
  endDate: calendarDate.nullable(),
}).strict();

const paymentSchema = z.object({
  id: stableId,
  sourceAccountId: stableId,
  destinationAccountId: stableId.optional(),
  payeeId: stableId.optional(),
  payeeName: namedText(80).optional(),
  requestFrom: namedText(80).optional(),
  amount: positiveMinor,
  balanceFloor: nonNegativeMinor.nullable(),
  balanceFloorStatus: z.enum(['confirmed', 'requires-reconfirmation']),
  date: timestamp,
  recurrence: recurrenceSchema.nullable(),
  status: z.enum([
    'scheduled',
    'completed',
    'paused',
    'failed',
    'cancelled',
    'requested',
  ]),
  note: boundedText(500),
}).strict();

const cardSchema = z.object({
  id: stableId,
  accountId: stableId,
  maskedNumber: namedText(40),
  type: z.enum(['physical', 'virtual']),
  status: z.enum(['active', 'frozen', 'lost', 'replaced']),
  limit: positiveMinor,
  merchantControls: z.array(z.object({
    category: namedText(50),
    enabled: z.boolean(),
  }).strict()),
  onlinePayments: z.boolean(),
  contactless: z.boolean(),
  travelMode: z.boolean(),
  pinHint: namedText(240),
}).strict();

const budgetSchema = z.object({
  id: stableId,
  category: namedText(50),
  period: z.literal('monthly'),
  limit: positiveMinor,
  spent: nonNegativeMinor,
  rollover: z.boolean(),
}).strict();

const goalSchema = z.object({
  id: stableId,
  name: namedText(60),
  accountId: stableId,
  target: positiveMinor,
  savedAmount: nonNegativeMinor,
  deadline: calendarDate,
  status: z.enum(['active', 'completed']),
}).strict();

const disputeSchema = z.object({
  id: stableId,
  transactionId: stableId,
  reason: namedText(120),
  evidenceNote: boundedText(2_000),
  status: z.enum(['open', 'under-review', 'resolved']),
  createdDate: timestamp,
}).strict();

const alertSchema = z.object({
  id: stableId,
  event: z.enum(['large-payment', 'low-balance', 'card-use', 'security']),
  channel: z.enum(['in-app', 'email-simulation']),
  threshold: nonNegativeMinor.nullable(),
  enabled: z.boolean(),
}).strict();

const subscriptionSchema = z.object({
  id: stableId,
  merchant: namedText(120),
  amount: positiveMinor,
  frequency: z.enum(['monthly', 'yearly']),
  nextDate: calendarDate,
  status: z.enum(['active', 'cancelled']),
}).strict();

const supportCaseSchema = z.object({
  id: stableId,
  topic: namedText(80),
  detail: namedText(500),
  status: z.enum(['open', 'closed']),
  createdDate: timestamp,
}).strict();

const agentActionSchema = z.object({
  id: stableId,
  tool: namedText(80),
  argumentsDigest: namedText(160),
  riskLevel: z.enum(['read', 'low', 'medium', 'high', 'critical']),
  preview: z.array(namedText(500)),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'expired']),
  createdAt: timestamp,
  confirmedAt: timestamp.nullable(),
  completedAt: timestamp.nullable(),
}).strict();

const auditSchema = z.object({
  id: stableId,
  actor: z.enum(['user', 'agent', 'system']),
  eventType: namedText(80),
  target: namedText(240),
  outcome: z.enum(['success', 'cancelled', 'rejected', 'recovered']),
  timestamp,
  safeDetail: namedText(500),
}).strict();

const bankStateSchema = z.object({
  schemaVersion: z.literal(1),
  stateVersion: safeInteger.refine((value) => value >= 0, 'Version cannot be negative'),
  user: userSchema,
  accounts: z.array(accountSchema),
  transactions: z.array(transactionSchema),
  payees: z.array(payeeSchema),
  payments: z.array(paymentSchema),
  cards: z.array(cardSchema),
  budgets: z.array(budgetSchema),
  goals: z.array(goalSchema),
  disputes: z.array(disputeSchema),
  alerts: z.array(alertSchema),
  subscriptions: z.array(subscriptionSchema),
  supportCases: z.array(supportCaseSchema),
  agentActions: z.array(agentActionSchema),
  audit: z.array(auditSchema),
  usedIdempotencyKeys: z.array(namedText(240)),
  recoveryNotice: namedText(500).optional(),
}).strict();

export class BankStateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BankStateValidationError';
  }
}

function ensureUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new BankStateValidationError(`${label} must be unique`);
  }
}

function asMinor(value: number): MinorATC {
  return value as MinorATC;
}

export function validateBankStateInvariants(state: Readonly<BankState>): void {
  ensureUnique(state.accounts.map(({ id }) => id), 'Account identifiers');
  ensureUnique(state.transactions.map(({ id }) => id), 'Transaction identifiers');
  ensureUnique(state.payees.map(({ id }) => id), 'Payee identifiers');
  ensureUnique(state.payments.map(({ id }) => id), 'Payment identifiers');
  ensureUnique(state.cards.map(({ id }) => id), 'Card identifiers');
  ensureUnique(state.budgets.map(({ id }) => id), 'Budget identifiers');
  ensureUnique(state.goals.map(({ id }) => id), 'Goal identifiers');
  ensureUnique(state.disputes.map(({ id }) => id), 'Dispute identifiers');
  ensureUnique(state.alerts.map(({ id }) => id), 'Alert identifiers');
  ensureUnique(state.subscriptions.map(({ id }) => id), 'Subscription identifiers');
  ensureUnique(state.supportCases.map(({ id }) => id), 'Support-case identifiers');
  ensureUnique(state.agentActions.map(({ id }) => id), 'Agent-action identifiers');
  ensureUnique(state.audit.map(({ id }) => id), 'Audit identifiers');
  ensureUnique(state.usedIdempotencyKeys, 'Idempotency keys');
  ensureUnique(
    state.payees.map(({ accountAlias }) => accountAlias.toLocaleLowerCase('en-US')),
    'Payee account aliases',
  );

  const accountIds = new Set(state.accounts.map(({ id }) => id));
  const cardById = new Map(state.cards.map((card) => [card.id, card]));
  const payeeIds = new Set(state.payees.map(({ id }) => id));
  const transactionIds = new Set(state.transactions.map(({ id }) => id));

  for (const account of state.accounts) {
    if (account.balance < account.balanceFloor
      || account.availableBalance < account.balanceFloor
      || account.availableBalance > account.balance) {
      throw new BankStateValidationError(`${account.id} violates its account floor`);
    }
  }

  for (const transaction of state.transactions) {
    if (!accountIds.has(transaction.accountId)) {
      throw new BankStateValidationError(`${transaction.id} references a missing account`);
    }
    if (transaction.cardId) {
      const card = cardById.get(transaction.cardId);
      if (!card || card.accountId !== transaction.accountId) {
        throw new BankStateValidationError(`${transaction.id} references an invalid card`);
      }
    }
  }

  for (const card of state.cards) {
    if (!accountIds.has(card.accountId)) {
      throw new BankStateValidationError(`${card.id} references a missing account`);
    }
    ensureUnique(
      card.merchantControls.map(({ category }) => category.toLocaleLowerCase('en-US')),
      `${card.id} merchant-control categories`,
    );
  }

  for (const payment of state.payments) {
    if (!accountIds.has(payment.sourceAccountId)
      || (payment.destinationAccountId && !accountIds.has(payment.destinationAccountId))
      || (payment.payeeId && !payeeIds.has(payment.payeeId))) {
      throw new BankStateValidationError(`${payment.id} has an invalid payment link`);
    }
    const hasHistoricalPayee = Boolean(
      payment.payeeName
      && ['completed', 'cancelled'].includes(payment.status),
    );
    if (!payment.payeeId
      && !payment.destinationAccountId
      && !payment.requestFrom
      && !hasHistoricalPayee) {
      throw new BankStateValidationError(`${payment.id} has no payment destination`);
    }
    if (payment.balanceFloorStatus === 'confirmed' && payment.balanceFloor === null) {
      throw new BankStateValidationError(`${payment.id} has no confirmed balance floor`);
    }
    if (payment.balanceFloorStatus === 'requires-reconfirmation'
      && payment.balanceFloor !== null) {
      throw new BankStateValidationError(`${payment.id} has an unconfirmed balance floor`);
    }
    if (payment.balanceFloorStatus === 'requires-reconfirmation'
      && payment.status === 'scheduled') {
      throw new BankStateValidationError(`${payment.id} must not run before floor reconfirmation`);
    }
    if (payment.status === 'requested' && !payment.requestFrom) {
      throw new BankStateValidationError(`${payment.id} is an invalid money request`);
    }
    if (payment.status === 'paused' && !payment.recurrence) {
      throw new BankStateValidationError(`${payment.id} cannot pause without recurrence`);
    }
    if (payment.recurrence) {
      if (payment.date.slice(0, 10) !== payment.recurrence.nextDate
        || (payment.recurrence.endDate
          && payment.recurrence.endDate < payment.recurrence.nextDate)) {
        throw new BankStateValidationError(`${payment.id} has inconsistent recurrence dates`);
      }
    }
  }

  const goalBacking = new Map<string, number>();
  for (const goal of state.goals) {
    if (!accountIds.has(goal.accountId) || goal.savedAmount > goal.target) {
      throw new BankStateValidationError(`${goal.id} has invalid savings-goal values`);
    }
    goalBacking.set(goal.accountId, (goalBacking.get(goal.accountId) ?? 0) + goal.savedAmount);
    if (!Number.isSafeInteger(goalBacking.get(goal.accountId))) {
      throw new BankStateValidationError(`${goal.accountId} has unsafe goal backing`);
    }
  }
  for (const [accountId, reserved] of goalBacking) {
    const account = state.accounts.find(({ id }) => id === accountId)!;
    if (account.availableBalance < asMinor(reserved)) {
      throw new BankStateValidationError(`${accountId} does not back its savings goals`);
    }
  }

  ensureUnique(state.disputes.map(({ transactionId }) => transactionId), 'Disputed transactions');
  for (const dispute of state.disputes) {
    if (!transactionIds.has(dispute.transactionId)) {
      throw new BankStateValidationError(`${dispute.id} references a missing transaction`);
    }
  }
}

export function parseBankState(value: unknown): BankState {
  const result = bankStateSchema.safeParse(value);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new BankStateValidationError(first?.message ?? 'Saved banking state is invalid');
  }
  const state = result.data as BankState;
  validateBankStateInvariants(state);
  return state;
}
