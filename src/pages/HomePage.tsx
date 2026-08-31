import {
  ArrowRight,
  ShieldCheck,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppServices, useBankState } from '../app/routes';
import { Amount } from '../components/Amount';
import { CashFlowLine } from '../components/CashFlowLine';
import { ManualActionReview } from '../components/ManualActionReview';
import { TransactionRow } from '../components/TransactionRow';
import { atc } from '../domain/money';
import { prepareOperation, type PreparedOperation } from '../domain/operations/types';
import {
  selectCashFlow,
  selectOverview,
} from '../domain/selectors';

export function HomePage() {
  const state = useBankState();
  const { bankStore } = useAppServices();
  const overview = selectOverview(state);
  const cashFlow = selectCashFlow(state);
  const [prepared, setPrepared] = useState<PreparedOperation | null>(null);
  const [error, setError] = useState('');

  const prepareSample = () => {
    try {
      setError('');
      setPrepared(prepareOperation(bankStore, 'pay_payee', {
        sourceAccountId: 'account-daily',
        payeeId: 'payee-mara',
        amountMinor: atc(420),
        balanceFloorMinor: atc(5000),
        note: 'Prepared from Home',
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The payment could not be prepared.');
    }
  };

  return (
    <section className="home-page" aria-labelledby="home-title">
      <div className="home-page__grid">
        <div className="home-page__main">
          <header className="home-balance">
            <h1 id="home-title">Good evening, John</h1>
            <p className="hero-balance"><Amount value={overview.totalBalance} /></p>
            <p>Fictional funds</p>
          </header>
          <section className="activity-preview" aria-labelledby="recent-title">
            <div className="section-heading">
              <h2 id="recent-title">Recent activity</h2>
              <Link to="/activity">View all</Link>
            </div>
            <ol className="activity-list">
              {state.transactions.slice(0, 3).map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </ol>
          </section>
        </div>
        <aside className="home-page__aside">
          <CashFlowLine inflow={cashFlow.inflow} net={cashFlow.net} outflow={cashFlow.outflow} />
          {prepared ? (
            <ManualActionReview
              ariaLabel="Home payment review"
              onCancel={() => setPrepared(null)}
              prepared={prepared}
              successMessage="Payment completed."
            />
          ) : (
            <section className="home-agent-panel obsidian-surface" aria-labelledby="home-agent-title">
              <div>
                <p className="eyebrow">WebMCP control</p>
                <h2 id="home-agent-title">Ready when you are.</h2>
                <p>Ask At Attin in plain language. Its Featherless-powered agent uses WebMCP tools, and pauses here before it shares or changes anything.</p>
              </div>
              <ul>
                <li><ShieldCheck aria-hidden="true" /> Every read needs your confirmation</li>
                <li><ShieldCheck aria-hidden="true" /> Every change shows exact consequences</li>
                <li><ShieldCheck aria-hidden="true" /> Critical tasks require typed YES</li>
              </ul>
              <button className="signal-action" onClick={prepareSample} type="button">
                <ArrowRight aria-hidden="true" /> <span>Prepare a 420 ATC demo payment</span>
              </button>
              <Link className="text-action text-action--dark" to="/settings/agent">Open Safety &amp; Agent</Link>
            </section>
          )}
          {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
        </aside>
      </div>
    </section>
  );
}
