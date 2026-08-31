import { atc } from '../domain/money';
import {
  approveTrusted,
  promiseSettled,
  trustedActivation,
  untrustedActivation,
} from './confirmation-harness';
import { createWebMcpTestHarness } from './webmcp-harness';

function parseResult(value: string): Record<string, unknown> {
  return JSON.parse(value) as Record<string, unknown>;
}

describe('At Attin WebMCP hero evaluations', () => {
  it('explains spending only after confirmation and leaves banking state unchanged', async () => {
    const { store, coordinator, bridge, auditJournal } = createWebMcpTestHarness();
    const versionBefore = store.getState().stateVersion;
    const task = bridge.run(
      'get_spending_summary',
      { from: '2026-08-01', to: '2026-08-31' },
      new AbortController().signal,
    );

    expect(await promiseSettled(task)).toBe(false);
    expect(coordinator.getSnapshot()).toMatchObject({
      status: 'pending',
      toolName: 'get_spending_summary',
      readOnly: true,
    });

    approveTrusted(coordinator);
    const result = parseResult(await task);

    expect(result).toMatchObject({
      status: 'completed',
      tool: 'get_spending_summary',
    });
    expect(JSON.stringify(result.data)).toMatch(/Orbit Works|Services/i);
    expect(store.getState().stateVersion).toBe(versionBefore);
    expect(auditJournal.getEvents().at(-1)).toMatchObject({
      eventType: 'get_spending_summary',
      outcome: 'success',
    });
  });

  it('creates one recurring payment with the exact confirmed balance floor', async () => {
    const { store, coordinator, bridge, auditJournal } = createWebMcpTestHarness();
    const balanceBefore = store.getState().accounts.find(({ id }) => id === 'account-daily')?.balance;
    const task = bridge.run('create_recurring_payment', {
      sourceAccountId: 'account-daily',
      payeeId: 'payee-orbit',
      amountMinor: atc(1_250),
      balanceFloorMinor: atc(5_000),
      frequency: 'monthly',
      nextDate: '2026-09-01',
      note: 'Studio retainer',
    }, new AbortController().signal);

    const pending = coordinator.getSnapshot();
    expect(pending).toMatchObject({
      status: 'pending',
      toolName: 'create_recurring_payment',
    });
    expect(JSON.stringify(pending)).toMatch(/1,250 ATC/);
    expect(JSON.stringify(pending)).toMatch(/5,000 ATC/);

    approveTrusted(coordinator);
    expect(parseResult(await task)).toMatchObject({
      status: 'completed',
      tool: 'create_recurring_payment',
    });

    const created = store.getState().payments.find((payment) => (
      payment.payeeId === 'payee-orbit'
      && payment.amount === atc(1_250)
      && payment.recurrence?.nextDate === '2026-09-01'
    ));
    expect(created).toMatchObject({
      balanceFloor: atc(5_000),
      balanceFloorStatus: 'confirmed',
      status: 'scheduled',
      recurrence: { frequency: 'monthly', nextDate: '2026-09-01' },
    });
    expect(store.getState().accounts.find(({ id }) => id === 'account-daily')?.balance)
      .toBe(balanceBefore);
    expect(auditJournal.getEvents().at(-1)).toMatchObject({
      eventType: 'create_recurring_payment',
      outcome: 'success',
    });
  });

  it('secures a suspicious charge atomically only after typed uppercase YES', async () => {
    const { store, coordinator, bridge, auditJournal } = createWebMcpTestHarness();
    const task = bridge.run('secure_suspicious_charge', {
      transactionId: 'transaction-suspicious',
      reason: 'card-not-present',
    }, new AbortController().signal);

    expect(coordinator.getSnapshot()).toMatchObject({
      status: 'pending',
      risk: 'critical',
      requiresTypedConfirmation: true,
    });
    expect(() => coordinator.approve(trustedActivation(), 'yes')).toThrow(
      'type-YES-to-confirm',
    );

    approveTrusted(coordinator, 'YES');
    expect(parseResult(await task)).toMatchObject({
      status: 'completed',
      tool: 'secure_suspicious_charge',
    });
    expect(store.getState().cards.find(({ id }) => id === 'card-daily')?.status).toBe('frozen');
    expect(store.getState().transactions.find(({ id }) => id === 'transaction-suspicious')?.disputeStatus)
      .toBe('open');
    expect(store.getState().disputes.filter(({ transactionId }) => (
      transactionId === 'transaction-suspicious'
    ))).toHaveLength(1);
    expect(auditJournal.getEvents().at(-1)).toMatchObject({
      eventType: 'secure_suspicious_charge',
      outcome: 'success',
    });
  });
});

describe('At Attin WebMCP rejection evaluations', () => {
  it('rejects over-broad schemas before confirmation without protected output', async () => {
    const { coordinator, bridge, auditJournal } = createWebMcpTestHarness();

    await expect(bridge.run('get_account', {
      accountId: 'account-daily',
      discloseEverything: true,
    }, new AbortController().signal)).rejects.toThrow('invalid-tool-arguments');

    expect(coordinator.getSnapshot()).toMatchObject({ status: 'idle' });
    expect(auditJournal.getEvents().at(-1)).toMatchObject({
      eventType: 'get_account',
      outcome: 'rejected',
    });
    expect(JSON.stringify(auditJournal.getEvents())).not.toMatch(/8,440|42,860/);
  });

  it('keeps untrusted, aborted, and stale approvals fail-closed', async () => {
    const untrusted = createWebMcpTestHarness();
    const read = untrusted.bridge.run('get_overview', {}, new AbortController().signal);
    expect(() => untrusted.coordinator.approve(untrustedActivation())).toThrow(
      'trusted-user-activation-required',
    );
    untrusted.coordinator.cancel('user-cancelled');
    await expect(read).rejects.toThrow('confirmation-user-cancelled');

    const aborted = createWebMcpTestHarness();
    const controller = new AbortController();
    const payment = aborted.bridge.run('pay_payee', {
      sourceAccountId: 'account-daily',
      payeeId: 'payee-mara',
      amountMinor: atc(420),
      balanceFloorMinor: atc(5_000),
    }, controller.signal);
    controller.abort();
    await expect(payment).rejects.toThrow('confirmation-aborted');
    expect(aborted.store.getState().accounts.find(({ id }) => id === 'account-daily')?.balance)
      .toBe(atc(8_440));

    const stale = createWebMcpTestHarness();
    const stalePayment = stale.bridge.run('pay_payee', {
      sourceAccountId: 'account-daily',
      payeeId: 'payee-mara',
      amountMinor: atc(420),
      balanceFloorMinor: atc(5_000),
    }, new AbortController().signal);
    const version = stale.store.getState().stateVersion;
    expect(stale.store.transact(version, 'eval-stale-state', (draft) => {
      draft.audit.push({
        id: 'audit-eval-stale-state',
        actor: 'user',
        eventType: 'eval_state_change',
        target: 'evaluation',
        outcome: 'success',
        timestamp: '2026-08-31T09:00:00.000Z',
        safeDetail: 'State changed after preview for stale-state evaluation.',
      });
    })).toMatchObject({ ok: true });

    approveTrusted(stale.coordinator);
    await expect(stalePayment).rejects.toThrow('stale-preview');
    expect(stale.store.getState().accounts.find(({ id }) => id === 'account-daily')?.balance)
      .toBe(atc(8_440));
  });
});
