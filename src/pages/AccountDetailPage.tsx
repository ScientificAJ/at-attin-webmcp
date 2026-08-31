import {
  ArrowRight,
  DownloadSimple,
  Receipt,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  Account,
  Transaction,
} from '../domain/models';
import { Amount } from '../components/Amount';
import { TransactionRow } from '../components/TransactionRow';

interface AccountDetailPageProps {
  account: Account;
  transactions: readonly Transaction[];
}

export function AccountDetailPage({ account, transactions }: AccountDetailPageProps) {
  const [statementVisible, setStatementVisible] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  return (
    <section aria-label="Selected account" className="account-detail obsidian-surface" role="region">
      <header>
        <p className="eyebrow">{account.type === 'current' ? 'Everyday spending' : account.type === 'vault' ? 'Long-term savings' : 'Emergency reserve'}</p>
        <h2>{account.name}</h2>
        <p>{account.maskedIdentifier} · {account.status}</p>
      </header>
      <div className="account-detail__balance">
        <span>Available balance</span>
        <Amount value={account.availableBalance} />
      </div>
      <dl className="account-facts">
        <div><dt>Account ID</dt><dd>{account.maskedIdentifier}</dd></div>
        <div><dt>Account type</dt><dd>{account.type}</dd></div>
        <div><dt>Balance floor</dt><dd><Amount value={account.balanceFloor} /></dd></div>
      </dl>
      <section className="account-ledger" aria-labelledby={`ledger-${account.id}`}>
        <div className="section-heading section-heading--dark">
          <h3 id={`ledger-${account.id}`}>Recent transactions</h3>
          <span>{transactions.length}</span>
        </div>
        {transactions.length > 0 ? (
          <ol>
            {transactions.slice(0, 4).map((transaction) => (
              <TransactionRow compact key={transaction.id} onSelect={setReceipt} transaction={transaction} />
            ))}
          </ol>
        ) : <p className="empty-state">No transactions for this account yet.</p>}
      </section>
      {receipt ? (
        <section className="receipt-simulation" aria-label="Fictional receipt">
          <Receipt aria-hidden="true" />
          <div>
            <strong>{receipt.merchant}</strong>
            <span>{receipt.memo}</span>
          </div>
          <Amount sign={receipt.direction === 'credit' ? 'credit' : 'debit'} value={receipt.amount} />
          <button onClick={() => setReceipt(null)} type="button">Close receipt</button>
        </section>
      ) : null}
      {statementVisible ? (
        <p className="account-detail__statement" role="status">
          <DownloadSimple aria-hidden="true" /> {transactions.length} statement transactions ready for this fictional account.
        </p>
      ) : null}
      <div className="account-detail__actions">
        <button className="signal-action" onClick={() => setStatementVisible(true)} type="button">
          <ArrowRight aria-hidden="true" /> <span>View statement</span>
        </button>
        <Link className="outline-action" to="/payments">
          <ArrowRight aria-hidden="true" /> <span>Move money</span>
        </Link>
      </div>
    </section>
  );
}
