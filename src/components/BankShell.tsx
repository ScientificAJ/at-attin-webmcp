import {
  CreditCard,
  Headset,
  LockKey,
  Target,
} from '@phosphor-icons/react';
import { useEffect, useSyncExternalStore } from 'react';
import { Link, Outlet } from 'react-router-dom';
import {
  useAppServices,
  useBankState,
} from '../app/routes';
import { AgentStatus } from './AgentStatus';
import { AgentConsole } from './AgentConsole';
import { ConfirmationDialog } from './ConfirmationDialog';
import { PrimaryNav } from './PrimaryNav';

const MORE_LINKS = [
  { label: 'Cards', to: '/accounts/cards', icon: CreditCard },
  { label: 'Plan', to: '/reports/plan', icon: Target },
  { label: 'Support', to: '/settings/support', icon: Headset },
  { label: 'Safety & Agent', to: '/settings/agent', icon: LockKey },
];

export function BankShell() {
  const {
    bankStore,
    confirmationCoordinator,
    embeddedAgent,
    session,
    toolRegistry,
    webMcpAvailable,
  } = useAppServices();
  const state = useBankState();
  const registrySnapshot = useSyncExternalStore(
    toolRegistry.subscribe,
    toolRegistry.getSnapshot,
    toolRegistry.getSnapshot,
  );
  const { accessibility, agentAccessUnlocked } = state.user.preferences;

  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute('data-large-text', accessibility.largeText);
    root.style.fontSize = accessibility.largeText ? '115%' : '';
    return () => {
      root.removeAttribute('data-large-text');
      root.style.removeProperty('font-size');
    };
  }, [accessibility.largeText]);

  useEffect(() => {
    void toolRegistry.sync({
      signedIn: session.isSignedIn(),
      agentUnlocked: agentAccessUnlocked,
    }).catch(() => undefined);
  }, [agentAccessUnlocked, session, toolRegistry]);

  const signOut = () => {
    void toolRegistry.sync({ signedIn: false, agentUnlocked: false }).catch(() => undefined);
    if (agentAccessUnlocked) {
      const version = bankStore.getState().stateVersion;
      bankStore.transact(version, `logout-agent-lock-${version}`, (draft) => {
        draft.user.preferences.agentAccessUnlocked = false;
        draft.audit.push({
          id: `audit-logout-agent-lock-${version}`,
          actor: 'user',
          eventType: 'agent_access_locked',
          target: 'agent-access',
          outcome: 'success',
          timestamp: new Date().toISOString(),
          safeDetail: 'Agent Access locked on logout.',
        });
      });
    }
    session.signOut();
  };

  return (
    <div
      className="bank-shell"
      data-high-contrast={accessibility.highContrast || undefined}
      data-large-text={accessibility.largeText || undefined}
      data-reduced-motion={accessibility.reducedMotion || undefined}
    >
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="bank-header">
        <Link className="wordmark" to="/" aria-label="At Attin home">At Attin</Link>
        <PrimaryNav />
        <AgentStatus
          available={webMcpAvailable}
          registryStatus={registrySnapshot.status}
          unlocked={agentAccessUnlocked}
        />
      </header>
      <div className="bank-status-bar" role="status">
        <span>Fictional funds · No cash value</span>
        <button className="text-button" type="button" onClick={signOut}>
          Sign out
        </button>
      </div>
      {state.recoveryNotice ? (
        <div className="recovery-notice" role="alert">
          {state.recoveryNotice}
        </div>
      ) : null}
      <main className="bank-main" id="main-content">
        <Outlet />
      </main>
      <footer className="bank-footer">
        <nav className="more-nav" aria-label="More banking sections">
          {MORE_LINKS.map(({ label, to, icon: MoreIcon }) => (
            <Link key={to} to={to}>
              <MoreIcon aria-hidden="true" weight="regular" />
              {label}
            </Link>
          ))}
        </nav>
        <p>ATC is fictional, device-local, and has no cash value.</p>
      </footer>
      <AgentConsole runtime={embeddedAgent} unlocked={agentAccessUnlocked} />
      <ConfirmationDialog coordinator={confirmationCoordinator} />
    </div>
  );
}
