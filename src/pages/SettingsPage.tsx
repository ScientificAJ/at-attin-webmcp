import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  useAppServices,
  useBankState,
  useSignedIn,
} from '../app/routes';
import { DeclarativeToolForm } from '../components/DeclarativeToolForm';
import { selectAgentAudit } from '../domain/selectors';
import { useState } from 'react';

export function SettingsPage() {
  const state = useBankState();
  const signedIn = useSignedIn();
  const {
    bankStore,
    toolBridge,
    toolRegistry,
    trustPredicate,
  } = useAppServices();
  const unlocked = state.user.preferences.agentAccessUnlocked;
  const [accessMessage, setAccessMessage] = useState('');

  const toggleAgentAccess = (event: MouseEvent<HTMLButtonElement>) => {
    if (!trustPredicate(event.nativeEvent)) {
      setAccessMessage('trusted-user-activation-required');
      return;
    }
    const next = !unlocked;
    const version = bankStore.getState().stateVersion;
    const result = bankStore.transact(
      version,
      `human-agent-access-${next ? 'unlock' : 'lock'}-${version}`,
      (draft) => {
        draft.user.preferences.agentAccessUnlocked = next;
        draft.audit.push({
          id: `audit-human-agent-access-${next ? 'unlock' : 'lock'}-${version}`,
          actor: 'user',
          eventType: next ? 'agent_access_unlocked' : 'agent_access_locked',
          target: 'agent-access',
          outcome: 'success',
          timestamp: new Date().toISOString(),
          safeDetail: next
            ? 'Agent Access unlocked by trusted human activation.'
            : 'Agent Access locked by trusted human activation.',
        });
      },
    );
    if (!result.ok) {
      setAccessMessage(`Agent Access was not changed: ${result.code}.`);
      return;
    }
    void toolRegistry.sync({ signedIn, agentUnlocked: next });
    setAccessMessage(next
      ? 'Agent Access unlocked. Every action still needs confirmation.'
      : 'Agent Access locked. All imperative tools were removed.');
  };

  return (
    <section className="tool-page" aria-labelledby="settings-title">
      <header className="tool-page__intro">
        <p className="eyebrow">Settings</p>
        <h1 id="settings-title">Settings</h1>
        <p>Control human-only Agent Access and inspect the device-local audit trail.</p>
        <nav className="inline-links" aria-label="Settings sections">
          <Link to="/settings/support">Support</Link>
          <Link to="/settings/agent">Safety &amp; Agent</Link>
        </nav>
      </header>
      <section className="agent-access-panel" aria-labelledby="agent-access-title">
        <div>
          <p className="eyebrow">Human control</p>
          <h2 id="agent-access-title">Agent Access</h2>
          <p>
            {unlocked
              ? 'Native tools are discoverable on this origin. Confirmation remains mandatory.'
              : 'Native tools are not registered. Manual banking remains available.'}
          </p>
        </div>
        <button onClick={toggleAgentAccess} type="button">
          {unlocked ? 'Lock Agent Access' : 'Unlock Agent Access'}
        </button>
        {accessMessage ? (
          <p aria-live="polite" role={accessMessage.includes('required') ? 'alert' : 'status'}>
            {accessMessage}
          </p>
        ) : null}
      </section>
      <DeclarativeToolForm
        bridge={toolBridge}
        description="Filter safe local agent-audit entries by outcome or bounded text."
        fields={[
          {
            name: 'outcome',
            label: 'Outcome',
            description: 'Optional safe audit outcome.',
            type: 'select',
            options: [
              { value: '', label: 'Any outcome' },
              { value: 'success', label: 'Success' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'recovered', label: 'Recovered' },
            ],
          },
          {
            name: 'query',
            label: 'Audit search',
            description: 'Bounded event or safe-detail search text.',
            type: 'text',
            maxLength: 80,
          },
          {
            name: 'limit',
            label: 'Maximum entries',
            description: 'Return between 1 and 100 safe entries.',
            type: 'number',
            minimum: 1,
            maximum: 100,
            defaultValue: 25,
          },
        ]}
        onManualSubmit={(args) => {
          const limit = typeof args.limit === 'number' ? args.limit : 25;
          const outcome = typeof args.outcome === 'string' ? args.outcome : '';
          const query = typeof args.query === 'string'
            ? args.query.toLocaleLowerCase('en-US')
            : '';
          const matches = selectAgentAudit(state, limit).filter((entry) => {
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
  );
}
