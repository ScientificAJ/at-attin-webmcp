import {
  Bell,
  DeviceMobile,
  LockKey,
  ShieldCheck,
  UserCircle,
} from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAppServices, useBankState } from '../app/routes';
import { AgentAccessControl } from '../components/AgentAccessControl';
import { DeclarativeToolForm } from '../components/DeclarativeToolForm';
import { ManualActionReview } from '../components/ManualActionReview';
import { PreferenceControl } from '../components/PreferenceControl';
import {
  prepareOperation,
  type PreparedOperation,
} from '../domain/operations/types';
import { selectAgentAudit } from '../domain/selectors';

interface SettingsReview {
  prepared: PreparedOperation;
  success: string;
}

export function SettingsPage() {
  const state = useBankState();
  const { bankStore, toolBridge } = useAppServices();
  const unlocked = state.user.preferences.agentAccessUnlocked;
  const [review, setReview] = useState<SettingsReview | null>(null);
  const [message, setMessage] = useState('');
  const [resetReady, setResetReady] = useState(false);

  const prepare = (operation: 'set_accessibility_mode' | 'set_alert_preference' | 'manage_trusted_contact', args: Record<string, unknown>, success: string) => {
    try {
      setMessage('');
      setReview({ prepared: prepareOperation(bankStore, operation, args), success });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Setting could not be prepared.');
    }
  };

  const contact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    prepare('manage_trusted_contact', {
      action: 'set',
      contact: {
        name: String(form.get('name')),
        relationship: String(form.get('relationship')),
        contact: String(form.get('contact')),
      },
    }, 'Trusted contact saved.');
  };

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <header className="page-title-block settings-page__intro">
        <p className="eyebrow">Settings</p>
        <h1 id="settings-title">Settings</h1>
        <p>Your preferences, safeguards, and device-local controls.</p>
        <nav className="inline-links" aria-label="Settings sections">
          <Link to="/settings/support">Support</Link>
          <Link to="/settings/agent">Safety &amp; Agent</Link>
        </nav>
      </header>
      <div className="settings-grid">
        <AgentAccessControl />
        <section className="settings-section" aria-labelledby="accessibility-title">
          <div className="settings-section__heading"><UserCircle aria-hidden="true" /><div><p className="eyebrow">Comfort</p><h2 id="accessibility-title">Accessibility</h2></div></div>
          <div className="preference-list">
            {([
              ['largeText', 'Large text', 'Increase type throughout the bank.'],
              ['highContrast', 'High contrast', 'Strengthen rules and secondary text.'],
              ['reducedMotion', 'Reduced motion', 'Remove non-essential movement.'],
              ['plainLanguage', 'Plain language', 'Prefer direct, familiar labels.'],
            ] as const).map(([mode, label, description]) => (
              <PreferenceControl
                description={description}
                enabled={state.user.preferences.accessibility[mode]}
                key={mode}
                label={label}
                onChange={(enabled) => prepare('set_accessibility_mode', { mode, enabled }, `${label} changed.`)}
              />
            ))}
          </div>
        </section>
        <section className="settings-section" aria-labelledby="alerts-title">
          <div className="settings-section__heading"><Bell aria-hidden="true" /><div><p className="eyebrow">Awareness</p><h2 id="alerts-title">Alerts</h2></div></div>
          <div className="preference-list">
            {state.alerts.map((alert) => (
              <PreferenceControl
                description={`${alert.channel.replace('-', ' ')}${alert.threshold === null ? '' : ` · ${alert.threshold / 100} ATC threshold`}`}
                enabled={alert.enabled}
                key={alert.id}
                label={alert.event.replace('-', ' ')}
                onChange={(enabled) => prepare('set_alert_preference', {
                  event: alert.event,
                  channel: alert.channel,
                  ...(alert.threshold === null ? {} : { thresholdMinor: alert.threshold }),
                  enabled,
                }, 'Alert preference changed.')}
              />
            ))}
          </div>
        </section>
        <section className="settings-section" aria-labelledby="contact-title">
          <div className="settings-section__heading"><ShieldCheck aria-hidden="true" /><div><p className="eyebrow">Safety circle</p><h2 id="contact-title">Trusted contact</h2></div></div>
          {state.user.preferences.trustedContact ? (
            <div className="trusted-contact">
              <p><strong>{state.user.preferences.trustedContact.name}</strong><span>{state.user.preferences.trustedContact.relationship} · {state.user.preferences.trustedContact.contact}</span></p>
              <button onClick={() => prepare('manage_trusted_contact', { action: 'remove' }, 'Trusted contact removed.')} type="button">Review removal</button>
            </div>
          ) : (
            <form className="compact-form" onSubmit={contact}>
              <label>Name<input maxLength={80} name="name" required /></label>
              <label>Relationship<input maxLength={60} name="relationship" required /></label>
              <label>Email or phone<input maxLength={120} name="contact" required /></label>
              <button type="submit">Review trusted contact</button>
            </form>
          )}
        </section>
        <section className="settings-section" aria-labelledby="device-title">
          <div className="settings-section__heading"><DeviceMobile aria-hidden="true" /><div><p className="eyebrow">This device</p><h2 id="device-title">Session &amp; data</h2></div></div>
          <dl className="settings-facts"><div><dt>Signed in as</dt><dd>john.attin</dd></div><div><dt>Storage</dt><dd>This browser only</dd></div><div><dt>Money</dt><dd>Fictional · no cash value</dd></div></dl>
          {!resetReady ? (
            <button className="quiet-action" onClick={() => setResetReady(true)} type="button">Review demo reset</button>
          ) : (
            <div className="reset-review" role="region" aria-label="Demo reset review">
              <p><LockKey aria-hidden="true" /> Reset all balances, preferences, cases, and activity to the original fictional demo?</p>
              <button onClick={() => { const result = bankStore.reset(); setMessage(result.ok ? 'Demo data reset.' : 'Demo data could not be reset.'); setResetReady(false); }} type="button">Yes, reset demo</button>
              <button onClick={() => setResetReady(false)} type="button">No, keep my demo</button>
            </div>
          )}
        </section>
      </div>
      <section className="settings-audit-form" aria-labelledby="filter-audit-title">
        <DeclarativeToolForm
          bridge={toolBridge}
          description="Filter safe local agent-audit entries by outcome or bounded text."
          fields={[
            { name: 'outcome', label: 'Outcome', description: 'Optional safe audit outcome.', type: 'select', options: [
              { value: '', label: 'Any outcome' }, { value: 'success', label: 'Success' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'rejected', label: 'Rejected' }, { value: 'recovered', label: 'Recovered' },
            ] },
            { name: 'query', label: 'Audit search', description: 'Bounded event or safe-detail search text.', type: 'text', maxLength: 80 },
            { name: 'limit', label: 'Maximum entries', description: 'Return between 1 and 100 safe entries.', type: 'number', minimum: 1, maximum: 100, defaultValue: 25 },
          ]}
          onManualSubmit={(args) => {
            const limit = typeof args.limit === 'number' ? args.limit : 25;
            const outcome = typeof args.outcome === 'string' ? args.outcome : '';
            const query = typeof args.query === 'string' ? args.query.toLocaleLowerCase('en-US') : '';
            const matches = [...selectAgentAudit(state, limit), ...toolBridge.getAuditJournal().getEvents()]
              .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
              .slice(0, limit)
              .filter((entry) => {
                const searchable = `${entry.eventType} ${entry.safeDetail}`.toLocaleLowerCase('en-US');
                return (!outcome || entry.outcome === outcome) && (!query || searchable.includes(query));
              });
            return `${matches.length} matching audit entr${matches.length === 1 ? 'y' : 'ies'}.`;
          }}
          submitLabel="Filter audit"
          title="Filter agent audit"
          toolName="filter_agent_audit"
          unlocked={unlocked}
        />
      </section>
      {message ? <p className="form-message" role="status">{message}</p> : null}
      {review ? (
        <ManualActionReview
          ariaLabel="Settings action review"
          onCancel={() => setReview(null)}
          prepared={review.prepared}
          successMessage={review.success}
        />
      ) : null}
    </section>
  );
}
