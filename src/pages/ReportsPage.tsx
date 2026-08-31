import {
  ArrowRight,
  ChartLineUp,
  TrendDown,
  TrendUp,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { useAppServices, useBankState } from '../app/routes';
import { Amount } from '../components/Amount';
import { DeclarativeToolForm } from '../components/DeclarativeToolForm';
import { ReportBars } from '../components/ReportBars';
import { formatATC } from '../domain/money';
import {
  selectSpendingSummary,
  selectStatement,
  selectCashFlow,
  selectIncomeSummary,
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
  const spending = selectSpendingSummary(state);
  const cashFlow = selectCashFlow(state);
  const income = selectIncomeSummary(state);
  const accountOptions = state.accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }));

  return (
    <section className="tool-page reports-page" aria-labelledby="reports-title">
      <header className="tool-page__intro reports-page__intro">
        <p className="eyebrow">Reports</p>
        <h1 id="reports-title">Reports</h1>
        <p>See where fictional ATC moved, without visual clutter.</p>
        <Link className="quiet-link" to="/reports/plan">Open monthly plan <ArrowRight aria-hidden="true" /></Link>
      </header>
      <section className="report-metrics" aria-label="Report summary">
        <article><TrendDown aria-hidden="true" /><span>Spent</span><Amount value={spending.totalSpent} /></article>
        <article><TrendUp aria-hidden="true" /><span>Income</span><Amount value={income.totalIncome} /></article>
        <article><ChartLineUp aria-hidden="true" /><span>Net cash flow</span><Amount sign="auto" value={cashFlow.net} /></article>
      </section>
      <ReportBars items={spending.byCategory.map(({ category, amount }) => ({ label: category, value: amount }))} title="Spending by category" />
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
