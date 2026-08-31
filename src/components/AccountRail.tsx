import {
  ArrowUpRight,
  Bank,
  Umbrella,
} from '@phosphor-icons/react';
import type { Account } from '../domain/models';
import { Amount } from './Amount';

interface AccountRailProps {
  accounts: readonly Account[];
  selectedId: string;
  onSelect(id: string): void;
}

export function AccountRail({ accounts, selectedId, onSelect }: AccountRailProps) {
  return (
    <div className="account-rail" role="list" aria-label="Accounts">
      {accounts.map((account) => {
        const Icon = account.type === 'current' ? ArrowUpRight : account.type === 'vault' ? Bank : Umbrella;
        return (
          <button
            aria-pressed={account.id === selectedId}
            className={account.id === selectedId ? 'is-selected' : ''}
            key={account.id}
            onClick={() => onSelect(account.id)}
            type="button"
          >
            <Icon aria-hidden="true" weight="regular" />
            <span>
              <strong>{account.name}</strong>
              <small>{account.type === 'current' ? 'Everyday spending' : account.type === 'vault' ? 'Long-term savings' : 'Emergency reserve'}</small>
            </span>
            <Amount value={account.balance} />
          </button>
        );
      })}
    </div>
  );
}
