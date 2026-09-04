import {
  ArrowRight,
  CreditCard,
  LockKey,
  ShieldCheck,
  Wallet,
  WarningCircle,
} from '@phosphor-icons/react';
import { useState, type MouseEvent } from 'react';
import {
  useAppServices,
  useBankState,
  useSignedIn,
} from '../app/routes';

interface AgentAccessControlProps {
  detailed?: boolean;
}

export function AgentAccessControl({ detailed = false }: AgentAccessControlProps) {
  const state = useBankState();
  const signedIn = useSignedIn();
  const { bankStore, toolRegistry, trustPredicate } = useAppServices();
  const unlocked = state.user.preferences.agentAccessUnlocked;
  const [message, setMessage] = useState('');

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (!trustPredicate(event.nativeEvent)) {
      setMessage('trusted-user-activation-required');
      return;
    }
    const next = !unlocked;
    const version = bankStore.getState().stateVersion;
    const result = bankStore.transact(version, `human-agent-access-${next ? 'unlock' : 'lock'}-${version}`, (draft) => {
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
    });
    if (!result.ok) {
      setMessage(`Agent Access was not changed: ${result.code}.`);
      return;
    }
    void toolRegistry.sync({ signedIn, agentUnlocked: next }).then(
      () => setMessage(next
        ? 'Agent Access unlocked. Every task still needs confirmation.'
        : 'Agent Access locked. All agent tool access is blocked.'),
      () => setMessage('Browser WebMCP registration failed. The in-site agent remains available.'),
    );
  };

  return (
    <section className="agent-access-control obsidian-surface" aria-labelledby="agent-control-title">
      <header>
        <p className="eyebrow">Human control</p>
        <h2 id="agent-control-title">Agent access</h2>
        <p>In-site agent and 56 browser WebMCP tools ready</p>
      </header>
      {detailed ? (
        <ul className="agent-capabilities">
          <li><Wallet aria-hidden="true" /><span>Read balances</span><strong>Confirmation required</strong></li>
          <li><ArrowRight aria-hidden="true" /><span>Prepare payments</span><strong>Confirmation required</strong></li>
          <li><CreditCard aria-hidden="true" /><span>Manage cards</span><strong>Confirmation required</strong></li>
          <li><WarningCircle aria-hidden="true" /><span>Open disputes</span><strong>Confirmation required</strong></li>
        </ul>
      ) : (
        <div className="agent-access-control__summary">
          <ShieldCheck aria-hidden="true" weight="regular" />
          <p>{unlocked
            ? 'The in-site agent and compatible browser agents may request tools. Every read and change still pauses for your approval.'
            : 'Tools are hidden from every agent. All manual banking remains available.'}</p>
        </div>
      )}
      <button className="signal-action" onClick={toggle} type="button">
        <LockKey aria-hidden="true" weight="regular" />
        <span>{unlocked ? 'Lock Agent Access' : 'Unlock Agent Access'}</span>
      </button>
      {message ? <p className="agent-access-control__status" role={message.includes('required') ? 'alert' : 'status'}>{message}</p> : null}
    </section>
  );
}
