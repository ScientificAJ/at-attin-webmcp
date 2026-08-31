import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createWebMcpTestHarness } from '../test/webmcp-harness';
import { ConfirmationDialog } from './ConfirmationDialog';

describe('ConfirmationDialog', () => {
  it('focuses an app-owned disclosure dialog and approves only from its visible control', async () => {
    const user = userEvent.setup();
    const { bridge, coordinator } = createWebMcpTestHarness({
      trustPredicate: () => true,
    });
    const pending = bridge.run('get_overview', {}, new AbortController().signal);
    render(<ConfirmationDialog coordinator={coordinator} />);

    const dialog = screen.getByRole('dialog', { name: 'Share account overview' });
    expect(dialog).toBeVisible();
    expect(screen.getByText('Your account names and balances')).toBeVisible();
    const confirm = screen.getByRole('button', { name: 'Yes, confirm' });
    expect(screen.getByRole('button', { name: 'No, cancel' })).toBeVisible();
    await waitFor(() => expect(confirm).toHaveFocus());

    await user.click(confirm);
    await expect(pending).resolves.toContain('"status":"completed"');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('requires exact uppercase YES in the visible dialog for critical operations', async () => {
    const user = userEvent.setup();
    const { bridge, coordinator } = createWebMcpTestHarness({
      trustPredicate: () => true,
    });
    const pending = bridge.run('secure_suspicious_charge', {
      transactionId: 'transaction-suspicious',
      reason: 'card-not-present',
    }, new AbortController().signal);
    render(<ConfirmationDialog coordinator={coordinator} />);

    expect(screen.getByText('Type YES to confirm this critical action.')).toBeVisible();
    const typed = screen.getByLabelText('Type YES to confirm');
    const confirm = screen.getByRole('button', { name: 'Yes, confirm' });
    expect(confirm).toBeDisabled();
    await user.type(typed, 'yes');
    expect(confirm).toBeDisabled();
    await user.clear(typed);
    await user.type(typed, 'YES');
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    await expect(pending).resolves.toContain('"status":"completed"');
  });

  it('surfaces rejected activation and keeps cancellation keyboard accessible', async () => {
    const user = userEvent.setup();
    const { bridge, coordinator } = createWebMcpTestHarness({
      trustPredicate: () => false,
    });
    const pending = bridge.run('get_overview', {}, new AbortController().signal);
    render(<ConfirmationDialog coordinator={coordinator} />);

    await user.click(screen.getByRole('button', { name: 'Yes, confirm' }));
    expect(screen.getByRole('alert')).toHaveTextContent('trusted-user-activation-required');
    expect(coordinator.getSnapshot().status).toBe('pending');

    const cancel = screen.getByRole('button', { name: 'No, cancel' });
    cancel.focus();
    const cancelled = expect(pending).rejects.toThrow('confirmation-user-cancelled');
    await user.keyboard('{Enter}');
    await cancelled;
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('traps focus inside the open confirmation and restores the opener on close', async () => {
    const user = userEvent.setup();
    const { bridge, coordinator } = createWebMcpTestHarness({
      trustPredicate: () => true,
    });
    const view = render(
      <>
        <button type="button">Agent request opener</button>
        <ConfirmationDialog coordinator={coordinator} />
      </>,
    );
    const opener = screen.getByRole('button', { name: 'Agent request opener' });
    opener.focus();
    let pending!: Promise<string>;
    act(() => {
      pending = bridge.run('get_overview', {}, new AbortController().signal);
    });
    const cancelled = pending.catch((error: unknown) => error);

    const dialog = screen.getByRole('dialog');
    const confirm = screen.getByRole('button', { name: 'Yes, confirm' });
    const cancel = screen.getByRole('button', { name: 'No, cancel' });
    await waitFor(() => expect(confirm).toHaveFocus());
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(cancel).toHaveFocus();

    await user.click(cancel);
    expect(await cancelled).toMatchObject({ message: 'confirmation-user-cancelled' });
    expect(opener).toHaveFocus();
    view.unmount();
  });

  it('announces an expired confirmation without disclosing or changing anything', async () => {
    vi.useFakeTimers();
    try {
      const { bridge, coordinator } = createWebMcpTestHarness();
      const pending = bridge.run('get_overview', {}, new AbortController().signal);
      const expired = pending.catch((error: unknown) => error);
      render(<ConfirmationDialog coordinator={coordinator} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(90_000);
      });
      expect(await expired).toMatchObject({ message: 'confirmation-expired' });
      expect(screen.getByRole('status')).toHaveTextContent(
        'Confirmation expired without sharing or changing anything.',
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
