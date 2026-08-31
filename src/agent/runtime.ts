import type { ToolBridge } from '../webmcp/bridge';
import { createImperativeTools } from '../webmcp/catalog';
import type { JSONSchema, WebMCPTool } from '../webmcp/contracts';

const MAX_AGENT_STEPS = 4;
const MAX_USER_TEXT = 1_500;

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface AgentToolSummary {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

interface CompletedAgentStep {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result: string;
}

type AgentServiceResponse =
  | {
    kind: 'message';
    text: string;
    model: string;
  }
  | {
    kind: 'tool_call';
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    model: string;
  };

export type AgentStage = 'thinking' | 'confirmation' | 'finishing';

export interface AgentTurnResult {
  reply: string;
  model: string;
  usedTools: number;
}

export interface EmbeddedAgentRuntimeOptions {
  endpoint?: string;
  fetcher?: Fetcher;
}

export class EmbeddedAgentRuntime {
  private readonly endpoint: string;
  private readonly fetcher: Fetcher;
  private readonly tools: WebMCPTool[];
  private readonly toolsByName: Map<string, WebMCPTool>;
  private readonly toolSummaries: AgentToolSummary[];

  constructor(
    bridge: ToolBridge,
    options: EmbeddedAgentRuntimeOptions = {},
  ) {
    this.endpoint = options.endpoint ?? '/api/agent';
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.tools = createImperativeTools((name, args, signal) => bridge.run(name, args, signal));
    this.toolsByName = new Map(this.tools.map((tool) => [tool.name, tool]));
    this.toolSummaries = this.tools.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    }));
  }

  async runTurn(
    rawUserText: string,
    signal: AbortSignal,
    onStage: (stage: AgentStage, toolName?: string) => void = () => undefined,
  ): Promise<AgentTurnResult> {
    const userText = rawUserText.trim();
    if (!userText || userText.length > MAX_USER_TEXT) {
      throw new Error('agent-request-must-be-1-to-1500-characters');
    }

    const steps: CompletedAgentStep[] = [];
    let model = '';
    for (let index = 0; index <= MAX_AGENT_STEPS; index += 1) {
      if (signal.aborted) throw new DOMException('Agent request aborted', 'AbortError');
      onStage(steps.length > 0 ? 'finishing' : 'thinking');
      const next = await this.requestNext(userText, steps, signal);
      model = next.model;
      if (next.kind === 'message') {
        return { reply: next.text, model, usedTools: steps.length };
      }
      if (steps.length >= MAX_AGENT_STEPS) {
        return {
          reply: 'I stopped after four individually confirmed actions. Start a new request for anything remaining.',
          model,
          usedTools: steps.length,
        };
      }

      const tool = this.toolsByName.get(next.name);
      if (!tool) throw new Error('agent-selected-unsupported-tool');
      onStage('confirmation', next.name);
      const result = await tool.execute(next.arguments, { signal });
      steps.push({
        id: next.id,
        toolName: next.name,
        arguments: next.arguments,
        result,
      });
    }

    throw new Error('agent-step-limit-reached');
  }

  private async requestNext(
    userText: string,
    steps: CompletedAgentStep[],
    signal: AbortSignal,
  ): Promise<AgentServiceResponse> {
    const response = await this.fetcher(this.endpoint, {
      body: JSON.stringify({ userText, steps, tools: this.toolSummaries }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal,
    });
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok || !payload) {
      const code = typeof payload?.error === 'string' ? payload.error : `http-${response.status}`;
      throw new Error(`agent-service-${code}`);
    }
    if (payload.kind === 'message'
      && typeof payload.text === 'string'
      && payload.text.trim()
      && typeof payload.model === 'string') {
      return {
        kind: 'message',
        text: payload.text.trim(),
        model: payload.model,
      };
    }
    if (payload.kind === 'tool_call'
      && typeof payload.id === 'string'
      && typeof payload.name === 'string'
      && payload.arguments !== null
      && typeof payload.arguments === 'object'
      && !Array.isArray(payload.arguments)
      && typeof payload.model === 'string') {
      return {
        kind: 'tool_call',
        id: payload.id,
        name: payload.name,
        arguments: payload.arguments as Record<string, unknown>,
        model: payload.model,
      };
    }
    throw new Error('agent-service-invalid-response');
  }
}
