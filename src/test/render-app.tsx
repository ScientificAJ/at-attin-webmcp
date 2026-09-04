import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createSessionStore, type SessionStore } from '../auth/session';
import { EmbeddedAgentRuntime } from '../agent/runtime';
import { AppRouteTree, type AppServices } from '../app/routes';
import { createBankStore, type BankStore } from '../domain/store';
import { ToolBridge } from '../webmcp/bridge';
import { createAgentAuditJournal } from '../webmcp/audit';
import {
  ConfirmationCoordinator,
  hasTrustedUserActivation,
} from '../webmcp/confirmation';
import type {
  ModelContext,
  TrustPredicate,
} from '../webmcp/contracts';
import { ToolRegistry } from '../webmcp/registry';
import { memoryStorage } from './memory-storage';

const fixedClock = () => new Date('2026-08-31T09:00:00Z');

export interface RenderRouterOptions {
  signedIn?: boolean;
  webMcpAvailable?: boolean;
  agentUnlocked?: boolean;
  session?: SessionStore;
  store?: BankStore;
  modelContext?: ModelContext;
  trustPredicate?: TrustPredicate;
}

export interface RenderAppResult extends RenderResult {
  session: SessionStore;
  store: BankStore;
  services: AppServices;
}

export function renderRouter(
  path: string,
  options: RenderRouterOptions = {},
): RenderAppResult {
  const session = options.session ?? createSessionStore();
  const store = options.store ?? createBankStore(memoryStorage(), fixedClock);
  if (options.signedIn) {
    session.signIn('john.attin', 'attin2026');
  }
  if (options.agentUnlocked && !store.getState().user.preferences.agentAccessUnlocked) {
    store.transact(store.getState().stateVersion, 'test-agent-unlocked', (draft) => {
      draft.user.preferences.agentAccessUnlocked = true;
    });
  }
  const trustPredicate = options.trustPredicate ?? hasTrustedUserActivation;
  const confirmationCoordinator = new ConfirmationCoordinator({
    clock: fixedClock,
    trustPredicate,
  });
  const toolBridge = new ToolBridge(store, confirmationCoordinator, {
    clock: fixedClock,
    auditJournal: createAgentAuditJournal(memoryStorage()),
  });
  const toolRegistry = new ToolRegistry({
    bridge: toolBridge,
    getModelContext: () => options.modelContext,
  });
  const embeddedAgent = new EmbeddedAgentRuntime(toolBridge);
  const services: AppServices = {
    session,
    bankStore: store,
    confirmationCoordinator,
    toolBridge,
    toolRegistry,
    embeddedAgent,
    trustPredicate,
  };
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouteTree services={services} />
    </MemoryRouter>,
  );
  return Object.assign(view, { session, store, services });
}

export function renderAuthenticated(
  path: string,
  options: Omit<RenderRouterOptions, 'signedIn'> = {},
): RenderAppResult {
  return renderRouter(path, { ...options, signedIn: true });
}
