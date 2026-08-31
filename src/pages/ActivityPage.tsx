import { useAppServices, useBankState } from '../app/routes';
import { DeclarativeToolForm } from '../components/DeclarativeToolForm';
import { formatATC } from '../domain/money';
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
  const { toolBridge } = useAppServices();
  const unlocked = state.user.preferences.agentAccessUnlocked;
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

  return (
    <section className="tool-page" aria-labelledby="activity-title">
      <header className="tool-page__intro">
        <p className="eyebrow">Activity</p>
        <h1 id="activity-title">Activity</h1>
        <p>Search fictional ATC transactions, then review details as plain text.</p>
      </header>
      <div className="tool-page__grid">
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
        <section className="tool-page__list" aria-labelledby="activity-recent-title">
          <div className="section-heading">
            <h2 id="activity-recent-title">Recent transactions</h2>
            <span>{state.transactions.length} total</span>
          </div>
          <ol className="activity-list">
            {state.transactions.map((transaction) => (
              <li key={transaction.id}>
                <span aria-hidden="true" className="activity-list__mark" />
                <div>
                  <strong>{transaction.merchant}</strong>
                  <span>{transaction.category} · {transaction.status}</span>
                </div>
                <span className="money">
                  {transaction.direction === 'credit' ? '+' : '−'}{formatATC(transaction.amount)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  );
}
