import {
  ArrowClockwise,
  ArrowRight,
  Plus,
} from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { useAppServices, useBankState } from '../app/routes';
import { ManualActionReview } from '../components/ManualActionReview';
import { PayeeRail } from '../components/PayeeRail';
import { PaymentComposer } from '../components/PaymentComposer';
import { ScheduleTimeline } from '../components/ScheduleTimeline';
import { atc } from '../domain/money';
import {
  prepareOperation,
  type OperationName,
  type PreparedOperation,
} from '../domain/operations/types';

interface ExtraReview {
  prepared: PreparedOperation;
  message: string;
}

export function PaymentsPage() {
  const state = useBankState();
  const { bankStore } = useAppServices();
  const [selectedPayeeId, setSelectedPayeeId] = useState(state.payees[0]?.id ?? '');
  const [extraReview, setExtraReview] = useState<ExtraReview | null>(null);
  const [error, setError] = useState('');
  const selectedPayee = state.payees.find(({ id }) => id === selectedPayeeId) ?? state.payees[0];

  const prepareExtra = (operation: OperationName, args: Record<string, unknown>, message: string) => {
    try {
      setError('');
      setExtraReview({ prepared: prepareOperation(bankStore, operation, args), message });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The task could not be prepared.');
    }
  };

  const addPayee = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    prepareExtra('add_payee', {
      name: String(form.get('name')),
      accountAlias: String(form.get('alias')),
      trusted: form.get('trusted') === 'on',
    }, 'Payee added.');
  };

  const requestMoney = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    prepareExtra('request_money', {
      from: String(form.get('from')),
      amountMinor: atc(Number(form.get('amount'))),
      note: String(form.get('note')),
    }, 'Money request created.');
  };

  if (!selectedPayee) return null;

  return (
    <section className="payments-page" aria-labelledby="payments-title">
      <div className="payments-page__left">
        <header className="page-title-block">
          <p className="eyebrow">Payments</p>
          <h1 id="payments-title">Payments</h1>
          <p>Move fictional money without the guesswork.</p>
        </header>
        <PayeeRail
          onAdd={() => document.querySelector<HTMLDetailsElement>('#add-payee')?.setAttribute('open', '')}
          onSelect={setSelectedPayeeId}
          payees={state.payees}
          selectedId={selectedPayee.id}
        />
        <ScheduleTimeline payments={state.payments.filter(({ status }) => ['scheduled', 'paused'].includes(status))} />
        <div className="payment-utilities">
          <details id="add-payee">
            <summary><Plus aria-hidden="true" /> Add a payee</summary>
            <form className="compact-form" onSubmit={addPayee}>
              <label>Name<input maxLength={80} name="name" required /></label>
              <label>Destination alias<input maxLength={80} name="alias" placeholder="NAME •• 0000" required /></label>
              <label className="check-field"><input name="trusted" type="checkbox" /> Mark as trusted</label>
              <button type="submit">Review new payee</button>
            </form>
          </details>
          <details>
            <summary><ArrowRight aria-hidden="true" /> Request money</summary>
            <form className="compact-form" onSubmit={requestMoney}>
              <label>Request from<input maxLength={80} name="from" required /></label>
              <label>Request amount<input min="0.01" name="amount" required step="0.01" type="number" /></label>
              <label>Note<input maxLength={200} name="note" /></label>
              <button type="submit">Review request</button>
            </form>
          </details>
          {state.payments.some(({ status }) => status === 'failed') ? (
            <button
              className="utility-action"
              onClick={() => {
                const failed = state.payments.find(({ status }) => status === 'failed');
                if (failed) prepareExtra('retry_failed_payment', { paymentId: failed.id, balanceFloorMinor: atc(0) }, 'Payment retry completed.');
              }}
              type="button"
            >
              <ArrowClockwise aria-hidden="true" /> Review failed payment retry
            </button>
          ) : null}
        </div>
        {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
        {extraReview ? (
          <ManualActionReview
            ariaLabel="Payment task review"
            onCancel={() => setExtraReview(null)}
            prepared={extraReview.prepared}
            successMessage={extraReview.message}
          />
        ) : null}
      </div>
      <PaymentComposer accounts={state.accounts} bankStore={bankStore} payee={selectedPayee} />
    </section>
  );
}
