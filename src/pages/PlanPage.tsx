import {
  ArrowRight,
  CalendarCheck,
  Plus,
} from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { useAppServices, useBankState } from '../app/routes';
import { BudgetRow } from '../components/BudgetRow';
import { GoalProgress } from '../components/GoalProgress';
import { ManualActionReview } from '../components/ManualActionReview';
import { SubscriptionRow } from '../components/SubscriptionRow';
import { atc } from '../domain/money';
import {
  prepareOperation,
  type PreparedOperation,
} from '../domain/operations/types';

interface PlanReview {
  prepared: PreparedOperation;
  success: string;
}

export function PlanPage() {
  const state = useBankState();
  const { bankStore } = useAppServices();
  const [review, setReview] = useState<PlanReview | null>(null);
  const [message, setMessage] = useState('');

  const prepare = (operation: 'create_budget' | 'fund_savings_goal', args: Record<string, unknown>, success: string) => {
    try {
      setMessage('');
      setReview({ prepared: prepareOperation(bankStore, operation, args), success });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Planning task could not be prepared.');
    }
  };

  const addBudget = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    prepare('create_budget', {
      category: String(form.get('category')),
      limitMinor: atc(Number(form.get('limit'))),
      rollover: form.get('rollover') === 'on',
    }, 'Budget created.');
  };

  const goal = state.goals[0];

  return (
    <section className="plan-page" aria-labelledby="plan-title">
      <header className="page-title-block plan-page__intro">
        <p className="eyebrow">Reports · Plan</p>
        <h1 id="plan-title">Plan</h1>
        <p>A calm monthly view of limits, goals, and recurring costs.</p>
      </header>
      <div className="plan-page__summary obsidian-surface">
        <CalendarCheck aria-hidden="true" weight="regular" />
        <div><p className="eyebrow">September 2026</p><h2>Your month, prepared.</h2><p>{state.budgets.length} budgets · {state.subscriptions.filter(({ status }) => status === 'active').length} subscriptions · {state.payments.filter(({ status }) => status === 'scheduled').length} upcoming payments</p></div>
      </div>
      <div className="plan-grid">
        <section className="plan-section" aria-labelledby="budgets-title">
          <div className="section-heading"><h2 id="budgets-title">Budgets</h2><span>Monthly</span></div>
          <ol>{state.budgets.map((budget) => <BudgetRow budget={budget} key={budget.id} />)}</ol>
          <details>
            <summary><Plus aria-hidden="true" /> Create a budget</summary>
            <form className="compact-form" onSubmit={addBudget}>
              <label>Category<input maxLength={50} name="category" required /></label>
              <label>Monthly limit<input min="1" name="limit" required step="0.01" type="number" /></label>
              <label className="check-field"><input name="rollover" type="checkbox" /> Roll unused amount forward</label>
              <button type="submit">Review budget</button>
            </form>
          </details>
        </section>
        <section className="plan-section" aria-labelledby="goals-title">
          <div className="section-heading"><h2 id="goals-title">Goals</h2><span>Reserved safely</span></div>
          {state.goals.map((item) => <GoalProgress goal={item} key={item.id} />)}
          {goal ? (
            <button
              className="quiet-action"
              onClick={() => prepare('fund_savings_goal', {
                goalId: goal.id,
                sourceAccountId: 'account-daily',
                amountMinor: atc(200),
                balanceFloorMinor: atc(5000),
              }, 'Goal funded.')}
              type="button"
            >
              <ArrowRight aria-hidden="true" /> Review 200 ATC contribution
            </button>
          ) : null}
        </section>
        <section className="plan-section plan-section--wide" aria-labelledby="subscriptions-title">
          <div className="section-heading"><h2 id="subscriptions-title">Subscriptions</h2><span>Recurring activity</span></div>
          <ol>{state.subscriptions.map((subscription) => <SubscriptionRow key={subscription.id} subscription={subscription} />)}</ol>
        </section>
      </div>
      {message ? <p className="form-message form-message--error" role="alert">{message}</p> : null}
      {review ? (
        <ManualActionReview
          ariaLabel="Plan action review"
          onCancel={() => setReview(null)}
          prepared={review.prepared}
          successMessage={review.success}
        />
      ) : null}
    </section>
  );
}
