import { createImperativeTools } from './catalog';
import type {
  ConfirmationCancelReason,
  ModelContext,
} from './contracts';
import type { ToolBridge } from './bridge';

export interface ToolRegistryState {
  signedIn: boolean;
  agentUnlocked: boolean;
}

export interface ToolRegistryOptions {
  bridge: ToolBridge;
  getModelContext?: () => ModelContext | undefined;
}

function documentModelContext(): ModelContext | undefined {
  return typeof document === 'undefined' ? undefined : document.modelContext;
}

export class ToolRegistry {
  private readonly bridge: ToolBridge;
  private readonly getModelContext: () => ModelContext | undefined;
  private registrationController: AbortController | null = null;
  private state: ToolRegistryState = { signedIn: false, agentUnlocked: false };
  private disposed = false;

  constructor(options: ToolRegistryOptions) {
    this.bridge = options.bridge;
    this.getModelContext = options.getModelContext ?? documentModelContext;
  }

  async sync(next: ToolRegistryState): Promise<void> {
    this.disposed = false;
    if (!next.signedIn || !next.agentUnlocked) {
      const reason: ConfirmationCancelReason | null = this.state.signedIn && !next.signedIn
        ? 'logout'
        : this.state.agentUnlocked && !next.agentUnlocked
          ? 'lock'
          : null;
      this.abortRegistration();
      this.state = next;
      if (reason) this.bridge.cancel(reason);
      return;
    }

    this.state = next;
    if (this.registrationController && !this.registrationController.signal.aborted) return;
    const modelContext = this.getModelContext();
    if (!modelContext) return;

    const controller = new AbortController();
    const { signal } = controller;
    this.registrationController = controller;
    const run = (
      toolName: string,
      args: Record<string, unknown>,
      signal: AbortSignal,
    ) => this.bridge.run(toolName, args, signal);
    try {
      for (const tool of createImperativeTools(run)) {
        if (signal.aborted) return;
        await modelContext.registerTool(tool, { signal });
      }
    } catch (error) {
      if (!signal.aborted) throw error;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.abortRegistration();
    this.bridge.cancel('teardown');
  }

  private abortRegistration(): void {
    this.registrationController?.abort();
    this.registrationController = null;
  }
}
