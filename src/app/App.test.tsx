import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { atc } from '../domain/money';
import { prepareOperation } from '../domain/operations/types';
import { createBankStore } from '../domain/store';
import {
  BANK_BACKUP_KEY,
  BANK_STORAGE_KEY,
} from '../domain/storage';
import { memoryStorage } from '../test/memory-storage';
import {
  renderAuthenticated,
  renderRouter,
} from '../test/render-app';

describe('At Attin application shell', () => {
  it('defers banking persistence until the first successful sign-in', async () => {
    const user = userEvent.setup();
    window.localStorage.clear();
    render(<App />);

    expect(window.localStorage.getItem(BANK_STORAGE_KEY)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: /good evening, john/i })).toBeVisible();
    expect(window.localStorage.getItem(BANK_STORAGE_KEY)).not.toBeNull();
  });

  it('opens on the protected fictional-bank login experience', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: /banking, made direct/i })).toBeVisible();
    expect(screen.getByText('john.attin / attin2026')).toBeVisible();
    expect(screen.getByText(/prototype-only demo credentials/i)).toBeVisible();
    expect(screen.getByText(/ATC is fictional and has no cash value/i)).toBeVisible();
  });

  it('redirects every signed-out banking route to login', async () => {
    const view = renderRouter('/payments', { signedIn: false });

    expect(await screen.findByRole('heading', { name: /banking, made direct/i })).toBeVisible();
    expect(view.session.isSignedIn()).toBe(false);
  });

  it('signs in only through the published form credentials', async () => {
    const user = userEvent.setup();
    const { session } = renderRouter('/login');

    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use the demo credentials shown below.');
    expect(session.isSignedIn()).toBe(false);

    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'attin2026');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: /good evening, john/i })).toBeVisible();
    expect(session.isSignedIn()).toBe(true);
  });

  it.each([
    ['/', 'Good evening, John'],
    ['/accounts', 'Your accounts'],
    ['/accounts/cards', 'Cards'],
    ['/payments', 'Payments'],
    ['/activity', 'Activity'],
    ['/reports', 'Reports'],
    ['/reports/plan', 'Plan'],
    ['/settings', 'Settings'],
    ['/settings/support', 'Support'],
    ['/settings/agent', 'Safety & Agent'],
  ])('renders protected route %s with heading %s', (path, heading) => {
    const view = renderAuthenticated(path);

    expect(screen.getByRole('heading', { name: heading })).toBeVisible();
    view.unmount();
  });

  it('provides the six primary destinations plus truthful nested navigation', () => {
    renderAuthenticated('/');

    const primary = screen.getByRole('navigation', { name: 'Primary' });
    expect(primary).toHaveTextContent('Home');
    expect(primary).toHaveTextContent('Accounts');
    expect(primary).toHaveTextContent('Payments');
    expect(primary).toHaveTextContent('Activity');
    expect(primary).toHaveTextContent('Reports');
    expect(primary).toHaveTextContent('Settings');
    const more = screen.getByRole('navigation', { name: 'More banking sections' });
    expect(more).toHaveTextContent('Cards');
    expect(more).toHaveTextContent('Plan');
    expect(more).toHaveTextContent('Support');
    expect(more).toHaveTextContent('Safety & Agent');
  });

  it('activates real route links from the keyboard', async () => {
    const user = userEvent.setup();
    renderAuthenticated('/');
    const payments = screen.getByRole('link', { name: 'Payments' });

    payments.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Payments' })).toBeVisible();
  });

  it('offers a keyboard-first skip link to protected main content', async () => {
    const user = userEvent.setup();
    renderAuthenticated('/');

    await user.tab();
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('scales root-relative typography when large text is enabled', () => {
    const store = createBankStore(memoryStorage(), () => new Date('2026-08-31T09:00:00Z'));
    expect(prepareOperation(store, 'set_accessibility_mode', {
      mode: 'largeText',
      enabled: true,
    }, () => new Date('2026-08-31T09:00:00Z')).commit()).toMatchObject({ ok: true });

    const view = renderAuthenticated('/', { store });
    expect(document.documentElement).toHaveAttribute('data-large-text');
    expect(getComputedStyle(document.documentElement).fontSize).toBe('18.4px');
    view.unmount();
    expect(document.documentElement).not.toHaveAttribute('data-large-text');
  });

  it('visibly surfaces local persistence recovery', () => {
    const malformed = JSON.stringify({ schemaVersion: 1, stateVersion: 0 });
    const storage = memoryStorage({ [BANK_STORAGE_KEY]: malformed });
    const store = createBankStore(storage, () => new Date('2026-08-31T09:00:00Z'));

    renderAuthenticated('/', { store });
    expect(screen.getByRole('alert')).toHaveTextContent(/saved demo was backed up and reset/i);
    expect(storage.getItem(BANK_BACKUP_KEY)).toBe(malformed);
    expect(screen.getByText(`${new Intl.NumberFormat('en-US').format(atc(42860) / 100)} ATC`)).toBeVisible();
  });

  it('provides an accessible compact More disclosure for lower-frequency routes', () => {
    renderAuthenticated('/');
    const summary = screen.getByText('More').closest('summary');
    const disclosure = summary?.closest('details');

    expect(disclosure).not.toHaveAttribute('open');
    fireEvent.click(summary!);
    expect(disclosure).toHaveAttribute('open');
    expect(within(disclosure!).getByRole('link', { name: 'Reports', hidden: true })).toHaveAttribute(
      'href',
      '/reports',
    );
    expect(within(disclosure!).getByRole('link', {
      name: 'Safety & Agent',
      hidden: true,
    })).toHaveAttribute(
      'href',
      '/settings/agent',
    );
  });

  it('shows fictional-funds and all shell-level WebMCP availability states', () => {
    const unavailable = renderAuthenticated('/');
    expect(screen.getByText('Fictional funds · No cash value')).toBeVisible();
    expect(screen.getByText('WebMCP unavailable')).toBeVisible();
    unavailable.unmount();

    const locked = renderAuthenticated('/', { webMcpAvailable: true });
    expect(screen.getByText('Agent access locked')).toBeVisible();
    locked.unmount();

    renderAuthenticated('/', { webMcpAvailable: true, agentUnlocked: true });
    expect(screen.getByText('WebMCP connected')).toBeVisible();
  });

  it('signs out in memory and returns protected content to login', async () => {
    const user = userEvent.setup();
    const { session } = renderAuthenticated('/settings');

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: /banking, made direct/i })).toBeVisible();
    expect(session.isSignedIn()).toBe(false);
  });
});
