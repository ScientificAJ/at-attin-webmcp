import type {
  ModelContext,
  WebMCPTool,
} from '../webmcp/contracts';

export class ModelContextFake implements ModelContext {
  readonly registrations: Array<{
    tool: WebMCPTool;
    signal: AbortSignal;
  }> = [];

  readonly tools = new Map<string, WebMCPTool>();

  async registerTool(
    tool: WebMCPTool,
    options: { signal: AbortSignal },
  ): Promise<void> {
    if (options.signal.aborted) return;
    this.registrations.push({ tool, signal: options.signal });
    this.tools.set(tool.name, tool);
    options.signal.addEventListener('abort', () => {
      if (this.tools.get(tool.name) === tool) {
        this.tools.delete(tool.name);
      }
    }, { once: true });
  }

  execute(
    name: string,
    args: Record<string, unknown>,
    signal: AbortSignal = new AbortController().signal,
  ): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool ${name} is not registered`);
    return tool.execute(args, { signal });
  }
}
