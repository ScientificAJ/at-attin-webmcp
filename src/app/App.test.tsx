import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import {
  renderAuthenticated,
  renderRouter,
} from '../test/render-app';

describe('At Attin application shell', () => {
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
