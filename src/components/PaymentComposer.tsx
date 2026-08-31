import {
  ArrowRight,
  CalendarBlank,
  Repeat,
} from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import type { Account, Payee } from '../domain/models';
import { atc } from '../domain/money';
import { prepareOperation, type PreparedOperation } from '../domain/operations/types';
import type { BankStore } from '../domain/store';
import { ManualActionReview } from './ManualActionReview';

type PaymentMode = 'now' | 'scheduled' | 'recurring';

interface PaymentComposerProps {
  accounts: readonly Account[];
  bankStore: BankStore;
  payee: Payee;
}

export function PaymentComposer({ accounts, bankStore, payee }: PaymentComposerProps) {
  const [mode, setMode] = useState<PaymentMode>('now');
  const [prepared, setPrepared] = useState<PreparedOperation | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const review = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const form = new FormData(event.currentTarget);
    try {
      const common = {
        sourceAccountId: String(form.get('sourceAccountId')),
        payeeId: payee.id,
        amountMinor: atc(Number(form.get('amount'))),
        balanceFloorMinor: atc(Number(form.get('balanceFloor'))),
        note: String(form.get('note') ?? ''),
      };
      const next = mode === 'now'
        ? prepareOperation(bankStore, 'pay_payee', common)
        : mode === 'scheduled'
          ? prepareOperation(bankStore, 'schedule_payment', {
            ...common,
            date: String(form.get('date')),
          })
          : prepareOperation(bankStore, 'create_recurring_payment', {
            ...common,
            frequency: String(form.get('frequency')),
            nextDate: String(form.get('date')),
          });
      setPrepared(next);
    } catch (caught) {
      setPrepared(null);
      setError(caught instanceof Error ? caught.message : 'Payment could not be prepared.');
    }
  };

  if (prepared) {
    return (
      <ManualActionReview
        ariaLabel="Payment review"
        onCancel={() => setPrepared(null)}
        onComplete={() => {
          setSuccess(mode === 'now' ? 'Payment completed.' : 'Payment scheduled.');
        }}
        prepared={prepared}
        successMessage={mode === 'now' ? 'Payment completed.' : 'Payment scheduled.'}
      />
    );
  }

  return (
    <section className="payment-composer obsidian-surface" aria-labelledby="payment-composer-title">
      <header>
        <p className="eyebrow">Manual payment</p>
        <h2 id="payment-composer-title">Pay {payee.name}</h2>
        <p>{payee.accountAlias}</p>
      </header>
      <div className="segmented-control" aria-label="Payment timing" role="group">
        <button aria-pressed={mode === 'now'} onClick={() => setMode('now')} type="button">
          <ArrowRight aria-hidden="true" /> Now
        </button>
        <button aria-pressed={mode === 'scheduled'} onClick={() => setMode('scheduled')} type="button">
          <CalendarBlank aria-hidden="true" /> Schedule
        </button>
        <button aria-pressed={mode === 'recurring'} onClick={() => setMode('recurring')} type="button">
          <Repeat aria-hidden="true" /> Recurring
        </button>
      </div>
      <form className="editorial-form editorial-form--dark" onSubmit={review}>
        <label>
          <span>From account</span>
          <select defaultValue="account-daily" name="sourceAccountId">
            {accounts.filter(({ status }) => status === 'active').map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
        </label>
        <div className="editorial-field">
          <label htmlFor="payment-amount">Amount</label>
          <span className="input-with-suffix">
            <input defaultValue="420" id="payment-amount" inputMode="decimal" min="0.01" name="amount" required step="0.01" type="number" />
            <span>ATC</span>
          </span>
        </div>
        <div className="editorial-field">
          <label htmlFor="payment-floor">Protect balance above</label>
          <span className="input-with-suffix">
            <input defaultValue="5000" id="payment-floor" inputMode="decimal" min="0" name="balanceFloor" required step="0.01" type="number" />
            <span>ATC</span>
          </span>
        </div>
        {mode !== 'now' ? (
          <label>
            <span>{mode === 'recurring' ? 'First payment' : 'Payment date'}</span>
            <input defaultValue="2026-09-15" name="date" required type="date" />
          </label>
        ) : null}
        {mode === 'recurring' ? (
          <label>
            <span>Frequency</span>
            <select defaultValue="monthly" name="frequency">
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Every two weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
        ) : null}
        <label>
          <span>Note <small>optional</small></span>
          <input maxLength={200} name="note" placeholder="What is this for?" />
        </label>
        {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
        {success ? <p className="form-message" role="status">{success}</p> : null}
        <button className="signal-action" type="submit">
          <ArrowRight aria-hidden="true" weight="regular" />
          <span>Review payment</span>
        </button>
      </form>
    </section>
  );
}
