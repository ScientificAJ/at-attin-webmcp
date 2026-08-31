import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { approveTrusted, promiseSettled } from '../test/confirmation-harness';
import { createWebMcpTestHarness } from '../test/webmcp-harness';
import { DeclarativeToolForm } from './DeclarativeToolForm';

const fields = [
  {
    name: 'query',
    label: 'Search activity',
    description: 'Merchant, memo, or category text.',
    type: 'text' as const,
    maxLength: 120,
  },
  {
    name: 'status',
    label: 'Status',
    description: 'Optional transaction posting status.',
    type: 'select' as const,
    options: [
      { value: '', label: 'Any status' },
      { value: 'posted', label: 'Posted' },
      { value: 'pending', label: 'Pending' },
    ],
  },
] as const;

describe('DeclarativeToolForm', () => {
  it('stays visible and manually usable while locked without exposing annotations', async () => {
    const user = userEvent.setup();
    const onManualSubmit = vi.fn().mockResolvedValue('1 matching transaction');
    const { bridge, coordinator } = createWebMcpTestHarness();
    render(
      <DeclarativeToolForm
        bridge={bridge}
        description="Filter transaction history with explicit fields."
        fields={fields}
        onManualSubmit={onManualSubmit}
        title="Filter activity"
        toolName="filter_transactions_form"
        unlocked={false}
      />,
    );

    const form = screen.getByRole('form', { name: 'Filter activity' });
    expect(form).not.toHaveAttribute('toolname');
    expect(form).not.toHaveAttribute('tooldescription');
    expect(form).not.toHaveAttribute('toolautosubmit');
    expect(screen.getByLabelText('Search activity')).not.toHaveAttribute('toolparamdescription');

    await user.type(screen.getByLabelText('Search activity'), 'Orbit');
    await user.click(screen.getByRole('button', { name: 'Apply filter' }));

    expect(onManualSubmit).toHaveBeenCalledWith({ query: 'Orbit' });
    expect(await screen.findByText('1 matching transaction')).toBeVisible();
    expect(coordinator.getSnapshot().status).toBe('idle');
  });

  it('adds only the approved lowercase declarative attributes while unlocked', () => {
    const { bridge } = createWebMcpTestHarness();
    render(
      <DeclarativeToolForm
        bridge={bridge}
        description="Filter transaction history with explicit fields."
        fields={fields}
        onManualSubmit={() => 'Manual result'}
        title="Filter activity"
        toolName="filter_transactions_form"
        unlocked
      />,
    );

    const form = screen.getByRole('form', { name: 'Filter activity' });
    expect(form).toHaveAttribute('toolname', 'filter_transactions_form');
    expect(form).toHaveAttribute(
      'tooldescription',
      'Filter transaction history with explicit fields.',
    );
    expect(form).not.toHaveAttribute('toolautosubmit');
    expect(screen.getByLabelText('Search activity')).toHaveAttribute(
      'toolparamdescription',
      'Merchant, memo, or category text.',
    );
  });

  it('intercepts agent submission and gives respondWith the confirmation-gated read promise', async () => {
    const { bridge, coordinator } = createWebMcpTestHarness();
    render(
      <DeclarativeToolForm
        bridge={bridge}
        description="Filter transaction history with explicit fields."
        fields={fields}
        onManualSubmit={() => 'Manual result'}
        title="Filter activity"
        toolName="filter_transactions_form"
        unlocked
      />,
    );
    const form = screen.getByRole('form', { name: 'Filter activity' });
    fireEvent.change(screen.getByLabelText('Search activity'), {
      target: { value: 'Orbit' },
    });
    const respondWith = vi.fn();
    const submit = new Event('submit', { bubbles: true, cancelable: true }) as SubmitEvent;
    Object.defineProperties(submit, {
      agentInvoked: { value: true },
      respondWith: { value: respondWith },
    });

    fireEvent(form, submit);

    expect(submit.defaultPrevented).toBe(true);
    expect(respondWith).toHaveBeenCalledOnce();
    const response = respondWith.mock.calls[0][0] as Promise<string>;
    expect(await promiseSettled(response)).toBe(false);
    expect(coordinator.getSnapshot()).toMatchObject({
      status: 'pending',
      toolName: 'filter_transactions_form',
      readOnly: true,
    });
    approveTrusted(coordinator);
    await expect(response).resolves.toContain('"status":"completed"');
    expect(await screen.findByRole('status')).toHaveTextContent('Agent tool completed');
  });

  it('announces native activation and cancellation and propagates toolcancel', async () => {
    const { bridge, coordinator } = createWebMcpTestHarness();
    render(
      <DeclarativeToolForm
        bridge={bridge}
        description="Filter transaction history with explicit fields."
        fields={fields}
        onManualSubmit={() => 'Manual result'}
        title="Filter activity"
        toolName="filter_transactions_form"
        unlocked
      />,
    );
    const form = screen.getByRole('form', { name: 'Filter activity' });
    const respondWith = vi.fn();
    const submit = new Event('submit', { bubbles: true, cancelable: true }) as SubmitEvent;
    Object.defineProperties(submit, {
      agentInvoked: { value: true },
      respondWith: { value: respondWith },
    });
    fireEvent(form, submit);
    const response = respondWith.mock.calls[0][0] as Promise<string>;

    fireEvent(form, new Event('toolactivated'));
    expect(screen.getByRole('status')).toHaveTextContent('Agent tool activated');
    fireEvent(form, new Event('toolcancel'));
    await act(async () => {
      await expect(response).rejects.toThrow('confirmation-tool-cancel');
    });
    expect(screen.getByRole('status')).toHaveTextContent('Agent tool cancelled');
    expect(coordinator.getSnapshot().status).toBe('idle');
  });
});
