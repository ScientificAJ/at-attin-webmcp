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

export type ToolRegistrySnapshot =
  | { status: 'locked'; registeredCount: 0 }
  | { status: 'unavailable'; registeredCount: 0 }
  | { status: 'registering'; registeredCount: number }
  | { status: 'ready'; registeredCount: number }
  | { status: 'error'; registeredCount: 0; message: string };

function documentModelContext(): ModelContext | undefined {
  return typeof document === 'undefined' ? undefined : document.modelContext;
}

export class ToolRegistry {
  private readonly bridge: ToolBridge;
  private readonly getModelContext: () => ModelContext | undefined;
  private registrationController: AbortController | null = null;
  private state: ToolRegistryState = { signedIn: false, agentUnlocked: false };
  private disposed = false;
  private snapshot: ToolRegistrySnapshot = { status: 'locked', registeredCount: 0 };
  private readonly listeners = new Set<() => void>();

  constructor(options: ToolRegistryOptions) {
    this.bridge = options.bridge;
    this.getModelContext = options.getModelContext ?? documentModelContext;
  }

  getSnapshot = (): ToolRegistrySnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

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
      this.updateSnapshot({ status: 'locked', registeredCount: 0 });
      if (reason) this.bridge.cancel(reason);
      return;
    }

    this.state = next;
    if (this.registrationController && !this.registrationController.signal.aborted) return;
    const modelContext = this.getModelContext();
    if (!modelContext || typeof modelContext.registerTool !== 'function') {
      this.updateSnapshot({ status: 'unavailable', registeredCount: 0 });
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    this.registrationController = controller;
    this.updateSnapshot({ status: 'registering', registeredCount: 0 });
    const run = (
      toolName: string,
      args: Record<string, unknown>,
      signal: AbortSignal,
    ) => this.bridge.run(toolName, args, signal);
    try {
      let registeredCount = 0;
      for (const tool of createImperativeTools(run)) {
        if (signal.aborted) return;
        await modelContext.registerTool(tool, { signal });
        registeredCount += 1;
        this.updateSnapshot({ status: 'registering', registeredCount });
      }
      this.updateSnapshot({ status: 'ready', registeredCount });
    } catch (error) {
      if (!signal.aborted) {
        controller.abort();
        if (this.registrationController === controller) {
          this.registrationController = null;
        }
        this.updateSnapshot({
          status: 'error',
          registeredCount: 0,
          message: 'WebMCP registration failed. Retry Agent Access.',
        });
        throw error;
      }
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

  private updateSnapshot(snapshot: ToolRegistrySnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
}
