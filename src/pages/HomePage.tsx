import {
  ArrowDownLeft,
  ArrowUpRight,
} from '@phosphor-icons/react';
import { useBankState } from '../app/routes';
import { formatATC } from '../domain/money';
import {
  selectCashFlow,
  selectOverview,
} from '../domain/selectors';

export function HomePage() {
  const state = useBankState();
  const overview = selectOverview(state);
  const cashFlow = selectCashFlow(state);

  return (
    <section className="home-page" aria-labelledby="home-title">
      <div className="home-hero">
        <div>
          <p className="eyebrow">Good evening, John</p>
          <h1 id="home-title">Good evening, John</h1>
          <p className="hero-balance money">{formatATC(overview.totalBalance)}</p>
          <p className="muted">Fictional funds</p>
        </div>
        <div className="cash-flow-summary">
          <p className="eyebrow">Cash flow</p>
          <p className="cash-flow-value money">{formatATC(cashFlow.net)}</p>
          <p>
            Inflow {formatATC(cashFlow.inflow)} · Outflow {formatATC(cashFlow.outflow)}
          </p>
        </div>
      </div>
      <section className="activity-preview" aria-labelledby="recent-title">
        <div className="section-heading">
          <h2 id="recent-title">Recent activity</h2>
          <span>Latest posted transactions</span>
        </div>
        <ol className="activity-list">
          {state.transactions.slice(0, 3).map((transaction) => {
            const incoming = transaction.direction === 'credit';
            const ActivityIcon = incoming ? ArrowDownLeft : ArrowUpRight;
            return (
              <li key={transaction.id}>
                <ActivityIcon aria-hidden="true" weight="regular" />
                <div>
                  <strong>{incoming ? 'Received from' : 'Payment to'} {transaction.merchant}</strong>
                  <span>{transaction.category}</span>
                </div>
                <span className="money">
                  {incoming ? '+' : '−'}{formatATC(transaction.amount)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </section>
  );
}
