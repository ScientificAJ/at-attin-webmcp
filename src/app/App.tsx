import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createSessionStore, type SessionStore } from '../auth/session';
import { createBankStore, type BankStore } from '../domain/store';
import { ToolBridge } from '../webmcp/bridge';
import {
  ConfirmationCoordinator,
  hasTrustedUserActivation,
} from '../webmcp/confirmation';
import { ToolRegistry } from '../webmcp/registry';
import '../styles/tokens.css';
import '../styles/global.css';
import '../styles/shell.css';
import '../styles/forms.css';
import '../styles/confirmation.css';
import { AppRouteTree, type AppServices } from './routes';

function supportsWebMcp(): boolean {
  return typeof document !== 'undefined'
    && typeof document.modelContext?.registerTool === 'function';
}

function createDeferredBankStore(session: SessionStore): BankStore {
  let activeStore: BankStore | null = null;
  const listeners = new Set<() => void>();

  const initialize = () => {
    if (!activeStore && session.isSignedIn()) {
      activeStore = createBankStore();
      activeStore.subscribe(() => {
        for (const listener of listeners) listener();
      });
    }
  };
  session.subscribe(initialize);

  const requireStore = (): BankStore => {
    initialize();
    if (!activeStore) {
      throw new Error('Banking state is unavailable before sign in');
    }
    return activeStore;
  };

  return {
    getState: () => requireStore().getState(),
    transact: (...args) => requireStore().transact(...args),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset: () => requireStore().reset(),
  };
}

export function App() {
  const [services] = useState<AppServices>(() => {
    const session = createSessionStore();
    const bankStore = createDeferredBankStore(session);
    const confirmationCoordinator = new ConfirmationCoordinator();
    const toolBridge = new ToolBridge(bankStore, confirmationCoordinator);
    const toolRegistry = new ToolRegistry({ bridge: toolBridge });
    return {
      session,
      bankStore,
      webMcpAvailable: supportsWebMcp(),
      confirmationCoordinator,
      toolBridge,
      toolRegistry,
      trustPredicate: hasTrustedUserActivation,
    };
  });

  return (
    <BrowserRouter>
      <AppRouteTree services={services} />
    </BrowserRouter>
  );
}
