import { vi } from 'vitest';
import { atc } from '../domain/money';
import {
  OPERATION_NAMES,
  type OperationName,
} from '../domain/operations/types';
import { createBankStore } from '../domain/store';
import { memoryStorage } from '../test/memory-storage';
import { ModelContextFake } from '../test/model-context-fake';
import { ToolBridge } from './bridge';
import {
  IMPERATIVE_TOOL_NAMES,
  createImperativeTools,
} from './catalog';
import {
  ConfirmationCoordinator,
  hasTrustedUserActivation,
} from './confirmation';
import {
  DECLARATIVE_TOOL_NAMES,
  type WebMCPTool,
} from './contracts';
import { ToolRegistry } from './registry';

const fixedClock = () => new Date('2026-08-31T09:00:00.000Z');

const VALID_ARGS: Record<OperationName, Record<string, unknown>> = {
  get_overview: {},
  list_accounts: {},
  get_account: { accountId: 'account-daily' },
  search_transactions: { query: 'orbit', limit: 10 },
  get_transaction: { transactionId: 'transaction-orbit' },
  get_spending_summary: {},
  get_cash_flow: {},
  get_income_summary: {},
  list_recurring_activity: {},
  list_payees: {},
  list_scheduled_payments: {},
  list_cards: {},
  get_card_controls: { cardId: 'card-daily' },
  list_budgets: {},
  list_goals: {},
  list_subscriptions: {},
  get_agent_audit: { limit: 10 },
  get_security_status: {},
  transfer_money: {
    sourceAccountId: 'account-daily',
    destinationAccountId: 'account-rainy',
    amountMinor: atc(100),
    balanceFloorMinor: atc(5_000),
  },
  pay_payee: {
    sourceAccountId: 'account-daily',
    payeeId: 'payee-mara',
    amountMinor: atc(100),
    balanceFloorMinor: atc(5_000),
  },
  schedule_payment: {
    sourceAccountId: 'account-daily',
    payeeId: 'payee-mara',
    amountMinor: atc(100),
    balanceFloorMinor: atc(5_000),
    date: '2026-09-12',
  },
  create_recurring_payment: {
    sourceAccountId: 'account-daily',
    payeeId: 'payee-orbit',
    amountMinor: atc(100),
    balanceFloorMinor: atc(5_000),
    frequency: 'monthly',
    nextDate: '2026-09-15',
  },
  update_recurring_payment: {
    paymentId: 'payment-northstar-recurring',
    amountMinor: atc(180),
  },
  pause_recurring_payment: { paymentId: 'payment-northstar-recurring' },
  resume_recurring_payment: { paymentId: 'payment-orbit-paused' },
  cancel_scheduled_payment: { paymentId: 'payment-orbit-scheduled' },
  retry_failed_payment: { paymentId: 'payment-foundry-failed' },
  request_money: { from: 'Mara Vale', amountMinor: atc(75), note: 'Lunch' },
  add_payee: { name: 'Rook & Pine', accountAlias: 'ROOK •• 6677', trusted: false },
  update_payee: { payeeId: 'payee-mara', name: 'Mara V.' },
  remove_payee: { payeeId: 'payee-mara' },
  set_card_freeze: { cardId: 'card-daily', frozen: true },
  set_card_limit: { cardId: 'card-daily', limitMinor: atc(2_000) },
  set_merchant_control: { cardId: 'card-daily', category: 'Gambling', enabled: true },
  set_online_payments: { cardId: 'card-daily', enabled: false },
  set_contactless: { cardId: 'card-daily', enabled: false },
  set_travel_mode: { cardId: 'card-daily', enabled: true },
  reveal_card_pin: { cardId: 'card-daily' },
  report_card_lost: { cardId: 'card-daily' },
  replace_card: { cardId: 'card-daily' },
  create_budget: { category: 'Dining', limitMinor: atc(500), rollover: false },
  update_budget: { budgetId: 'budget-groceries', limitMinor: atc(700) },
  create_savings_goal: {
    name: 'Bicycle',
    accountId: 'account-rainy',
    targetMinor: atc(2_400),
    deadline: '2027-04-01',
  },
  update_savings_goal: { goalId: 'goal-lisbon', targetMinor: atc(6_500) },
  fund_savings_goal: {
    goalId: 'goal-lisbon',
    sourceAccountId: 'account-daily',
    amountMinor: atc(100),
    balanceFloorMinor: atc(5_000),
  },
  withdraw_from_goal: {
    goalId: 'goal-lisbon',
    destinationAccountId: 'account-daily',
    amountMinor: atc(100),
  },
  categorize_transaction: {
    transactionId: 'transaction-orbit',
    category: 'Professional services',
  },
  add_transaction_note: {
    transactionId: 'transaction-orbit',
    note: 'August studio bill',
  },
  prepare_monthly_plan: { month: '2026-09' },
  start_transaction_dispute: {
    transactionId: 'transaction-suspicious',
    reason: 'Card payment not recognized',
    evidenceNote: 'Reviewed recent activity.',
  },
  add_dispute_note: { disputeId: 'dispute-demo-open', note: 'Receipt checked.' },
  secure_suspicious_charge: {
    transactionId: 'transaction-suspicious',
    reason: 'card-not-present',
  },
  create_support_case: {
    topic: 'Payment help',
    detail: 'Need help tracing a transfer.',
  },
  set_alert_preference: {
    event: 'low-balance',
    channel: 'in-app',
    thresholdMinor: atc(5_100),
    enabled: true,
  },
  set_accessibility_mode: { mode: 'highContrast', enabled: true },
  manage_trusted_contact: {
    action: 'set',
    contact: {
      name: 'Mara Vale',
      relationship: 'Friend',
      contact: 'mara@example.test',
    },
  },
};

function trustedEvent(): Event {
  return { isTrusted: true } as Event;
}

function untrustedEvent(): Event {
  return { isTrusted: false } as Event;
}

async function promiseSettled(promise: Promise<unknown>): Promise<boolean> {
  const marker = Symbol('pending');
  return Promise.race([
    promise.then(() => true, () => true),
    Promise.resolve(marker),
  ]).then((value) => value !== marker);
}

function harness() {
  const store = createBankStore(memoryStorage(), fixedClock);
  const coordinator = new ConfirmationCoordinator({
    clock: fixedClock,
    trustPredicate: (event) => event.isTrusted,
  });
  const bridge = new ToolBridge(store, coordinator, { clock: fixedClock });
  return { store, coordinator, bridge };
}

function walkParameterDescriptions(schema: WebMCPTool['inputSchema']): string[] {
  const descriptions: string[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (typeof record.description === 'string') descriptions.push(record.description);
    for (const nested of Object.values(record)) visit(nested);
  };
  for (const property of Object.values(schema.properties ?? {})) visit(property);
  return descriptions;
}

describe('secured native WebMCP catalogue', () => {
  it('exposes exactly 56 distinct imperative descriptors and four visible declarative names', () => {
    expect(IMPERATIVE_TOOL_NAMES).toHaveLength(56);
    expect(IMPERATIVE_TOOL_NAMES).toEqual(OPERATION_NAMES);
    expect(DECLARATIVE_TOOL_NAMES).toEqual([
      'filter_transactions_form',
      'choose_statement_period',
      'compare_report_periods',
      'filter_agent_audit',
    ]);
    expect(new Set([...IMPERATIVE_TOOL_NAMES, ...DECLARATIVE_TOOL_NAMES]).size).toBe(60);
  });

  it('uses a closed bounded unique schema and concise same-origin descriptor for every operation', () => {
    const tools = createImperativeTools(async () => '{"status":"completed"}');

    expect(tools.map(({ name }) => name)).toEqual([...IMPERATIVE_TOOL_NAMES]);
    expect(new Set(tools.map(({ inputSchema }) => inputSchema)).size).toBe(56);
    for (const tool of tools) {
      expect(tool.name.length).toBeLessThan(30);
      expect(tool.description.length).toBeLessThan(500);
      expect(tool.inputSchema).toMatchObject({
        type: 'object',
        additionalProperties: false,
      });
      expect(walkParameterDescriptions(tool.inputSchema).every(
        (description) => description.length < 150,
      )).toBe(true);
      expect(tool).not.toHaveProperty('exposedTo');
      expect(tool.name).not.toMatch(/approve|confirm|unlock/i);
    }
  });

  it('applies read-only and untrusted-content hints only to the declared sets', () => {
    const tools = createImperativeTools(async () => '{"status":"completed"}');
    const readOnly = tools
      .filter(({ annotations }) => annotations?.readOnlyHint)
      .map(({ name }) => name);
    const untrusted = tools
      .filter(({ annotations }) => annotations?.untrustedContentHint)
      .map(({ name }) => name);

    expect(readOnly).toEqual([
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
      'reveal_card_pin',
      'prepare_monthly_plan',
    ]);
    expect(untrusted).toEqual([
      'search_transactions',
      'get_transaction',
      'get_spending_summary',
      'get_income_summary',
      'list_recurring_activity',
      'list_payees',
      'list_scheduled_payments',
      'list_budgets',
      'list_goals',
      'list_subscriptions',
      'get_agent_audit',
      'prepare_monthly_plan',
    ]);
  });

  it('pauses every read and mutation at app-owned confirmation before commit or disclosure', async () => {
    for (const operation of OPERATION_NAMES) {
      const { coordinator, bridge } = harness();
      const promise = bridge.run(operation, VALID_ARGS[operation], new AbortController().signal);

      expect(await promiseSettled(promise), operation).toBe(false);
      const pending = coordinator.getSnapshot();
      expect(pending.status, operation).toBe('pending');
      coordinator.approve(
        trustedEvent(),
        pending.status === 'pending' && pending.requiresTypedConfirmation ? 'YES' : undefined,
      );
      const output = await promise;
      expect(output, operation).toContain('"status":"completed"');
      expect(output.length, operation).toBeLessThan(1_500);
    }
  });
});

describe('confirmation authorization boundary', () => {
  it('does not disclose a read until a trusted active confirmation is approved', async () => {
    const { coordinator, bridge } = harness();
    const promise = bridge.run('get_overview', {}, new AbortController().signal);

    expect(await promiseSettled(promise)).toBe(false);
    expect(() => coordinator.approve(untrustedEvent())).toThrow(
      'trusted-user-activation-required',
    );
    expect(await promiseSettled(promise)).toBe(false);
    coordinator.approve(trustedEvent());
    const result = JSON.parse(await promise) as Record<string, unknown>;
    expect(result).toMatchObject({ status: 'completed', tool: 'get_overview' });
    expect(result).toHaveProperty('data');
  });

  it('requires typed uppercase YES for critical operations while retaining the pending task', async () => {
    const { coordinator, bridge } = harness();
    const critical = bridge.run('secure_suspicious_charge', {
      transactionId: 'transaction-suspicious',
      reason: 'card-not-present',
    }, new AbortController().signal);

    expect(() => coordinator.approve(untrustedEvent(), 'YES')).toThrow(
      'trusted-user-activation-required',
    );
    expect(() => coordinator.approve(trustedEvent(), 'yes')).toThrow(
      'type-YES-to-confirm',
    );
    expect(coordinator.getSnapshot().status).toBe('pending');
    coordinator.approve(trustedEvent(), 'YES');
    await expect(critical).resolves.toContain('"status":"completed"');
  });

  it('allows only one pending task and rejects replay or duplicate approval', async () => {
    const { coordinator, bridge } = harness();
    const first = bridge.run('get_overview', {}, new AbortController().signal);

    await expect(bridge.run(
      'list_accounts',
      {},
      new AbortController().signal,
    )).rejects.toThrow('agent-action-already-pending');
    coordinator.approve(trustedEvent());
    await first;
    expect(() => coordinator.approve(trustedEvent())).toThrow('no-pending-confirmation');
  });

  it('expires after exactly 90 seconds and records the cancelled agent outcome', async () => {
    vi.useFakeTimers();
    try {
      const { store, bridge } = harness();
      const promise = bridge.run('get_overview', {}, new AbortController().signal);

      await vi.advanceTimersByTimeAsync(89_999);
      expect(await promiseSettled(promise)).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await expect(promise).rejects.toThrow('confirmation-expired');
      expect(store.getState().audit.at(-1)).toMatchObject({
        actor: 'agent',
        eventType: 'get_overview',
        outcome: 'cancelled',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels on the invocation AbortSignal without committing or disclosing', async () => {
    const { store, bridge } = harness();
    const abort = new AbortController();
    const before = structuredClone(store.getState());
    const promise = bridge.run('set_card_freeze', {
      cardId: 'card-daily',
      frozen: true,
    }, abort.signal);

    abort.abort();
    await expect(promise).rejects.toThrow('confirmation-aborted');
    expect(store.getState().cards).toEqual(before.cards);
  });

  it('rejects a version-stale preview and consumes its authorization once', async () => {
    const { store, coordinator, bridge } = harness();
    const promise = bridge.run('get_overview', {}, new AbortController().signal);
    expect(store.transact(0, 'outside-change', (draft) => {
      draft.user.displayName = 'State changed';
    })).toMatchObject({ ok: true });

    coordinator.approve(trustedEvent());
    await expect(promise).rejects.toThrow('stale-preview');
    expect(() => coordinator.approve(trustedEvent())).toThrow('no-pending-confirmation');
  });

  it('requires both a trusted event and active navigator user activation in production', () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'userActivation');
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { isActive: true },
    });
    try {
      expect(hasTrustedUserActivation(trustedEvent())).toBe(true);
      expect(hasTrustedUserActivation(untrustedEvent())).toBe(false);
      Object.defineProperty(navigator, 'userActivation', {
        configurable: true,
        value: { isActive: false },
      });
      expect(hasTrustedUserActivation(trustedEvent())).toBe(false);
    } finally {
      if (descriptor) {
        Object.defineProperty(navigator, 'userActivation', descriptor);
      } else {
        Reflect.deleteProperty(navigator, 'userActivation');
      }
    }
  });
});

describe('native registration lifecycle', () => {
  it('registers only after sign-in and unlock using the native signal shape', async () => {
    const { bridge } = harness();
    const modelContext = new ModelContextFake();
    const registry = new ToolRegistry({ bridge, getModelContext: () => modelContext });

    await registry.sync({ signedIn: false, agentUnlocked: false });
    await registry.sync({ signedIn: true, agentUnlocked: false });
    expect(modelContext.tools.size).toBe(0);

    await registry.sync({ signedIn: true, agentUnlocked: true });
    expect(modelContext.tools.size).toBe(56);
    expect(modelContext.registrations.every(({ signal }) => signal instanceof AbortSignal)).toBe(true);
    expect(modelContext.registrations.every(({ tool }) => !('exposedTo' in tool))).toBe(true);
  });

  it('forwards the callback AbortSignal and cancels pending work on logout, lock, and teardown', async () => {
    const { bridge } = harness();
    const modelContext = new ModelContextFake();
    const registry = new ToolRegistry({ bridge, getModelContext: () => modelContext });
    await registry.sync({ signedIn: true, agentUnlocked: true });

    const invocation = new AbortController();
    const pending = modelContext.execute('get_overview', {}, invocation.signal);
    await registry.sync({ signedIn: false, agentUnlocked: false });
    await expect(pending).rejects.toThrow('confirmation-logout');
    expect(modelContext.tools.size).toBe(0);

    await registry.sync({ signedIn: true, agentUnlocked: true });
    const locked = modelContext.execute('get_overview', {});
    await registry.sync({ signedIn: true, agentUnlocked: false });
    await expect(locked).rejects.toThrow('confirmation-lock');

    await registry.sync({ signedIn: true, agentUnlocked: true });
    const tornDown = modelContext.execute('get_overview', {});
    registry.dispose();
    await expect(tornDown).rejects.toThrow('confirmation-teardown');
    expect(modelContext.tools.size).toBe(0);
  });

  it('feature-detects an unavailable model context without registering or failing', async () => {
    const { bridge } = harness();
    const registry = new ToolRegistry({ bridge, getModelContext: () => undefined });

    await expect(registry.sync({ signedIn: true, agentUnlocked: true })).resolves.toBeUndefined();
    registry.dispose();
  });

  it('re-registers after a framework teardown rehearsal', async () => {
    const { bridge } = harness();
    const modelContext = new ModelContextFake();
    const registry = new ToolRegistry({ bridge, getModelContext: () => modelContext });

    await registry.sync({ signedIn: true, agentUnlocked: true });
    expect(modelContext.tools.size).toBe(56);
    registry.dispose();
    expect(modelContext.tools.size).toBe(0);

    await registry.sync({ signedIn: true, agentUnlocked: true });
    expect(modelContext.tools.size).toBe(56);
  });
});
