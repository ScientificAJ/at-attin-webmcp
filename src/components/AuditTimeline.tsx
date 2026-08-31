import {
  Check,
  Clock,
  X,
} from '@phosphor-icons/react';
import type { AuditEvent } from '../domain/models';

interface AuditTimelineProps {
  events: readonly AuditEvent[];
  limit?: number;
}

export function AuditTimeline({ events, limit = 6 }: AuditTimelineProps) {
  return (
    <section className="audit-timeline" aria-labelledby="audit-title">
      <div className="section-heading">
        <h2 id="audit-title">Recent agent activity</h2>
        <span>Safe device-local record</span>
      </div>
      <ol>
        {events.slice(0, limit).map((event) => {
          const OutcomeIcon = event.outcome === 'success' ? Check : event.outcome === 'cancelled' ? X : Clock;
          return (
            <li key={event.id}>
              <time dateTime={event.timestamp}>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(event.timestamp))}</time>
              <OutcomeIcon aria-hidden="true" weight="regular" />
              <span>
                <strong>{event.eventType.replaceAll('_', ' ')}</strong>
                <small>{event.safeDetail}</small>
              </span>
              <span className="state-pill">{event.outcome}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
