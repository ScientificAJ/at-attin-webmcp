import { Plus } from '@phosphor-icons/react';
import type { Payee } from '../domain/models';

interface PayeeRailProps {
  payees: readonly Payee[];
  selectedId: string;
  onSelect(id: string): void;
  onAdd?(): void;
}

function initials(name: string): string {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toLocaleUpperCase('en-US');
}

export function PayeeRail({ payees, selectedId, onSelect, onAdd }: PayeeRailProps) {
  return (
    <section className="payee-rail" aria-labelledby="payee-rail-title">
      <div className="rail-heading">
        <h2 id="payee-rail-title">Payees</h2>
        {onAdd ? (
          <button className="rail-add" onClick={onAdd} type="button">
            <Plus aria-hidden="true" weight="regular" /> New payee
          </button>
        ) : null}
      </div>
      <div role="list">
        {payees.map((payee) => (
          <button
            aria-pressed={payee.id === selectedId}
            className={payee.id === selectedId ? 'is-selected' : ''}
            key={payee.id}
            onClick={() => onSelect(payee.id)}
            type="button"
          >
            <span aria-hidden="true" className="payee-initials">{initials(payee.name)}</span>
            <span>
              <strong>{payee.name}</strong>
              <small>{payee.accountAlias}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
