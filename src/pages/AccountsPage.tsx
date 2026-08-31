import { CreditCard } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBankState } from '../app/routes';
import { AccountRail } from '../components/AccountRail';
import { Amount } from '../components/Amount';
import { selectOverview } from '../domain/selectors';
import { AccountDetailPage } from './AccountDetailPage';

export function AccountsPage() {
  const state = useBankState();
  const overview = selectOverview(state);
  const [selectedId, setSelectedId] = useState('account-daily');
  const account = state.accounts.find(({ id }) => id === selectedId) ?? state.accounts[0];

  if (!account) return null;

  return (
    <section className="accounts-page" aria-labelledby="accounts-title">
      <div className="accounts-page__overview">
        <header>
          <p className="eyebrow">Accounts</p>
          <h1 id="accounts-title">Your accounts</h1>
          <p className="accounts-total"><Amount value={overview.totalBalance} /></p>
          <p className="page-supporting">Across {overview.accountCount} accounts · Fictional funds</p>
          <Link className="quiet-link" to="/accounts/cards"><CreditCard aria-hidden="true" /> Manage cards</Link>
        </header>
        <AccountRail accounts={state.accounts} onSelect={setSelectedId} selectedId={account.id} />
      </div>
      <AccountDetailPage
        account={account}
        transactions={state.transactions.filter(({ accountId }) => accountId === account.id)}
      />
    </section>
  );
}
