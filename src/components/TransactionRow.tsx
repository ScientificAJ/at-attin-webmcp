import {
  ArrowDownLeft,
  ArrowUpRight,
} from '@phosphor-icons/react';
import type { Transaction } from '../domain/models';
import { Amount } from './Amount';

interface TransactionRowProps {
  transaction: Transaction;
  compact?: boolean;
  onSelect?: (transaction: Transaction) => void;
}

export function TransactionRow({ transaction, compact = false, onSelect }: TransactionRowProps) {
  const incoming = transaction.direction === 'credit';
  const RowIcon = incoming ? ArrowDownLeft : ArrowUpRight;
  const body = (
    <>
      <RowIcon aria-hidden="true" weight="regular" />
      <span className="transaction-row__copy">
        <strong>{incoming ? 'Received from' : 'Payment to'} {transaction.merchant}</strong>
        <span>{transaction.category} · {transaction.status}</span>
      </span>
      <span className="transaction-row__amount">
        <Amount sign={incoming ? 'credit' : 'debit'} value={transaction.amount} />
        <time dateTime={transaction.date}>
          {new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          }).format(new Date(transaction.date))}
        </time>
      </span>
    </>
  );

  return (
    <li className={`transaction-row${compact ? ' transaction-row--compact' : ''}`}>
      {onSelect ? (
        <button aria-label={`View ${transaction.merchant} transaction`} onClick={() => onSelect(transaction)} type="button">
          {body}
        </button>
      ) : body}
    </li>
  );
}
