import type { ModelContext } from './contracts';

declare global {
  interface Document {
    modelContext?: ModelContext;
  }

  interface SubmitEvent {
    agentInvoked?: boolean;
    respondWith?(response: Promise<unknown>): void;
    signal?: AbortSignal;
  }
}

export {};
