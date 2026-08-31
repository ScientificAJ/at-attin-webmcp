import {
  ArrowsLeftRight,
  ChartLineUp,
  CreditCard,
  DotsThree,
  GearSix,
  Headset,
  House,
  ListBullets,
  LockKey,
  Target,
  Wallet,
  type Icon,
} from '@phosphor-icons/react';
import { NavLink } from 'react-router-dom';

interface Destination {
  label: string;
  to: string;
  icon: Icon;
}

const DESTINATIONS: Destination[] = [
  { label: 'Home', to: '/', icon: House },
  { label: 'Accounts', to: '/accounts', icon: Wallet },
  { label: 'Payments', to: '/payments', icon: ArrowsLeftRight },
  { label: 'Activity', to: '/activity', icon: ListBullets },
  { label: 'Reports', to: '/reports', icon: ChartLineUp },
  { label: 'Settings', to: '/settings', icon: GearSix },
];

const MORE_DESTINATIONS: Destination[] = [
  { label: 'Reports', to: '/reports', icon: ChartLineUp },
  { label: 'Settings', to: '/settings', icon: GearSix },
  { label: 'Cards', to: '/accounts/cards', icon: CreditCard },
  { label: 'Plan', to: '/reports/plan', icon: Target },
  { label: 'Support', to: '/settings/support', icon: Headset },
  { label: 'Safety & Agent', to: '/settings/agent', icon: LockKey },
];

export function PrimaryNav() {
  return (
    <nav className="primary-nav" aria-label="Primary">
      {DESTINATIONS.map(({ label, to, icon: DestinationIcon }) => (
        <NavLink
          className={({ isActive }) => `primary-nav__link${isActive ? ' is-active' : ''}`}
          end={to === '/'}
          key={to}
          to={to}
        >
          <DestinationIcon aria-hidden="true" weight="regular" />
          <span>{label}</span>
        </NavLink>
      ))}
      <details className="primary-nav__more">
        <summary>
          <DotsThree aria-hidden="true" weight="bold" />
          <span>More</span>
        </summary>
        <div className="primary-nav__more-sheet">
          <strong>More banking destinations</strong>
          {MORE_DESTINATIONS.map(({ label, to, icon: MoreIcon }) => (
            <NavLink
              key={to}
              onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}
              to={to}
            >
              <MoreIcon aria-hidden="true" weight="regular" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </details>
    </nav>
  );
}
