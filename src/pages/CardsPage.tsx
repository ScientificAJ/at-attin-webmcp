import {
  Airplane,
  ContactlessPayment,
  CreditCard,
  Eye,
  Globe,
  LockKey,
  Snowflake,
  WarningOctagon,
} from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { useAppServices, useBankState } from '../app/routes';
import { Amount } from '../components/Amount';
import { CardControlRow } from '../components/CardControlRow';
import { ManualActionReview } from '../components/ManualActionReview';
import { atc } from '../domain/money';
import {
  prepareOperation,
  type OperationCommitSuccess,
  type OperationName,
  type PreparedOperation,
} from '../domain/operations/types';

interface CardReview {
  prepared: PreparedOperation;
  success: string;
  reveal?: boolean;
}

export function CardsPage() {
  const state = useBankState();
  const { bankStore } = useAppServices();
  const [selectedId, setSelectedId] = useState(state.cards[0]?.id ?? '');
  const [review, setReview] = useState<CardReview | null>(null);
  const [error, setError] = useState('');
  const [pin, setPin] = useState('');
  const card = state.cards.find(({ id }) => id === selectedId) ?? state.cards[0];

  if (!card) return null;
  const account = state.accounts.find(({ id }) => id === card.accountId);

  const prepare = (
    operation: OperationName,
    args: Record<string, unknown>,
    success: string,
    reveal = false,
  ) => {
    try {
      setError('');
      setPin('');
      setReview({ prepared: prepareOperation(bankStore, operation, args), success, reveal });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Card task could not be prepared.');
    }
  };

  const changed = (result: OperationCommitSuccess) => {
    if (!review?.reveal) return;
    const data = result.data as { pin?: string } | undefined;
    setPin(data?.pin ?? 'Unavailable');
  };

  const changeLimit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    prepare('set_card_limit', { cardId: card.id, limitMinor: atc(Number(form.get('limit'))) }, 'Card limit changed.');
  };

  return (
    <section className="cards-page" aria-labelledby="cards-title">
      <header className="page-title-block cards-page__intro">
        <p className="eyebrow">Accounts · Cards</p>
        <h1 id="cards-title">Cards</h1>
        <p>One clear place for every card safeguard.</p>
      </header>
      <div className="cards-page__layout">
        <aside className="card-rail" aria-label="Your cards">
          {state.cards.map((candidate) => (
            <button
              aria-pressed={candidate.id === card.id}
              className={candidate.id === card.id ? 'is-selected' : ''}
              key={candidate.id}
              onClick={() => { setSelectedId(candidate.id); setReview(null); setPin(''); }}
              type="button"
            >
              <CreditCard aria-hidden="true" weight="regular" />
              <span><strong>{candidate.type === 'physical' ? 'Daily card' : 'Vault virtual'}</strong><small>{candidate.maskedNumber}</small></span>
              <span className="state-pill">{candidate.status}</span>
            </button>
          ))}
        </aside>
        <div className="card-controls">
          <section className="card-summary obsidian-surface" aria-labelledby="selected-card-title">
            <div>
              <p className="eyebrow">At Attin · {card.type}</p>
              <h2 id="selected-card-title">{card.maskedNumber}</h2>
              <p>{account?.name} · <span className="state-pill">{card.status}</span></p>
            </div>
            <div><span>Daily limit</span><Amount value={card.limit} /></div>
          </section>
          <section className="control-list" aria-label="Card controls">
            <CardControlRow
              actionLabel={card.status === 'frozen' ? 'Unfreeze card' : 'Freeze card'}
              detail="Stops new card payments immediately."
              enabled={card.status === 'frozen'}
              icon={Snowflake}
              label="Card freeze"
              onAction={() => prepare('set_card_freeze', { cardId: card.id, frozen: card.status !== 'frozen' }, card.status === 'frozen' ? 'Card unfrozen.' : 'Card frozen.')}
            />
            <CardControlRow
              actionLabel={card.onlinePayments ? 'Turn off' : 'Turn on'}
              detail="Control online card purchases."
              enabled={card.onlinePayments}
              icon={Globe}
              label="Online payments"
              onAction={() => prepare('set_online_payments', { cardId: card.id, enabled: !card.onlinePayments }, 'Online payment setting changed.')}
            />
            <CardControlRow
              actionLabel={card.contactless ? 'Turn off' : 'Turn on'}
              detail="Control contactless taps."
              enabled={card.contactless}
              icon={ContactlessPayment}
              label="Contactless"
              onAction={() => prepare('set_contactless', { cardId: card.id, enabled: !card.contactless }, 'Contactless setting changed.')}
            />
            <CardControlRow
              actionLabel={card.travelMode ? 'Turn off' : 'Turn on'}
              detail="Allow fictional card use while travelling."
              enabled={card.travelMode}
              icon={Airplane}
              label="Travel mode"
              onAction={() => prepare('set_travel_mode', { cardId: card.id, enabled: !card.travelMode }, 'Travel mode changed.')}
            />
            <CardControlRow
              actionLabel="Reveal PIN"
              detail="One-time fictional on-device reveal."
              icon={Eye}
              label="Card PIN"
              onAction={() => prepare('reveal_card_pin', { cardId: card.id }, 'Fictional PIN revealed.', true)}
            />
            <CardControlRow
              actionLabel="Report lost"
              danger
              detail="Freezes payment controls and retires the card."
              icon={WarningOctagon}
              label="Lost card"
              onAction={() => prepare('report_card_lost', { cardId: card.id }, 'Card reported lost.')}
            />
            <CardControlRow
              actionLabel="Replace card"
              danger
              detail="Creates a new frozen fictional replacement."
              icon={LockKey}
              label="Replace card"
              onAction={() => prepare('replace_card', { cardId: card.id }, 'Replacement card created.')}
            />
          </section>
          <form className="limit-form" onSubmit={changeLimit}>
            <label>New daily limit <input defaultValue={card.limit / 100} min="1" name="limit" step="0.01" type="number" /></label>
            <button type="submit">Review limit</button>
          </form>
          {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
          {review ? (
            <ManualActionReview
              ariaLabel="Card action review"
              onCancel={() => setReview(null)}
              onComplete={changed}
              prepared={review.prepared}
              successMessage={review.success}
            />
          ) : null}
          {pin ? <p className="pin-reveal" role="status"><span>Fictional PIN</span><strong>{pin}</strong><small>Hidden again when you leave this page.</small></p> : null}
        </div>
      </div>
    </section>
  );
}
