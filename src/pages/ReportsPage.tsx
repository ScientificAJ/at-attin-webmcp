import { Link } from 'react-router-dom';
import { useAppServices, useBankState } from '../app/routes';
import { DeclarativeToolForm } from '../components/DeclarativeToolForm';
import { formatATC } from '../domain/money';
import {
  selectSpendingSummary,
  selectStatement,
} from '../domain/selectors';

function stringArg(args: Record<string, unknown>, name: string): string {
  const value = args[name];
  if (typeof value !== 'string' || value === '') throw new Error(`${name} is required`);
  return value;
}

export function ReportsPage() {
  const state = useBankState();
  const { toolBridge } = useAppServices();
  const unlocked = state.user.preferences.agentAccessUnlocked;
  const accountOptions = state.accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }));

  return (
    <section className="tool-page" aria-labelledby="reports-title">
      <header className="tool-page__intro">
        <p className="eyebrow">Reports</p>
        <h1 id="reports-title">Reports</h1>
        <p>Choose explicit periods for statements and local spending comparisons.</p>
        <Link className="inline-link" to="/reports/plan">Open monthly plan</Link>
      </header>
      <div className="tool-page__forms">
        <DeclarativeToolForm
          bridge={toolBridge}
          description="Select one account and a bounded statement date range."
          fields={[
            {
              name: 'accountId',
              label: 'Account',
              description: 'Stable account identifier for the statement.',
              type: 'select',
              options: accountOptions,
              required: true,
              defaultValue: 'account-daily',
            },
            {
              name: 'from',
              label: 'Statement starts',
              description: 'Inclusive start date in YYYY-MM-DD format.',
              type: 'date',
              required: true,
              defaultValue: '2026-08-01',
            },
            {
              name: 'to',
              label: 'Statement ends',
              description: 'Inclusive end date in YYYY-MM-DD format.',
              type: 'date',
              required: true,
              defaultValue: '2026-08-31',
            },
          ]}
          onManualSubmit={(args) => {
            const statement = selectStatement(
              state,
              stringArg(args, 'accountId'),
              stringArg(args, 'from'),
              stringArg(args, 'to'),
            );
            return `${statement.transactions.length} statement transaction${statement.transactions.length === 1 ? '' : 's'}.`;
          }}
          submitLabel="Show statement"
          title="Choose statement period"
          toolName="choose_statement_period"
          unlocked={unlocked}
        />
        <DeclarativeToolForm
          bridge={toolBridge}
          description="Compare spending across two explicit bounded date ranges."
          fields={[
            {
              name: 'accountId',
              label: 'Account',
              description: 'Optional stable account identifier for both periods.',
              type: 'select',
              options: [{ value: '', label: 'All accounts' }, ...accountOptions],
            },
            {
              name: 'currentFrom',
              label: 'Current period starts',
              description: 'Current period start date in YYYY-MM-DD format.',
              type: 'date',
              required: true,
              defaultValue: '2026-08-16',
            },
            {
              name: 'currentTo',
              label: 'Current period ends',
              description: 'Current period end date in YYYY-MM-DD format.',
              type: 'date',
              required: true,
              defaultValue: '2026-08-31',
            },
            {
              name: 'previousFrom',
              label: 'Comparison period starts',
              description: 'Comparison period start date in YYYY-MM-DD format.',
              type: 'date',
              required: true,
              defaultValue: '2026-08-01',
            },
            {
              name: 'previousTo',
              label: 'Comparison period ends',
              description: 'Comparison period end date in YYYY-MM-DD format.',
              type: 'date',
              required: true,
              defaultValue: '2026-08-15',
            },
          ]}
          onManualSubmit={(args) => {
            const account = typeof args.accountId === 'string'
              ? { accountId: args.accountId }
              : {};
            const current = selectSpendingSummary(state, {
              ...account,
              from: stringArg(args, 'currentFrom'),
              to: stringArg(args, 'currentTo'),
            });
            const previous = selectSpendingSummary(state, {
              ...account,
              from: stringArg(args, 'previousFrom'),
              to: stringArg(args, 'previousTo'),
            });
            return `Current ${formatATC(current.totalSpent)} · comparison ${formatATC(previous.totalSpent)}.`;
          }}
          submitLabel="Compare periods"
          title="Compare report periods"
          toolName="compare_report_periods"
          unlocked={unlocked}
        />
      </div>
    </section>
  );
}
