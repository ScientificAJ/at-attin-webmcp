import type { BankState } from '../models';
import {
  searchTransactions,
  selectAccount,
  selectAccounts,
  selectAgentAudit,
  selectBudgets,
  selectCardControls,
  selectCards,
  selectCashFlow,
  selectGoals,
  selectIncomeSummary,
  selectOverview,
  selectPayees,
  selectRecurringActivity,
  selectScheduledPayments,
  selectSecurityStatus,
  selectSpendingSummary,
  selectSubscriptions,
  selectTransaction,
  type TransactionSearch,
} from '../selectors';
import type {
  BankStore,
  TransactionFailure,
  TransactionResult,
} from '../store';
import { prepareCardOperation } from './cards';
import { preparePaymentOperation } from './payments';
import { preparePlanningOperation } from './planning';
import { preparePreferenceOperation } from './preferences';
import { prepareSupportOperation } from './support';
import {
  requiredDate,
  requiredMinor,
  requiredString,
} from './utils';

export const READ_OPERATION_NAMES = [
  'get_overview',
  'list_accounts',
  'get_account',
  'search_transactions',
  'get_transaction',
  'get_spending_summary',
  'get_cash_flow',
  'get_income_summary',
  'list_recurring_activity',
  'list_payees',
  'list_scheduled_payments',
  'list_cards',
  'get_card_controls',
  'list_budgets',
  'list_goals',
  'list_subscriptions',
  'get_agent_audit',
  'get_security_status',
] as const;

export const PAYMENT_OPERATION_NAMES = [
  'transfer_money',
  'pay_payee',
  'schedule_payment',
  'create_recurring_payment',
  'update_recurring_payment',
  'pause_recurring_payment',
  'resume_recurring_payment',
  'cancel_scheduled_payment',
  'retry_failed_payment',
  'request_money',
  'add_payee',
  'update_payee',
  'remove_payee',
] as const;

export const CARD_OPERATION_NAMES = [
  'set_card_freeze',
  'set_card_limit',
  'set_merchant_control',
  'set_online_payments',
  'set_contactless',
  'set_travel_mode',
  'reveal_card_pin',
  'report_card_lost',
  'replace_card',
] as const;

export const PLANNING_OPERATION_NAMES = [
  'create_budget',
  'update_budget',
  'create_savings_goal',
  'update_savings_goal',
  'fund_savings_goal',
  'withdraw_from_goal',
  'categorize_transaction',
  'add_transaction_note',
  'prepare_monthly_plan',
] as const;

export const SUPPORT_DOMAIN_OPERATION_NAMES = [
  'start_transaction_dispute',
  'add_dispute_note',
  'secure_suspicious_charge',
  'create_support_case',
] as const;

export const PREFERENCE_OPERATION_NAMES = [
  'set_alert_preference',
  'set_accessibility_mode',
  'manage_trusted_contact',
] as const;

export const SUPPORT_OPERATION_NAMES = [
  ...SUPPORT_DOMAIN_OPERATION_NAMES,
  ...PREFERENCE_OPERATION_NAMES,
] as const;

export const OPERATION_NAMES = [
  ...READ_OPERATION_NAMES,
  ...PAYMENT_OPERATION_NAMES,
  ...CARD_OPERATION_NAMES,
  ...PLANNING_OPERATION_NAMES,
  ...SUPPORT_OPERATION_NAMES,
] as const;

export type OperationName = (typeof OPERATION_NAMES)[number];
export type ReadOperationName = (typeof READ_OPERATION_NAMES)[number];
export type PaymentOperationName = (typeof PAYMENT_OPERATION_NAMES)[number];
export type CardOperationName = (typeof CARD_OPERATION_NAMES)[number];
export type PlanningOperationName = (typeof PLANNING_OPERATION_NAMES)[number];
export type SupportOperationName = (typeof SUPPORT_OPERATION_NAMES)[number];
export type OperationRisk = 'read' | 'low' | 'medium' | 'high' | 'critical';
export type Clock = () => Date;

export type OperationCommitSuccess = {
  ok: true;
  state: Readonly<BankState>;
  data?: unknown;
};
export type OperationCommitResult = OperationCommitSuccess | TransactionFailure;

export interface PreparedOperation {
  id: string;
  operation: OperationName;
  title: string;
  risk: OperationRisk;
  readOnly: boolean;
  requiresTypedConfirmation: boolean;
  disclosure: string[];
  consequences: string[];
  expectedVersion: number;
  idempotencyKey: string;
  commit(): OperationCommitResult;
}

export interface OperationContext {
  state: Readonly<BankState>;
  operation: OperationName;
  args: Record<string, unknown>;
  now: Date;
  operationId: string;
}

export interface OperationPlan {
  title: string;
  risk: OperationRisk;
  disclosure: string[];
  consequences: string[];
  data?: unknown;
  reducer?: (draft: BankState) => BankState | void;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableSerialize(nested)}`)
    .join(',')}}`;
}

function stableDigest(value: unknown): string {
  const serialized = stableSerialize(value);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function asArgs(args: unknown): Record<string, unknown> {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    throw new Error('Operation arguments must be an object');
  }
  return args as Record<string, unknown>;
}

function stringArg(args: Record<string, unknown>, name: string): string {
  return requiredString(args, name, 120);
}

function assertAllowedKeys(
  args: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const unknown = Object.keys(args).find((key) => !allowed.includes(key));
  if (unknown) {
    throw new Error(`${unknown} is not accepted by this operation`);
  }
}

function strictStringArg(
  args: Record<string, unknown>,
  name: string,
  maximumLength: number,
): string | undefined {
  if (args[name] === undefined) return undefined;
  return requiredString(args, name, maximumLength);
}

function strictEnumArg<const T extends readonly string[]>(
  args: Record<string, unknown>,
  name: string,
  values: T,
): T[number] | undefined {
  if (args[name] === undefined) return undefined;
  const value = requiredString(args, name);
  if (!values.includes(value)) {
    throw new Error(`${name} is not a supported value`);
  }
  return value as T[number];
}

function strictLimit(args: Record<string, unknown>): number | undefined {
  if (args.limit === undefined) return undefined;
  if (!Number.isSafeInteger(args.limit) || (args.limit as number) < 1 || (args.limit as number) > 100) {
    throw new Error('limit must be a safe integer from 1 to 100');
  }
  return args.limit as number;
}

function readDateRange(args: Record<string, unknown>) {
  const from = args.from === undefined ? undefined : requiredDate(args, 'from');
  const to = args.to === undefined ? undefined : requiredDate(args, 'to');
  if (from && to && from > to) {
    throw new Error('from must not follow to');
  }
  return { from, to };
}

function readTransactionFilters(
  state: Readonly<BankState>,
  args: Record<string, unknown>,
  mode: 'search' | 'spending' | 'cash-flow',
): TransactionSearch {
  const allowed = mode === 'search'
    ? [
      'query', 'accountId', 'category', 'direction', 'status', 'from', 'to',
      'minimumMinor', 'maximumMinor', 'limit',
    ]
    : mode === 'spending'
      ? ['query', 'accountId', 'category', 'status', 'from', 'to', 'minimumMinor', 'maximumMinor']
      : ['accountId', 'from', 'to'];
  assertAllowedKeys(args, allowed);

  const query = mode === 'cash-flow' ? undefined : strictStringArg(args, 'query', 120);
  const accountId = strictStringArg(args, 'accountId', 120);
  if (accountId && !state.accounts.some(({ id }) => id === accountId)) {
    throw new Error('Account was not found');
  }
  const category = mode === 'cash-flow' ? undefined : strictStringArg(args, 'category', 50);
  const direction = mode === 'search'
    ? strictEnumArg(args, 'direction', ['credit', 'debit'] as const)
    : undefined;
  const status = mode === 'cash-flow'
    ? undefined
    : strictEnumArg(args, 'status', ['pending', 'posted', 'declined'] as const);
  const { from, to } = readDateRange(args);
  const minimumMinor = mode === 'cash-flow' || args.minimumMinor === undefined
    ? undefined
    : requiredMinor(args, 'minimumMinor', { allowZero: true });
  const maximumMinor = mode === 'cash-flow' || args.maximumMinor === undefined
    ? undefined
    : requiredMinor(args, 'maximumMinor', { allowZero: true });
  if (minimumMinor !== undefined
    && maximumMinor !== undefined
    && minimumMinor > maximumMinor) {
    throw new Error('minimumMinor must not exceed maximumMinor');
  }
  const limit = mode === 'search' ? strictLimit(args) : undefined;
  return {
    ...(query === undefined ? {} : { query }),
    ...(accountId === undefined ? {} : { accountId }),
    ...(category === undefined ? {} : { category }),
    ...(direction === undefined ? {} : { direction }),
    ...(status === undefined ? {} : { status }),
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
    ...(minimumMinor === undefined ? {} : { minimumMinor }),
    ...(maximumMinor === undefined ? {} : { maximumMinor }),
    ...(limit === undefined ? {} : { limit }),
  };
}

function noReadArgs(args: Record<string, unknown>): void {
  assertAllowedKeys(args, []);
}

function readPlan(context: OperationContext, operation: ReadOperationName): OperationPlan {
  const { state, args } = context;
  switch (operation) {
    case 'get_overview':
      noReadArgs(args);
      return {
        title: 'Share account overview',
        risk: 'read',
        disclosure: ['Your account names and balances'],
        consequences: [],
        data: selectOverview(state),
      };
    case 'list_accounts':
      noReadArgs(args);
      return {
        title: 'Share accounts',
        risk: 'read',
        disclosure: ['Account names, balances, status, and masked identifiers'],
        consequences: [],
        data: selectAccounts(state),
      };
    case 'get_account': {
      assertAllowedKeys(args, ['accountId']);
      return {
        title: 'Share account detail',
        risk: 'read',
        disclosure: ['One account balance, status, and masked identifier'],
        consequences: [],
        data: selectAccount(state, stringArg(args, 'accountId')),
      };
    }
    case 'search_transactions': {
      const filters = readTransactionFilters(state, args, 'search');
      return {
        title: 'Share matching transactions',
        risk: 'read',
        disclosure: ['Matching merchant names, amounts, categories, dates, and notes'],
        consequences: [],
        data: searchTransactions(state, filters),
      };
    }
    case 'get_transaction':
      assertAllowedKeys(args, ['transactionId']);
      return {
        title: 'Share transaction detail',
        risk: 'read',
        disclosure: ['Merchant, amount, category, date, status, and transaction note'],
        consequences: [],
        data: selectTransaction(state, stringArg(args, 'transactionId')),
      };
    case 'get_spending_summary': {
      const filters = readTransactionFilters(state, args, 'spending');
      return {
        title: 'Share spending summary',
        risk: 'read',
        disclosure: ['Spending totals and category breakdown'],
        consequences: [],
        data: selectSpendingSummary(state, filters),
      };
    }
    case 'get_cash_flow': {
      const filters = readTransactionFilters(state, args, 'cash-flow');
      return {
        title: 'Share cash flow',
        risk: 'read',
        disclosure: ['Money in, money out, and net cash flow'],
        consequences: [],
        data: selectCashFlow(state, filters),
      };
    }
    case 'get_income_summary': {
      const filters = readTransactionFilters(state, args, 'cash-flow');
      return {
        title: 'Share income summary',
        risk: 'read',
        disclosure: ['Income totals and matching incoming transactions'],
        consequences: [],
        data: selectIncomeSummary(state, filters),
      };
    }
    case 'list_recurring_activity':
      noReadArgs(args);
      return {
        title: 'Share recurring activity',
        risk: 'read',
        disclosure: ['Detected subscription merchants, amounts, and next dates'],
        consequences: [],
        data: selectRecurringActivity(state),
      };
    case 'list_payees':
      noReadArgs(args);
      return {
        title: 'Share payees',
        risk: 'read',
        disclosure: ['Payee names, masked aliases, trust status, and last-paid dates'],
        consequences: [],
        data: selectPayees(state),
      };
    case 'list_scheduled_payments':
      noReadArgs(args);
      return {
        title: 'Share scheduled payments',
        risk: 'read',
        disclosure: ['Upcoming and paused payment amounts, dates, and payee identifiers'],
        consequences: [],
        data: selectScheduledPayments(state),
      };
    case 'list_cards':
      noReadArgs(args);
      return {
        title: 'Share cards',
        risk: 'read',
        disclosure: ['Masked card identifiers, linked accounts, types, and status'],
        consequences: [],
        data: selectCards(state),
      };
    case 'get_card_controls':
      assertAllowedKeys(args, ['cardId']);
      return {
        title: 'Share card controls',
        risk: 'read',
        disclosure: ['One card’s limit, status, and payment controls'],
        consequences: [],
        data: selectCardControls(state, stringArg(args, 'cardId')),
      };
    case 'list_budgets':
      noReadArgs(args);
      return {
        title: 'Share budgets',
        risk: 'read',
        disclosure: ['Budget categories, limits, and spending progress'],
        consequences: [],
        data: selectBudgets(state),
      };
    case 'list_goals':
      noReadArgs(args);
      return {
        title: 'Share savings goals',
        risk: 'read',
        disclosure: ['Goal names, targets, saved amounts, and deadlines'],
        consequences: [],
        data: selectGoals(state),
      };
    case 'list_subscriptions':
      noReadArgs(args);
      return {
        title: 'Share subscriptions',
        risk: 'read',
        disclosure: ['Subscription merchants, amounts, cadence, and next dates'],
        consequences: [],
        data: selectSubscriptions(state),
      };
    case 'get_agent_audit': {
      assertAllowedKeys(args, ['limit']);
      const limit = strictLimit(args) ?? 50;
      return {
        title: 'Share agent audit',
        risk: 'read',
        disclosure: ['Safe agent-action outcomes and timestamps'],
        consequences: [],
        data: selectAgentAudit(state, limit),
      };
    }
    case 'get_security_status':
      noReadArgs(args);
      return {
        title: 'Share security status',
        risk: 'read',
        disclosure: ['Agent-access, card, dispute, and trusted-contact status'],
        consequences: [],
        data: selectSecurityStatus(state),
      };
  }
}

function includes<const T extends readonly string[]>(values: T, name: string): name is T[number] {
  return values.includes(name);
}

function planFor(context: OperationContext): OperationPlan {
  const { operation } = context;
  if (includes(READ_OPERATION_NAMES, operation)) {
    return readPlan(context, operation);
  }
  if (includes(PAYMENT_OPERATION_NAMES, operation)) {
    return preparePaymentOperation(context, operation);
  }
  if (includes(CARD_OPERATION_NAMES, operation)) {
    return prepareCardOperation(context, operation);
  }
  if (includes(PLANNING_OPERATION_NAMES, operation)) {
    return preparePlanningOperation(context, operation);
  }
  if (includes(SUPPORT_DOMAIN_OPERATION_NAMES, operation)) {
    return prepareSupportOperation(context, operation);
  }
  if (includes(PREFERENCE_OPERATION_NAMES, operation)) {
    return preparePreferenceOperation(context, operation);
  }
  throw new Error(`Unsupported operation: ${operation}`);
}

export function isOperationName(value: string): value is OperationName {
  return OPERATION_NAMES.includes(value as OperationName);
}

export function prepareOperation(
  store: BankStore,
  operation: OperationName | string,
  rawArgs: unknown,
  clock: Clock = () => new Date(),
): PreparedOperation {
  if (!isOperationName(operation)) {
    throw new Error(`Unsupported operation: ${operation}`);
  }
  const args = asArgs(rawArgs);
  const state = store.getState();
  const now = clock();
  const digest = stableDigest({ operation, args, version: state.stateVersion, at: now.toISOString() });
  const operationId = `${operation}-${digest}`;
  const idempotencyKey = `operation-${digest}`;
  const context: OperationContext = { state, operation, args, now, operationId };
  const plan = planFor(context);
  const readOnly = plan.reducer === undefined;
  let readCommitted = false;

  return {
    id: `prepared-${digest}`,
    operation,
    title: plan.title,
    risk: plan.risk,
    readOnly,
    requiresTypedConfirmation: plan.risk === 'critical',
    disclosure: [...plan.disclosure],
    consequences: [...plan.consequences],
    expectedVersion: state.stateVersion,
    idempotencyKey,
    commit() {
      if (readOnly) {
        if (readCommitted) {
          return { ok: false, code: 'duplicate' };
        }
        if (store.getState().stateVersion !== state.stateVersion) {
          return { ok: false, code: 'stale' };
        }
        readCommitted = true;
        return { ok: true, state: store.getState(), data: structuredClone(plan.data) };
      }

      const result: TransactionResult = store.transact(
        state.stateVersion,
        idempotencyKey,
        plan.reducer!,
      );
      if (!result.ok) {
        return result;
      }
      return {
        ...result,
        ...(plan.data === undefined ? {} : { data: structuredClone(plan.data) }),
      };
    },
  };
}
