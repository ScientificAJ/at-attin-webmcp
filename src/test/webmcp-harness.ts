import { createBankStore, type BankStore } from '../domain/store';
import { ToolBridge } from '../webmcp/bridge';
import { ConfirmationCoordinator } from '../webmcp/confirmation';
import type { TrustPredicate } from '../webmcp/contracts';
import { memoryStorage } from './memory-storage';

export const WEBMCP_TEST_CLOCK = () => new Date('2026-08-31T09:00:00.000Z');

export interface WebMcpTestHarness {
  store: BankStore;
  coordinator: ConfirmationCoordinator;
  bridge: ToolBridge;
}

export function createWebMcpTestHarness(options: {
  trustPredicate?: TrustPredicate;
} = {}): WebMcpTestHarness {
  const store = createBankStore(memoryStorage(), WEBMCP_TEST_CLOCK);
  const coordinator = new ConfirmationCoordinator({
    clock: WEBMCP_TEST_CLOCK,
    trustPredicate: options.trustPredicate ?? ((event) => event.isTrusted),
  });
  const bridge = new ToolBridge(store, coordinator, { clock: WEBMCP_TEST_CLOCK });
  return { store, coordinator, bridge };
}
