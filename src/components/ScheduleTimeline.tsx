import type { Payment } from '../domain/models';
import { Amount } from './Amount';

interface ScheduleTimelineProps {
  payments: readonly Payment[];
}

export function ScheduleTimeline({ payments }: ScheduleTimelineProps) {
  return (
    <section className="schedule-timeline" aria-labelledby="upcoming-title">
      <h2 id="upcoming-title">Upcoming</h2>
      {payments.length === 0 ? <p className="empty-state">No upcoming payments.</p> : (
        <ol>
          {payments.slice(0, 4).map((payment) => (
            <li key={payment.id}>
              <span aria-hidden="true" className="timeline-mark" />
              <span>
                <strong>{payment.payeeName ?? 'Account transfer'}</strong>
                <small>{payment.recurrence ? `${payment.recurrence.frequency} · ${payment.status}` : payment.status}</small>
              </span>
              <time dateTime={payment.date}>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(payment.date))}</time>
              <Amount value={payment.amount} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
