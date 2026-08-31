import {
  fireEvent,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelContextFake } from '../test/model-context-fake';
import { renderAuthenticated } from '../test/render-app';

describe('complete At Attin product experience', () => {
  it('renders the editorial home overview from canonical fictional funds', () => {
    renderAuthenticated('/');

    expect(screen.getByRole('heading', { name: 'Good evening, John' })).toBeVisible();
    expect(screen.getByText('42,860 ATC')).toBeVisible();
    expect(screen.getByText('Fictional funds')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Recent activity' })).toBeVisible();
  });

  it('reviews and commits a protected payee payment through the shared operation preview', async () => {
    const user = userEvent.setup();
    const { store } = renderAuthenticated('/payments');

    await user.click(screen.getByRole('button', { name: /mara vale/i }));
    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '420');
    await user.clear(screen.getByLabelText('Protect balance above'));
    await user.type(screen.getByLabelText('Protect balance above'), '5000');
    await user.click(screen.getByRole('button', { name: 'Review payment' }));

    const review = screen.getByRole('region', { name: 'Payment review' });
    expect(within(review).getByText('Balance after: 8,020 ATC')).toBeVisible();
    expect(within(review).getByText('Balance floor: 5,000 ATC')).toBeVisible();
    await user.click(within(review).getByRole('button', { name: 'Yes, confirm' }));

    expect(await screen.findByText('Payment completed.')).toBeVisible();
    expect(store.getState().accounts.find(({ id }) => id === 'account-daily')).toMatchObject({
      balance: 802_000,
    });
    await user.click(within(review).getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('heading', { name: 'Pay Mara Vale' })).toBeVisible();
  });

  it('switches account detail and produces a statement result', async () => {
    const user = userEvent.setup();
    renderAuthenticated('/accounts');

    await user.click(screen.getByRole('button', { name: /vault/i }));
    const detail = screen.getByRole('region', { name: 'Selected account' });
    expect(within(detail).getByRole('heading', { name: 'Vault' })).toBeVisible();
    expect(within(detail).getByText('24,000 ATC')).toBeVisible();
    await user.click(within(detail).getByRole('button', { name: 'View statement' }));
    expect(await within(detail).findByText(/statement transactions/i)).toBeVisible();
  });

  it('prepares and confirms a card freeze from the cards destination', async () => {
    const user = userEvent.setup();
    const { store } = renderAuthenticated('/accounts/cards');

    await user.click(screen.getByRole('button', { name: 'Freeze card' }));
    const review = screen.getByRole('region', { name: 'Card action review' });
    expect(within(review).getByText('Card status: active → frozen')).toBeVisible();
    await user.click(within(review).getByRole('button', { name: 'Yes, confirm' }));
    expect(await screen.findByText('Card frozen.')).toBeVisible();
    expect(store.getState().cards.find(({ id }) => id === 'card-daily')?.status).toBe('frozen');
  });

  it.each([
    ['/activity', 'Activity'],
    ['/reports', 'Reports'],
    ['/reports/plan', 'Plan'],
    ['/settings/support', 'Support'],
    ['/settings', 'Settings'],
  ])('renders the complete %s destination', (path, heading) => {
    renderAuthenticated(path);
    expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
  });

  it('shows all four safeguards and exact WebMCP inventory in Safety & Agent', async () => {
    renderAuthenticated('/settings/agent', {
      webMcpAvailable: true,
      agentUnlocked: true,
      modelContext: new ModelContextFake(),
    });

    expect(screen.getByRole('heading', { name: 'You are in control.' })).toBeVisible();
    expect(screen.getByText('60 tools available')).toBeVisible();
    expect(screen.getByText('Every task requires confirmation')).toBeVisible();
    expect(screen.getByText('One action at a time')).toBeVisible();
    expect(screen.getByText('Permissions expire automatically')).toBeVisible();
    expect(screen.getByText('Every action is recorded')).toBeVisible();
  });

  it('keeps manual activity filtering usable while Agent Access is locked', async () => {
    renderAuthenticated('/activity');
    fireEvent.change(screen.getByLabelText('Search activity'), {
      target: { value: 'Orbit' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filter' }));
    expect(await screen.findByText('1 matching transaction.')).toBeVisible();
  });
});
