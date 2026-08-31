import { atc, formatATC } from './money';
import {
  OPERATION_NAMES,
  prepareOperation,
  type OperationName,
} from './operations/types';
import { createSeedState } from './seed';
import { createBankStore } from './store';
import {
  BANK_BACKUP_KEY,
  BANK_STORAGE_KEY,
} from './storage';
import {
  searchTransactions,
  selectCashFlow,
  selectOverview,
  selectRecurringActivity,
  selectSpendingSummary,
} from './selectors';
import { memoryStorage } from '../test/memory-storage';

const fixedClock = () => new Date('2026-08-31T09:00:00Z');

describe('fictional banking core', () => {
  it('accepts valid two-decimal ATC despite binary floating-point representation', () => {
    expect(atc(382.45)).toBe(38245);
    expect(atc(144.2)).toBe(14420);
  });

  it('seeds the approved 42,860 ATC total', () => {
    const state = createSeedState(fixedClock());

    expect(state.accounts.map((account) => account.balance)).toEqual([
      atc(8440),
      atc(24000),
      atc(10420),
    ]);
    expect(state.accounts.reduce((sum, item) => sum + item.balance, 0)).toBe(
      atc(42860),
    );
    expect(formatATC(atc(42860))).toBe('42,860 ATC');
    expect(() => atc(1.005)).toThrow('ATC units must have at most two decimals');
  });

  it('seeds every stable record needed by the complete fictional bank', () => {
    const state = createSeedState(fixedClock());

    expect(state.accounts.map(({ id }) => id)).toEqual([
      'account-daily',
      'account-vault',
      'account-rainy',
    ]);
    expect(state.transactions.slice(0, 3).map(({ merchant, direction, amount }) => ({
      merchant,
      direction,
      amount,
    }))).toEqual([
      { merchant: 'Orbit Works', direction: 'debit', amount: atc(1250) },
      { merchant: 'Solace Labs', direction: 'credit', amount: atc(3600) },
      { merchant: 'Foundry Supply', direction: 'debit', amount: atc(980) },
    ]);
    expect(state.payees.map(({ id }) => id)).toEqual([
      'payee-orbit',
      'payee-mara',
      'payee-foundry',
      'payee-northstar',
    ]);
    expect(state.cards.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: 'card-daily', status: 'active' },
      { id: 'card-vault', status: 'frozen' },
    ]);
    expect(state.budgets.map(({ category }) => category)).toEqual([
      'Groceries',
      'Transport',
    ]);
    expect(state.goals).toEqual([
      expect.objectContaining({ id: 'goal-lisbon', name: 'Lisbon' }),
    ]);
    expect(state.subscriptions).toHaveLength(3);
    expect(state.transactions).toContainEqual(
      expect.objectContaining({
        id: 'transaction-suspicious',
        cardId: 'card-daily',
        disputeStatus: 'eligible',
      }),
    );
  });

  it('persists one immutable version and rejects duplicate, stale, and failed writes', () => {
    const storage = memoryStorage();
    const store = createBankStore(storage, fixedClock);
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    const first = store.transact(0, 'profile-1', (draft) => {
      draft.user.displayName = 'John A. Attin';
    });

    expect(first).toMatchObject({ ok: true });
    expect(store.getState()).toMatchObject({ stateVersion: 1 });
    expect(store.getState().user.displayName).toBe('John A. Attin');
    expect(Object.isFrozen(store.getState())).toBe(true);
    expect(notifications).toBe(1);
    expect(store.transact(0, 'profile-1', () => undefined)).toEqual({
      ok: false,
      code: 'duplicate',
    });
    expect(store.transact(0, 'profile-2', () => undefined)).toEqual({
      ok: false,
      code: 'stale',
    });

    const reloaded = createBankStore(storage, fixedClock);
    expect(reloaded.getState()).toMatchObject({
      stateVersion: 1,
      user: { displayName: 'John A. Attin' },
    });

    let failWrites = false;
    const failingStorage: Storage = {
      ...memoryStorage(),
      get length() {
        return storage.length;
      },
      clear: () => storage.clear(),
      getItem: (key) => storage.getItem(key),
      key: (index) => storage.key(index),
      removeItem: (key) => storage.removeItem(key),
      setItem: (key, value) => {
        if (failWrites) {
          throw new Error('disk full');
        }
        storage.setItem(key, value);
      },
    };
    const guardedStore = createBankStore(failingStorage, fixedClock);
    let guardedNotifications = 0;
    guardedStore.subscribe(() => {
      guardedNotifications += 1;
    });
    failWrites = true;
    expect(guardedStore.transact(1, 'profile-3', (draft) => {
      draft.user.displayName = 'Must not commit';
    })).toEqual({ ok: false, code: 'persistence' });
    expect(guardedStore.getState().user.displayName).toBe('John A. Attin');
    expect(guardedNotifications).toBe(0);
  });

  it('backs up an unknown version and reset restores the canonical demo', () => {
    const unknown = JSON.stringify({ schemaVersion: 77, private: 'legacy' });
    const storage = memoryStorage({ [BANK_STORAGE_KEY]: unknown });
    const store = createBankStore(storage, fixedClock);

    expect(storage.getItem(BANK_BACKUP_KEY)).toBe(unknown);
    expect(store.getState().recoveryNotice).toMatch(/backed up and reset/i);
    expect(store.getState().accounts[0]?.balance).toBe(atc(8440));

    store.transact(0, 'spend-1', (draft) => {
      draft.accounts[0]!.balance = atc(1);
    });
    expect(store.reset()).toMatchObject({ ok: true });
    expect(store.getState().accounts[0]?.balance).toBe(atc(8440));
    expect(store.getState().audit.at(-1)).toMatchObject({ eventType: 'demo_reset' });
  });

  it('provides presentation-safe overview, search, spending, cash-flow, and recurrence projections', () => {
    const state = createSeedState(fixedClock());

    expect(selectOverview(state)).toMatchObject({
      totalBalance: atc(42860),
      accountCount: 3,
    });
    expect(searchTransactions(state, { query: 'ORBIT' })).toEqual([
      expect.objectContaining({ id: 'transaction-orbit', merchant: 'Orbit Works' }),
    ]);
    expect(selectSpendingSummary(state)).toEqual(
      expect.objectContaining({ totalSpent: expect.any(Number) }),
    );
    expect(selectCashFlow(state)).toEqual(
      expect.objectContaining({ inflow: atc(3600), net: expect.any(Number) }),
    );
    expect(selectRecurringActivity(state)).toHaveLength(3);
  });

  it('previews and atomically commits a floor-protected payment once', () => {
    const store = createBankStore(memoryStorage(), fixedClock);
    const prepared = prepareOperation(
      store,
      'pay_payee',
      {
        sourceAccountId: 'account-daily',
        payeeId: 'payee-mara',
        amountMinor: atc(420),
        balanceFloorMinor: atc(5000),
      },
      fixedClock,
    );

    expect(store.getState().accounts[0]?.balance).toBe(atc(8440));
    expect(prepared.consequences).toContain('Balance after: 8,020 ATC');
    expect(prepared.commit()).toMatchObject({ ok: true });
    expect(store.getState().accounts[0]?.balance).toBe(atc(8020));
    expect(prepared.commit()).toMatchObject({ ok: false, code: 'duplicate' });
  });

  it('rejects a floor breach before preparing a payment', () => {
    const store = createBankStore(memoryStorage(), fixedClock);

    expect(() => prepareOperation(store, 'pay_payee', {
      sourceAccountId: 'account-daily',
      payeeId: 'payee-mara',
      amountMinor: atc(4000),
      balanceFloorMinor: atc(5000),
    }, fixedClock)).toThrow('Payment would cross your 5,000 ATC balance floor');
    expect(store.getState().stateVersion).toBe(0);
  });

  it('prepares a read disclosure without mutating or disclosing until commit', () => {
    const store = createBankStore(memoryStorage(), fixedClock);
    const prepared = prepareOperation(store, 'get_overview', {}, fixedClock);

    expect(prepared).toMatchObject({ risk: 'read', expectedVersion: 0 });
    expect(prepared.disclosure).toContain('Your account names and balances');
    expect(store.getState().stateVersion).toBe(0);
    expect(prepared.commit()).toMatchObject({
      ok: true,
      data: { totalBalance: atc(42860) },
    });
    expect(store.getState().stateVersion).toBe(0);
    expect(prepared.commit()).toMatchObject({ ok: false, code: 'duplicate' });
  });

  it('moves money between accounts in one atomic version', () => {
    const store = createBankStore(memoryStorage(), fixedClock);
    const prepared = prepareOperation(store, 'transfer_money', {
      sourceAccountId: 'account-daily',
      destinationAccountId: 'account-rainy',
      amountMinor: atc(100),
      balanceFloorMinor: atc(5000),
      note: 'Rainy-day top-up',
    }, fixedClock);

    expect(prepared.consequences).toEqual(expect.arrayContaining([
      'Daily Account balance after: 8,340 ATC',
      'Rainy Day balance after: 10,520 ATC',
    ]));
    expect(prepared.commit()).toMatchObject({ ok: true });
    expect(store.getState().accounts.map(({ balance }) => balance)).toEqual([
      atc(8340),
      atc(24000),
      atc(10520),
    ]);
    expect(store.getState().transactions.filter(({ id }) => id.includes('transfer'))).toHaveLength(2);
  });

  it('creates a recurring payment with the chosen floor and cadence', () => {
    const store = createBankStore(memoryStorage(), fixedClock);
    const prepared = prepareOperation(store, 'create_recurring_payment', {
      sourceAccountId: 'account-daily',
      payeeId: 'payee-orbit',
      amountMinor: atc(420),
      balanceFloorMinor: atc(5000),
      frequency: 'monthly',
      nextDate: '2026-09-15',
      note: 'Studio rent',
    }, fixedClock);

    expect(prepared.consequences).toEqual(expect.arrayContaining([
      'First payment: 15 September 2026',
      'Balance floor: 5,000 ATC',
    ]));
    expect(prepared.commit()).toMatchObject({ ok: true });
    expect(store.getState().payments.at(-1)).toMatchObject({
      payeeId: 'payee-orbit',
      status: 'scheduled',
      recurrence: { frequency: 'monthly', nextDate: '2026-09-15' },
    });
    expect(store.getState().accounts[0]?.balance).toBe(atc(8440));
  });

  it('updates cards, planning, alerts, accessibility, and trusted-contact state', () => {
    const store = createBankStore(memoryStorage(), fixedClock);

    expect(prepareOperation(store, 'set_card_limit', {
      cardId: 'card-daily',
      limitMinor: atc(2000),
    }, fixedClock).commit()).toMatchObject({ ok: true });
    expect(prepareOperation(store, 'fund_savings_goal', {
      goalId: 'goal-lisbon',
      sourceAccountId: 'account-daily',
      amountMinor: atc(100),
      balanceFloorMinor: atc(5000),
    }, fixedClock).commit()).toMatchObject({ ok: true });
    expect(prepareOperation(store, 'set_alert_preference', {
      event: 'low-balance',
      channel: 'in-app',
      thresholdMinor: atc(5500),
      enabled: true,
    }, fixedClock).commit()).toMatchObject({ ok: true });
    expect(prepareOperation(store, 'set_accessibility_mode', {
      mode: 'largeText',
      enabled: true,
    }, fixedClock).commit()).toMatchObject({ ok: true });
    expect(prepareOperation(store, 'manage_trusted_contact', {
      action: 'set',
      contact: {
        name: 'Mara Vale',
        relationship: 'Friend',
        contact: 'mara@example.test',
      },
    }, fixedClock).commit()).toMatchObject({ ok: true });

    const state = store.getState();
    expect(state.accounts.find(({ id }) => id === 'account-daily')).toMatchObject({
      balance: atc(8340),
    });
    expect(state.cards.find(({ id }) => id === 'card-daily')).toMatchObject({
      limit: atc(2000),
    });
    expect(state.goals.find(({ id }) => id === 'goal-lisbon')).toMatchObject({
      savedAmount: atc(2100),
    });
    expect(state.alerts.find(({ event }) => event === 'low-balance')).toMatchObject({
      threshold: atc(5500),
    });
    expect(state.user.preferences.accessibility.largeText).toBe(true);
    expect(state.user.preferences.trustedContact).toMatchObject({ name: 'Mara Vale' });
  });

  it('freezes the affected card and opens one suspicious-charge dispute atomically', () => {
    const store = createBankStore(memoryStorage(), fixedClock);
    const prepared = prepareOperation(store, 'secure_suspicious_charge', {
      transactionId: 'transaction-suspicious',
      reason: 'I do not recognize this card payment',
    }, fixedClock);

    expect(prepared.risk).toBe('critical');
    expect(prepared.consequences).toEqual(expect.arrayContaining([
      'Freeze Daily Account card ending 1844',
      'Open a dispute for the suspicious transaction',
    ]));
    expect(prepared.commit()).toMatchObject({ ok: true });
    expect(store.getState().stateVersion).toBe(1);
    expect(store.getState().cards.find(({ id }) => id === 'card-daily')?.status).toBe('frozen');
    expect(store.getState().disputes.find(
      ({ transactionId }) => transactionId === 'transaction-suspicious',
    )).toMatchObject({ status: 'open' });
    expect(store.getState().transactions.find(({ id }) => id === 'transaction-suspicious')?.disputeStatus).toBe('open');
    expect(prepared.commit()).toMatchObject({ ok: false, code: 'duplicate' });
    expect(store.getState().disputes).toHaveLength(2);
  });

  it('prepares every shared read and mutation operation against stable IDs', () => {
    const samples: Record<OperationName, Record<string, unknown>> = {
      get_overview: {},
      list_accounts: {},
      get_account: { accountId: 'account-daily' },
      search_transactions: { query: 'orbit' },
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
      get_agent_audit: {},
      get_security_status: {},
      transfer_money: {
        sourceAccountId: 'account-daily',
        destinationAccountId: 'account-rainy',
        amountMinor: atc(100),
        balanceFloorMinor: atc(5000),
      },
      pay_payee: {
        sourceAccountId: 'account-daily',
        payeeId: 'payee-mara',
        amountMinor: atc(100),
        balanceFloorMinor: atc(5000),
      },
      schedule_payment: {
        sourceAccountId: 'account-daily',
        payeeId: 'payee-mara',
        amountMinor: atc(100),
        balanceFloorMinor: atc(5000),
        date: '2026-09-12',
      },
      create_recurring_payment: {
        sourceAccountId: 'account-daily',
        payeeId: 'payee-orbit',
        amountMinor: atc(100),
        balanceFloorMinor: atc(5000),
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
      set_card_limit: { cardId: 'card-daily', limitMinor: atc(2000) },
      set_merchant_control: { cardId: 'card-daily', category: 'Gambling', enabled: false },
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
        targetMinor: atc(2400),
        deadline: '2027-04-01',
      },
      update_savings_goal: { goalId: 'goal-lisbon', targetMinor: atc(6500) },
      fund_savings_goal: {
        goalId: 'goal-lisbon',
        sourceAccountId: 'account-daily',
        amountMinor: atc(100),
        balanceFloorMinor: atc(5000),
      },
      withdraw_from_goal: {
        goalId: 'goal-lisbon',
        destinationAccountId: 'account-daily',
        amountMinor: atc(100),
      },
      categorize_transaction: { transactionId: 'transaction-orbit', category: 'Services' },
      add_transaction_note: { transactionId: 'transaction-orbit', note: 'August studio bill' },
      prepare_monthly_plan: { month: '2026-09' },
      start_transaction_dispute: {
        transactionId: 'transaction-suspicious',
        reason: 'Card payment not recognized',
        evidenceNote: '',
      },
      add_dispute_note: { disputeId: 'dispute-demo-open', note: 'Receipt checked.' },
      secure_suspicious_charge: {
        transactionId: 'transaction-suspicious',
        reason: 'Card payment not recognized',
      },
      create_support_case: { topic: 'Payment help', detail: 'Need help tracing a transfer.' },
      set_alert_preference: {
        event: 'low-balance',
        channel: 'in-app',
        thresholdMinor: atc(5000),
        enabled: true,
      },
      set_accessibility_mode: { mode: 'highContrast', enabled: true },
      manage_trusted_contact: {
        action: 'set',
        contact: { name: 'Mara Vale', relationship: 'Friend', contact: 'mara@example.test' },
      },
    };

    expect(OPERATION_NAMES).toHaveLength(56);
    expect(Object.keys(samples)).toEqual([...OPERATION_NAMES]);
    for (const operation of OPERATION_NAMES) {
      const store = createBankStore(memoryStorage(), fixedClock);
      const prepared = prepareOperation(store, operation, samples[operation], fixedClock);
      expect(prepared.operation).toBe(operation);
      expect([...prepared.disclosure, ...prepared.consequences].length).toBeGreaterThan(0);
      expect(store.getState().stateVersion).toBe(0);
      expect(prepared.commit(), `${operation} should commit`).toMatchObject({ ok: true });
      expect(store.getState().stateVersion, `${operation} version behavior`).toBe(
        prepared.readOnly ? 0 : 1,
      );
      expect(prepared.commit(), `${operation} should be single-use`).toMatchObject({
        ok: false,
        code: 'duplicate',
      });
    }
  });
});
