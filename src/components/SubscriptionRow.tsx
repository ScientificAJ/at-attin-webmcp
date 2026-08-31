import type { Subscription } from '../domain/models';
import { Amount } from './Amount';

export function SubscriptionRow({ subscription }: { subscription: Subscription }) {
  return (
    <li className="subscription-row">
      <span>
        <strong>{subscription.merchant}</strong>
        <small>{subscription.frequency} · {subscription.status}</small>
      </span>
      <span>
        <Amount value={subscription.amount} />
        <time dateTime={subscription.nextDate}>Next {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${subscription.nextDate}T00:00:00Z`))}</time>
      </span>
    </li>
  );
}
