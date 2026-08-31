import { memoryStorage } from '../test/memory-storage';
import type { Payment } from './models';
import { atc } from './money';
import { prepareOperation } from './operations/types';
import { createSeedState } from './seed';
import {
  selectCashFlow,
  selectIncomeSummary,
  selectSpendingSummary,
} from './selectors';
import { createBankStore } from './store';
import {
  BANK_BACKUP_KEY,
  BANK_STORAGE_KEY,
} from './storage';

const fixedClock = () => new Date('2026-08-31T09:00:00Z');

describe('banking invariant and validation regressions', () => {
  it('rejects candidate states that breach safe-money, account-floor, and goal-backing invariants', () => {
    const storage = memoryStorage();
    const store = createBankStore(storage, fixedClock);
    const before = storage.getItem(BANK_STORAGE_KEY);

    expect(store.transact(0, 'invalid-negative-balance', (draft) => {
      draft.accounts[0]!.balance = -1 as typeof draft.accounts[0]['balance'];
      draft.accounts[0]!.availableBalance = -1 as typeof draft.accounts[0]['availableBalance'];
    })).toMatchObject({ ok: false, code: 'invalid' });
    expect(store.getState().stateVersion).toBe(0);
    expect(storage.getItem(BANK_STORAGE_KEY)).toBe(before);

    expect(store.transact(0, 'invalid-unsafe-money', (draft) => {
      draft.accounts[0]!.balance = Number.MAX_SAFE_INTEGER + 1 as typeof draft.accounts[0]['balance'];
    })).toMatchObject({ ok: false, code: 'invalid' });

    expect(store.transact(0, 'invalid-goal-backing', (draft) => {
      const rainy = draft.accounts.find(({ id }) => id === 'account-rainy')!;
      rainy.balance = atc(1000);
      rainy.availableBalance = atc(1000);
    })).toMatchObject({ ok: false, code: 'invalid' });
  });

  it('reserves goal backing, rejects the negative-balance repro, and records paired goal ledger entries', () => {
    const store = createBankStore(memoryStorage(), fixedClock);

    expect(() => prepareOperation(store, 'transfer_money', {
      sourceAccountId: 'account-rainy',
      destinationAccountId: 'account-daily',
      amountMinor: atc(10420),
      balanceFloorMinor: atc(0),
    }, fixedClock)).toThrow(/goal|reserved|floor/i);

    const beforeTotal = store.getState().accounts.reduce((sum, account) => sum + account.balance, 0);
    const beforeTransactions = store.getState().transactions.length;
    const withdrawal = prepareOperation(store, 'withdraw_from_goal', {
      goalId: 'goal-lisbon',
      destinationAccountId: 'account-daily',
      amountMinor: atc(100),
    }, fixedClock);

    expect(withdrawal.commit()).toMatchObject({ ok: true });
    expect(store.getState().accounts.reduce((sum, account) => sum + account.balance, 0)).toBe(
      beforeTotal,
    );
    expect(store.getState().transactions.slice(beforeTransactions)).toEqual([
      expect.objectContaining({
        accountId: 'account-rainy',
        direction: 'debit',
        amount: atc(100),
        category: 'Savings goal',
      }),
      expect.objectContaining({
        accountId: 'account-daily',
        direction: 'credit',
        amount: atc(100),
        category: 'Savings goal',
      }),
    ]);
    expect(store.getState().goals[0]?.savedAmount).toBe(atc(1900));
  });

  it('records paired ledger entries when a goal is funded', () => {
    const store = createBankStore(memoryStorage(), fixedClock);
    const beforeTransactions = store.getState().transactions.length;

    expect(prepareOperation(store, 'fund_savings_goal', {
      goalId: 'goal-lisbon',
      sourceAccountId: 'account-daily',
      amountMinor: atc(100),
      balanceFloorMinor: atc(5000),
    }, fixedClock).commit()).toMatchObject({ ok: true });

    expect(store.getState().transactions.slice(beforeTransactions)).toEqual([
      expect.objectContaining({ accountId: 'account-daily', direction: 'debit' }),
      expect.objectContaining({ accountId: 'account-rainy', direction: 'credit' }),
    ]);
  });

  it('persists scheduled and recurring floors, retains or updates them, and survives reload', () => {
    const storage = memoryStorage();
    const store = createBankStore(storage, fixedClock);
    const scheduled = prepareOperation(store, 'schedule_payment', {
      sourceAccountId: 'account-daily',
      payeeId: 'payee-mara',
      amountMinor: atc(200),
      balanceFloorMinor: atc(5000),
      date: '2026-09-12',
    }, fixedClock);
    expect(scheduled.commit()).toMatchObject({ ok: true });
    expect(store.getState().payments.at(-1)).toMatchObject({ balanceFloor: atc(5000) });

    const recurring = prepareOperation(store, 'create_recurring_payment', {
      sourceAccountId: 'account-daily',
      payeeId: 'payee-orbit',
      amountMinor: atc(300),
      balanceFloorMinor: atc(5100),
      frequency: 'monthly',
      nextDate: '2026-09-15',
    }, fixedClock);
    expect(recurring.commit()).toMatchObject({ ok: true });
    const recurringId = store.getState().payments.at(-1)!.id;
    expect(store.getState().payments.at(-1)).toMatchObject({ balanceFloor: atc(5100) });

    expect(prepareOperation(store, 'update_recurring_payment', {
      paymentId: recurringId,
      amountMinor: atc(320),
    }, fixedClock).commit()).toMatchObject({ ok: true });
    expect(store.getState().payments.find(({ id }) => id === recurringId)).toMatchObject({
      balanceFloor: atc(5100),
    });

    expect(prepareOperation(store, 'update_recurring_payment', {
      paymentId: recurringId,
      balanceFloorMinor: atc(5200),
    }, fixedClock).commit()).toMatchObject({ ok: true });
    expect(createBankStore(storage, fixedClock).getState().payments.find(
      ({ id }) => id === recurringId,
    )).toMatchObject({ balanceFloor: atc(5200) });
  });

  it('rechecks the saved payment floor before retrying execution', () => {
    const store = createBankStore(memoryStorage(), fixedClock);
    expect(store.transact(0, 'configure-execution-floor', (draft) => {
      const account = draft.accounts.find(({ id }) => id === 'account-daily')!;
      account.balance = atc(5070);
      account.availableBalance = atc(5070);
      const payment = draft.payments.find(({ id }) => id === 'payment-foundry-failed')!;
      (payment as Payment & { balanceFloor: ReturnType<typeof atc> }).balanceFloor = atc(5000);
    })).toMatchObject({ ok: true });

    expect(() => prepareOperation(store, 'retry_failed_payment', {
      paymentId: 'payment-foundry-failed',
    }, fixedClock)).toThrow(/5,000 ATC balance floor/i);
  });

  it('fails closed when legacy actionable payment floors are unknown and reloads stably', () => {
    const legacy = createSeedState(fixedClock());
    for (const payment of legacy.payments) {
      delete (payment as unknown as { balanceFloorStatus?: unknown }).balanceFloorStatus;
    }
    delete (legacy.payments[0] as unknown as { balanceFloor?: unknown }).balanceFloor;
    legacy.payments.find(({ id }) => id === 'payment-foundry-failed')!.balanceFloor = atc(7777);
    const legacyStorage = memoryStorage({
      [BANK_STORAGE_KEY]: JSON.stringify(legacy),
    });
    const migrated = createBankStore(legacyStorage, fixedClock);
    expect(migrated.getState().recoveryNotice).toMatch(/payment.*floor.*review|reconfirm/i);
    expect(migrated.getState().payments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'payment-orbit-scheduled',
        balanceFloor: null,
        balanceFloorStatus: 'requires-reconfirmation',
        status: 'cancelled',
      }),
      expect.objectContaining({
        id: 'payment-northstar-recurring',
        balanceFloor: null,
        balanceFloorStatus: 'requires-reconfirmation',
        status: 'paused',
      }),
      expect.objectContaining({
        id: 'payment-foundry-failed',
        balanceFloor: null,
        balanceFloorStatus: 'requires-reconfirmation',
        status: 'failed',
      }),
    ]));
    expect(() => prepareOperation(migrated, 'resume_recurring_payment', {
      paymentId: 'payment-northstar-recurring',
    }, fixedClock)).toThrow(/reconfirm/i);
    expect(() => prepareOperation(migrated, 'retry_failed_payment', {
      paymentId: 'payment-foundry-failed',
    }, fixedClock)).toThrow(/reconfirm/i);
    expect(() => prepareOperation(migrated, 'update_recurring_payment', {
      paymentId: 'payment-northstar-recurring',
      amountMinor: atc(200),
    }, fixedClock)).toThrow(/reconfirm/i);

    const persistedAfterMigration = legacyStorage.getItem(BANK_STORAGE_KEY);
    const reloaded = createBankStore(legacyStorage, fixedClock);
    expect(legacyStorage.getItem(BANK_STORAGE_KEY)).toBe(persistedAfterMigration);
    expect(reloaded.getState()).toEqual(migrated.getState());
  });

  it('reconfirms a valid legacy floor before resume or retry execution', () => {
    const legacy = createSeedState(fixedClock());
    for (const payment of legacy.payments) {
      delete (payment as unknown as { balanceFloorStatus?: unknown }).balanceFloorStatus;
    }
    delete (legacy.payments[0] as unknown as { balanceFloor?: unknown }).balanceFloor;
    const storage = memoryStorage({ [BANK_STORAGE_KEY]: JSON.stringify(legacy) });
    const store = createBankStore(storage, fixedClock);

    expect(() => prepareOperation(store, 'update_recurring_payment', {
      paymentId: 'payment-northstar-recurring',
      frequency: 'weekly',
    }, fixedClock)).toThrow(/reconfirm/i);
    expect(prepareOperation(store, 'update_recurring_payment', {
      paymentId: 'payment-northstar-recurring',
      balanceFloorMinor: atc(5000),
    }, fixedClock).commit()).toMatchObject({ ok: true });
    expect(store.getState().payments.find(
      ({ id }) => id === 'payment-northstar-recurring',
    )).toMatchObject({
      balanceFloor: atc(5000),
      balanceFloorStatus: 'confirmed',
      status: 'paused',
    });
    expect(prepareOperation(store, 'resume_recurring_payment', {
      paymentId: 'payment-northstar-recurring',
    }, fixedClock).commit()).toMatchObject({ ok: true });

    expect(prepareOperation(store, 'retry_failed_payment', {
      paymentId: 'payment-foundry-failed',
      balanceFloorMinor: atc(5000),
    }, fixedClock).commit()).toMatchObject({ ok: true });
    expect(createBankStore(storage, fixedClock).getState().payments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'payment-northstar-recurring',
          balanceFloor: atc(5000),
          balanceFloorStatus: 'confirmed',
          status: 'scheduled',
        }),
        expect.objectContaining({
          id: 'payment-foundry-failed',
          balanceFloor: atc(5000),
          balanceFloorStatus: 'confirmed',
          status: 'completed',
        }),
      ]),
    );
  });

  it('backs up and reseeds malformed same-version state', () => {

    const malformedRaw = JSON.stringify({ schemaVersion: 1, stateVersion: 0 });
    const malformedStorage = memoryStorage({ [BANK_STORAGE_KEY]: malformedRaw });
    const recovered = createBankStore(malformedStorage, fixedClock);
    expect(malformedStorage.getItem(BANK_BACKUP_KEY)).toBe(malformedRaw);
    expect(recovered.getState().accounts[0]?.balance).toBe(atc(8440));
    expect(recovered.getState().recoveryNotice).toMatch(/backed up and reset/i);

    const invalid = createSeedState(fixedClock());
    invalid.cards[0]!.accountId = 'account-missing';
    const invalidRaw = JSON.stringify(invalid);
    const invalidStorage = memoryStorage({ [BANK_STORAGE_KEY]: invalidRaw });
    createBankStore(invalidStorage, fixedClock);
    expect(invalidStorage.getItem(BANK_BACKUP_KEY)).toBe(invalidRaw);
  });

  it('removes a payee while preserving completed history and blocking actionable links', () => {
    const storage = memoryStorage();
    const store = createBankStore(storage, fixedClock);
    expect(prepareOperation(store, 'pay_payee', {
      sourceAccountId: 'account-daily',
      payeeId: 'payee-mara',
      amountMinor: atc(100),
      balanceFloorMinor: atc(5000),
    }, fixedClock).commit()).toMatchObject({ ok: true });

    const removal = prepareOperation(store, 'remove_payee', {
      payeeId: 'payee-mara',
    }, fixedClock);
    expect(removal.consequences.join('\n')).toMatch(/preserve 1 historical payment/i);
    expect(removal.commit()).toMatchObject({ ok: true });
    expect(store.getState().payees.some(({ id }) => id === 'payee-mara')).toBe(false);
    expect(store.getState().payments.at(-1)).toMatchObject({
      payeeName: 'Mara Vale',
      status: 'completed',
    });
    expect(store.getState().payments.at(-1)).not.toHaveProperty('payeeId');
    expect(createBankStore(storage, fixedClock).getState().payments.at(-1)).toMatchObject({
      payeeName: 'Mara Vale',
      status: 'completed',
    });

    expect(() => prepareOperation(
      createBankStore(memoryStorage(), fixedClock),
      'remove_payee',
      { payeeId: 'payee-foundry' },
      fixedClock,
    )).toThrow(/actionable|failed|retry/i);
  });

  it('canonicalizes merchant-control categories before confirmation and commit', () => {
    const store = createBankStore(memoryStorage(), fixedClock);
    const prepared = prepareOperation(store, 'set_merchant_control', {
      cardId: 'card-daily',
      category: 'gambling',
      enabled: true,
    }, fixedClock);

    expect(prepared.consequences).toContain('Gambling card payments: allowed');
    expect(prepared.commit()).toMatchObject({ ok: true });
    expect(store.getState().cards[0]?.merchantControls.filter(
      ({ category }) => category.toLocaleLowerCase('en-US') === 'gambling',
    )).toEqual([{ category: 'Gambling', enabled: true }]);
  });

  it('rejects dispute notes whose accumulated evidence would exceed 2,000 characters', () => {
    const store = createBankStore(memoryStorage(), fixedClock);
    expect(store.transact(0, 'long-existing-evidence', (draft) => {
      draft.disputes[0]!.evidenceNote = 'e'.repeat(1900);
    })).toMatchObject({ ok: true });

    expect(() => prepareOperation(store, 'add_dispute_note', {
      disputeId: 'dispute-demo-open',
      note: 'n'.repeat(100),
    }, fixedClock)).toThrow(/2,000 characters/i);

    const exactLimit = prepareOperation(store, 'add_dispute_note', {
      disputeId: 'dispute-demo-open',
      note: 'n'.repeat(99),
    }, fixedClock);
    expect(exactLimit.commit()).toMatchObject({ ok: true });
    expect(store.getState().disputes[0]?.evidenceNote).toHaveLength(2000);
  });

  it.each([
    ['get_overview', { unexpected: true }],
    ['search_transactions', { limit: 'ten' }],
    ['search_transactions', { limit: 101 }],
    ['search_transactions', { direction: 'sideways' }],
    ['search_transactions', { status: 'unknown' }],
    ['search_transactions', { minimumMinor: '100' }],
    ['search_transactions', { from: 'not-a-date' }],
    ['search_transactions', { from: '2026-09-10', to: '2026-09-01' }],
    ['search_transactions', { accountId: 'account-missing' }],
    ['search_transactions', { query: 'x'.repeat(121) }],
    ['get_agent_audit', { limit: 0 }],
  ])('rejects invalid read arguments for %s before confirmation', (operation, args) => {
    const store = createBankStore(memoryStorage(), fixedClock);
    expect(() => prepareOperation(store, operation, args, fixedClock)).toThrow();
    expect(store.getState().stateVersion).toBe(0);
  });

  it.each([
    ['schedule_payment', {
      sourceAccountId: 'account-daily',
      payeeId: 'payee-mara',
      amountMinor: atc(100),
      date: '2026-09-31',
    }],
    ['create_recurring_payment', {
      sourceAccountId: 'account-daily',
      payeeId: 'payee-mara',
      amountMinor: atc(100),
      frequency: 'monthly',
      nextDate: '2026-09-15',
      endDate: '2026-09-31',
    }],
    ['update_recurring_payment', {
      paymentId: 'payment-northstar-recurring',
      nextDate: '2026-09-20',
      endDate: '2026-09-10',
    }],
    ['prepare_monthly_plan', { month: '2026-99' }],
  ])('rejects impossible or inconsistent calendar input for %s', (operation, args) => {
    expect(() => prepareOperation(
      createBankStore(memoryStorage(), fixedClock),
      operation,
      args,
      fixedClock,
    )).toThrow();
  });

  it('aggregates every matching transaction and includes the full supplied end date', () => {
    const state = createSeedState(fixedClock());
    for (let index = 0; index < 120; index += 1) {
      state.transactions.push({
        id: `transaction-bulk-debit-${index}`,
        accountId: 'account-daily',
        direction: 'debit',
        amount: atc(1),
        merchant: `Debit ${index}`,
        category: 'Bulk',
        date: `2026-08-31T23:${String(index % 60).padStart(2, '0')}:00.000Z`,
        status: 'posted',
        memo: '',
        disputeStatus: 'eligible',
      });
      state.transactions.push({
        id: `transaction-bulk-credit-${index}`,
        accountId: 'account-daily',
        direction: 'credit',
        amount: atc(2),
        merchant: `Credit ${index}`,
        category: 'Income',
        date: `2026-08-31T22:${String(index % 60).padStart(2, '0')}:00.000Z`,
        status: 'posted',
        memo: '',
        disputeStatus: 'ineligible',
      });
    }
    const filters = { from: '2026-08-31', to: '2026-08-31' };

    expect(selectSpendingSummary(state, filters).totalSpent).toBe(atc(120));
    expect(selectCashFlow(state, filters)).toMatchObject({
      inflow: atc(240),
      outflow: atc(120),
      net: atc(120),
    });
    expect(selectIncomeSummary(state, filters).transactions).toHaveLength(120);
  });

  it('scopes monthly plan schedules and subscriptions to the requested month', () => {
    const prepared = prepareOperation(
      createBankStore(memoryStorage(), fixedClock),
      'prepare_monthly_plan',
      { month: '2026-09' },
      fixedClock,
    );
    const result = prepared.commit();
    expect(result).toMatchObject({ ok: true });
    const data = result.ok ? result.data as {
      upcomingPayments: Payment[];
      subscriptions: Array<{ id: string }>;
    } : null;
    expect(data?.upcomingPayments.map(({ id }) => id)).toEqual([
      'payment-orbit-scheduled',
      'payment-northstar-recurring',
    ]);
    expect(data?.subscriptions.map(({ id }) => id)).toEqual([
      'subscription-loom',
      'subscription-serein',
    ]);
  });

  it('makes payee destination changes high-risk, explicit, collision-safe, and non-blank', () => {
    const store = createBankStore(memoryStorage(), fixedClock);
    const prepared = prepareOperation(store, 'update_payee', {
      payeeId: 'payee-orbit',
      accountAlias: 'ORBIT •• 9090',
    }, fixedClock);

    expect(prepared.risk).toBe('high');
    expect(prepared.consequences.join('\n')).toMatch(/ORBIT •• 2048.*ORBIT •• 9090/);
    expect(prepared.consequences.join('\n')).toMatch(/2 scheduled or recurring payments/i);
    expect(prepared.commit()).toMatchObject({ ok: true });
    expect(store.getState().payees.find(({ id }) => id === 'payee-orbit')?.accountAlias).toBe(
      'ORBIT •• 9090',
    );

    expect(() => prepareOperation(store, 'update_payee', {
      payeeId: 'payee-mara',
      accountAlias: 'NORTH •• 9015',
    }, fixedClock)).toThrow(/alias already exists/i);
    expect(() => prepareOperation(store, 'update_payee', {
      payeeId: 'payee-mara',
      name: '   ',
    }, fixedClock)).toThrow(/name/i);
  });
});
