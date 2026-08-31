import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AgentTurnResult, EmbeddedAgentRuntime } from '../agent/runtime';
import { AgentConsole } from './AgentConsole';

function renderConsole(options: {
  unlocked: boolean;
  runTurn?: () => Promise<AgentTurnResult>;
}) {
  const runtime = {
    runTurn: vi.fn(options.runTurn ?? (async () => ({
      reply: 'Your confirmed overview is ready.',
      model: 'moonshotai/Kimi-K3',
      usedTools: 1,
    }))),
  } as unknown as EmbeddedAgentRuntime;
  return {
    runtime,
    ...render(
      <MemoryRouter>
        <AgentConsole runtime={runtime} unlocked={options.unlocked} />
      </MemoryRouter>,
    ),
  };
}

describe('At Attin agent console', () => {
  it('keeps the prompt disabled until a human unlocks Agent Access', async () => {
    const user = userEvent.setup();
    renderConsole({ unlocked: false });

    await user.click(screen.getByRole('button', { name: 'Open At Attin agent' }));

    expect(screen.getByRole('heading', { name: 'Ask At Attin' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Banking request' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Unlock Agent Access' })).toHaveAttribute(
      'href',
      '/settings/agent',
    );
    expect(screen.getByText(/featherless provides the reasoning/i)).toBeVisible();
  });

  it('sends natural language to the real agent runtime and renders its reply', async () => {
    const user = userEvent.setup();
    const { runtime } = renderConsole({ unlocked: true });
    await user.click(screen.getByRole('button', { name: 'Open At Attin agent' }));

    const prompt = screen.getByRole('textbox', { name: 'Banking request' });
    await user.type(prompt, 'Show my account overview');
    await user.click(screen.getByRole('button', { name: 'Send to At Attin' }));

    expect(await screen.findByText('Your confirmed overview is ready.')).toBeVisible();
    expect(screen.getByText('Show my account overview')).toBeVisible();
    expect(runtime.runTurn).toHaveBeenCalledTimes(1);
  });

  it('makes model and fictional-money boundaries visible without cluttering the transcript', async () => {
    const user = userEvent.setup();
    renderConsole({ unlocked: true });
    await user.click(screen.getByRole('button', { name: 'Open At Attin agent' }));

    expect(screen.getByText('Powered by Featherless · Kimi K3')).toBeVisible();
    expect(screen.getByText('Every read and change pauses for your confirmation.')).toBeVisible();
    expect(screen.getByText('Fictional ATC only')).toBeVisible();
  });
});
