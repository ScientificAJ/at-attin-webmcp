import {
  DownloadSimple,
  NotePencil,
  Tag,
  WarningOctagon,
} from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { useAppServices, useBankState } from '../app/routes';
import { DeclarativeToolForm } from '../components/DeclarativeToolForm';
import { ManualActionReview } from '../components/ManualActionReview';
import { TransactionRow } from '../components/TransactionRow';
import { formatATC } from '../domain/money';
import type { Transaction } from '../domain/models';
import {
  prepareOperation,
  type OperationName,
  type PreparedOperation,
} from '../domain/operations/types';
import {
  searchTransactions,
  type TransactionSearch,
} from '../domain/selectors';

function manualFilters(args: Record<string, unknown>): TransactionSearch {
  return Object.fromEntries(
    Object.entries(args).filter(([, value]) => typeof value === 'string' || typeof value === 'number'),
  ) as TransactionSearch;
}

export function ActivityPage() {
  const state = useBankState();
  const { bankStore, toolBridge } = useAppServices();
  const unlocked = state.user.preferences.agentAccessUnlocked;
  const [selected, setSelected] = useState<Transaction | null>(state.transactions[0] ?? null);
  const [prepared, setPrepared] = useState<PreparedOperation | null>(null);
  const [message, setMessage] = useState('');
  const fields = [
    {
      name: 'query',
      label: 'Search activity',
      description: 'Merchant, memo, or category text.',
      type: 'text' as const,
      maxLength: 120,
    },
    {
      name: 'accountId',
      label: 'Account',
      description: 'Optional stable account identifier.',
      type: 'select' as const,
      options: [
        { value: '', label: 'All accounts' },
        ...state.accounts.map((account) => ({ value: account.id, label: account.name })),
      ],
    },
    {
      name: 'status',
      label: 'Status',
      description: 'Optional transaction posting status.',
      type: 'select' as const,
      options: [
        { value: '', label: 'Any status' },
        { value: 'posted', label: 'Posted' },
        { value: 'pending', label: 'Pending' },
        { value: 'declined', label: 'Declined' },
      ],
    },
  ];

  const prepare = (operation: OperationName, args: Record<string, unknown>) => {
    try {
      setMessage('');
      setPrepared(prepareOperation(bankStore, operation, args));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'The task could not be prepared.');
    }
  };

  const updateCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    prepare('categorize_transaction', { transactionId: selected.id, category: String(form.get('category')) });
  };

  const updateNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    prepare('add_transaction_note', { transactionId: selected.id, note: String(form.get('note')) });
  };

  return (
    <section className="tool-page" aria-labelledby="activity-title">
      <header className="tool-page__intro">
        <p className="eyebrow">Activity</p>
        <h1 id="activity-title">Activity</h1>
        <p>Search fictional ATC transactions, then review details as plain text.</p>
      </header>
      <div className="activity-page__layout">
        <DeclarativeToolForm
          bridge={toolBridge}
          description="Filter transaction history with explicit account, text, and status fields."
          fields={fields}
          onManualSubmit={(args) => {
            const matches = searchTransactions(state, manualFilters(args));
            return `${matches.length} matching transaction${matches.length === 1 ? '' : 's'}.`;
          }}
          title="Filter activity"
          toolName="filter_transactions_form"
          unlocked={unlocked}
        />
        <section className="tool-page__list activity-results" aria-labelledby="activity-recent-title">
          <div className="section-heading">
            <h2 id="activity-recent-title">Recent transactions</h2>
            <span>{state.transactions.length} total</span>
          </div>
          <ol className="activity-list">
            {state.transactions.map((transaction) => (
              <TransactionRow key={transaction.id} onSelect={setSelected} transaction={transaction} />
            ))}
          </ol>
        </section>
        {selected ? (
          <aside className="transaction-detail obsidian-surface" aria-labelledby="transaction-detail-title">
            <header>
              <p className="eyebrow">Transaction detail</p>
              <h2 id="transaction-detail-title">{selected.merchant}</h2>
              <p className="transaction-detail__amount">{selected.direction === 'credit' ? '+' : '−'}{formatATC(selected.amount)}</p>
            </header>
            <dl>
              <div><dt>Status</dt><dd>{selected.status}</dd></div>
              <div><dt>Category</dt><dd>{selected.category}</dd></div>
              <div><dt>Note</dt><dd>{selected.memo}</dd></div>
              <div><dt>Dispute</dt><dd>{selected.disputeStatus}</dd></div>
            </dl>
            <form className="compact-form compact-form--dark" onSubmit={updateCategory}>
              <label><Tag aria-hidden="true" /> Category<input defaultValue={selected.category} maxLength={50} name="category" required /></label>
              <button type="submit">Review category</button>
            </form>
            <form className="compact-form compact-form--dark" onSubmit={updateNote}>
              <label><NotePencil aria-hidden="true" /> Note<input defaultValue={selected.memo} maxLength={240} name="note" required /></label>
              <button type="submit">Review note</button>
            </form>
            {selected.disputeStatus === 'eligible' && selected.direction === 'debit' ? (
              <button
                className="outline-action"
                onClick={() => prepare('start_transaction_dispute', {
                  transactionId: selected.id,
                  reason: 'Transaction not recognized',
                  evidenceNote: 'Opened from the manual activity detail.',
                })}
                type="button"
              >
                <WarningOctagon aria-hidden="true" /> Review dispute
              </button>
            ) : null}
            <button className="text-action text-action--dark" onClick={() => setMessage('Fictional CSV export prepared on this device.')} type="button">
              <DownloadSimple aria-hidden="true" /> Export activity
            </button>
          </aside>
        ) : null}
      </div>
      {message ? <p className="form-message" role="status">{message}</p> : null}
      {prepared ? (
        <ManualActionReview
          ariaLabel="Transaction action review"
          onCancel={() => setPrepared(null)}
          prepared={prepared}
          successMessage="Transaction updated."
        />
      ) : null}
    </section>
  );
}
