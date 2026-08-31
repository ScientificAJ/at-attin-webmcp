import {
  ChatCircleDots,
  ShieldWarning,
  WarningOctagon,
} from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { useAppServices, useBankState } from '../app/routes';
import { ManualActionReview } from '../components/ManualActionReview';
import {
  prepareOperation,
  type OperationName,
  type PreparedOperation,
} from '../domain/operations/types';

interface SupportReview {
  prepared: PreparedOperation;
  success: string;
}

export function SupportPage() {
  const state = useBankState();
  const { bankStore } = useAppServices();
  const [review, setReview] = useState<SupportReview | null>(null);
  const [error, setError] = useState('');

  const prepare = (operation: OperationName, args: Record<string, unknown>, success: string) => {
    try {
      setError('');
      setReview({ prepared: prepareOperation(bankStore, operation, args), success });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Support task could not be prepared.');
    }
  };

  const openCase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    prepare('create_support_case', {
      topic: String(form.get('topic')),
      detail: String(form.get('detail')),
    }, 'Support case opened.');
  };

  const suspicious = state.transactions.find(({ id }) => id === 'transaction-suspicious');
  const openDispute = state.disputes.find(({ status }) => status !== 'resolved');

  return (
    <section className="support-page" aria-labelledby="support-title">
      <header className="page-title-block support-page__intro">
        <p className="eyebrow">Settings · Support</p>
        <h1 id="support-title">Support</h1>
        <p>Plain-language help, with every sensitive step reviewed first.</p>
      </header>
      <div className="support-grid">
        <section className="support-panel obsidian-surface" aria-labelledby="fraud-title">
          <ShieldWarning aria-hidden="true" weight="regular" />
          <div>
            <p className="eyebrow">Urgent safeguard</p>
            <h2 id="fraud-title">See a charge you do not recognize?</h2>
            <p>At Attin can freeze the linked card and open a dispute together—only after typed confirmation.</p>
          </div>
          {suspicious ? (
            <button
              className="signal-action"
              onClick={() => prepare('secure_suspicious_charge', {
                transactionId: suspicious.id,
                reason: 'Card payment not recognized',
              }, 'Card secured and dispute opened.')}
              type="button"
            >
              <WarningOctagon aria-hidden="true" /> <span>Review suspicious charge</span>
            </button>
          ) : null}
        </section>
        <section className="support-case-form" aria-labelledby="case-title">
          <ChatCircleDots aria-hidden="true" weight="regular" />
          <h2 id="case-title">Open a support case</h2>
          <p>No information leaves this device.</p>
          <form className="editorial-form" onSubmit={openCase}>
            <label><span>Topic</span><select defaultValue="Payment question" name="topic"><option>Payment question</option><option>Card help</option><option>Account access</option><option>Something else</option></select></label>
            <label><span>Tell us what happened</span><textarea maxLength={500} name="detail" required rows={4} /></label>
            <button type="submit">Review support case</button>
          </form>
        </section>
        <section className="case-list" aria-labelledby="open-cases-title">
          <div className="section-heading"><h2 id="open-cases-title">Your cases &amp; disputes</h2><span>Device-local</span></div>
          <ol>
            {state.supportCases.map((supportCase) => (
              <li key={supportCase.id}><span><strong>{supportCase.topic}</strong><small>{supportCase.detail}</small></span><span className="state-pill">{supportCase.status}</span></li>
            ))}
            {state.disputes.map((dispute) => (
              <li key={dispute.id}><span><strong>Transaction dispute</strong><small>{dispute.reason}</small></span><span className="state-pill">{dispute.status}</span></li>
            ))}
          </ol>
          {openDispute ? (
            <button
              className="quiet-action"
              onClick={() => prepare('add_dispute_note', { disputeId: openDispute.id, note: 'Follow-up requested from the manual support page.' }, 'Dispute note added.')}
              type="button"
            >Add a follow-up note</button>
          ) : null}
        </section>
        <section className="help-list" aria-labelledby="help-title">
          <div className="section-heading"><h2 id="help-title">Helpful answers</h2><span>Plain language</span></div>
          <details><summary>Is ATC real money?</summary><p>No. Every balance is fictional, local to this prototype, and has no cash value.</p></details>
          <details><summary>Can the agent act without me?</summary><p>No. Every agent read or change needs a fresh confirmation inside At Attin.</p></details>
          <details><summary>Where is my data stored?</summary><p>On this device only. Resetting the demo restores the original fictional data.</p></details>
        </section>
      </div>
      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
      {review ? (
        <ManualActionReview
          ariaLabel="Support action review"
          onCancel={() => setReview(null)}
          prepared={review.prepared}
          successMessage={review.success}
        />
      ) : null}
    </section>
  );
}
