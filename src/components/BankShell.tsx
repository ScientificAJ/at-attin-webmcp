import {
  CreditCard,
  Headset,
  LockKey,
  Target,
} from '@phosphor-icons/react';
import { Link, Outlet } from 'react-router-dom';
import {
  useAppServices,
  useBankState,
} from '../app/routes';
import { AgentStatus } from './AgentStatus';
import { PrimaryNav } from './PrimaryNav';

const MORE_LINKS = [
  { label: 'Cards', to: '/accounts/cards', icon: CreditCard },
  { label: 'Plan', to: '/reports/plan', icon: Target },
  { label: 'Support', to: '/settings/support', icon: Headset },
  { label: 'Safety & Agent', to: '/settings/agent', icon: LockKey },
];

export function BankShell() {
  const { session, webMcpAvailable } = useAppServices();
  const state = useBankState();
  const { accessibility, agentAccessUnlocked } = state.user.preferences;

  return (
    <div
      className="bank-shell"
      data-high-contrast={accessibility.highContrast || undefined}
      data-large-text={accessibility.largeText || undefined}
      data-reduced-motion={accessibility.reducedMotion || undefined}
    >
      <header className="bank-header">
        <Link className="wordmark" to="/" aria-label="At Attin home">At Attin</Link>
        <PrimaryNav />
        <AgentStatus available={webMcpAvailable} unlocked={agentAccessUnlocked} />
      </header>
      <div className="bank-status-bar" role="status">
        <span>Fictional funds · No cash value</span>
        <button className="text-button" type="button" onClick={() => session.signOut()}>
          Sign out
        </button>
      </div>
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
    </div>
  );
}
