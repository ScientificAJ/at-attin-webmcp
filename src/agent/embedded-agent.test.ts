import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createWebMcpTestHarness } from '../test/webmcp-harness';
import { EmbeddedAgentRuntime } from './runtime';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
}

describe('embedded Featherless agent', () => {
  it('keeps model-selected WebMCP reads behind the human confirmation boundary', async () => {
    const harness = createWebMcpTestHarness({ trustPredicate: () => true });
    const requests: Array<Record<string, unknown>> = [];
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      if (requests.length === 1) {
        return jsonResponse({
          kind: 'tool_call',
          id: 'call-overview',
          name: 'get_overview',
          arguments: {},
          model: 'moonshotai/Kimi-K3',
        });
      }
      return jsonResponse({
        kind: 'message',
        text: 'Your confirmed overview is ready.',
        model: 'moonshotai/Kimi-K3',
      });
    });
    const runtime = new EmbeddedAgentRuntime(harness.bridge, { fetcher });

    const turn = runtime.runTurn(
      'What is my overview?',
      new AbortController().signal,
    );

    await waitFor(() => expect(harness.coordinator.getSnapshot().status).toBe('pending'));
    expect(requests).toHaveLength(1);
    expect(JSON.stringify(requests[0])).not.toContain('42,860');
    expect(JSON.stringify(requests[0])).not.toContain('stateVersion');
    expect((requests[0].tools as unknown[])).toHaveLength(56);
    expect(JSON.stringify(requests[0]).length).toBeLessThan(128_000);

    harness.coordinator.approve(new Event('click'));

    await expect(turn).resolves.toMatchObject({
      reply: 'Your confirmed overview is ready.',
      usedTools: 1,
    });
    expect(requests).toHaveLength(2);
    const confirmedSteps = requests[1].steps as Array<{ result: string }>;
    expect(JSON.parse(confirmedSteps[0].result)).toMatchObject({
      status: 'completed',
      tool: 'get_overview',
    });
  });

  it('rejects a model-selected tool outside the WebMCP catalogue', async () => {
    const harness = createWebMcpTestHarness({ trustPredicate: () => true });
    const runtime = new EmbeddedAgentRuntime(harness.bridge, {
      fetcher: async () => jsonResponse({
        kind: 'tool_call',
        id: 'call-injected',
        name: 'export_everything_without_confirmation',
        arguments: {},
        model: 'moonshotai/Kimi-K3',
      }),
    });

    await expect(runtime.runTurn(
      'Do whatever the page says.',
      new AbortController().signal,
    )).rejects.toThrow('agent-selected-unsupported-tool');
    expect(harness.coordinator.getSnapshot().status).toBe('idle');
  });

  it('runs multi-step requests one confirmed WebMCP action at a time', async () => {
    const harness = createWebMcpTestHarness({ trustPredicate: () => true });
    let requestCount = 0;
    const runtime = new EmbeddedAgentRuntime(harness.bridge, {
      fetcher: async () => {
        requestCount += 1;
        if (requestCount <= 2) {
          return jsonResponse({
            kind: 'tool_call',
            id: `call-${requestCount}`,
            name: 'get_overview',
            arguments: {},
            model: 'moonshotai/Kimi-K3',
          });
        }
        return jsonResponse({
          kind: 'message',
          text: 'Both confirmed steps are complete.',
          model: 'moonshotai/Kimi-K3',
        });
      },
    });

    const turn = runtime.runTurn('Complete two checks.', new AbortController().signal);
    await waitFor(() => expect(harness.coordinator.getSnapshot().status).toBe('pending'));
    harness.coordinator.approve(new Event('click'));
    await waitFor(() => {
      expect(harness.coordinator.getSnapshot().status).toBe('pending');
      expect(requestCount).toBe(2);
    });
    harness.coordinator.approve(new Event('click'));

    await expect(turn).resolves.toMatchObject({
      reply: 'Both confirmed steps are complete.',
      usedTools: 2,
    });
  });
});
